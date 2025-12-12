import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssistantRequest {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  context: {
    userId: string;
    userRoles: string[];
    userPermissions: string[];
    action?: string;
    entityType?: string;
    entityId?: string;
    additionalData?: Record<string, unknown>;
  };
}

// System prompt completo para el asistente UniAlerta UCE
const SYSTEM_PROMPT = `Eres el Asistente Integral de UniAlerta UCE, una plataforma de gestión de reportes e incidentes para la Universidad Central del Ecuador.

## TU ROL Y CAPACIDADES

Eres un asistente de IA altamente especializado diseñado para:

### 1. GESTIÓN DE ENTIDADES (CRUD AVANZADO)
- **Usuarios**: Crear, leer, actualizar y eliminar (soft delete) usuarios del sistema
- **Reportes**: Gestionar reportes de incidentes con estados, prioridades y asignaciones
- **Categorías**: Administrar categorías de reportes con cascada a tipos
- **Tipos de Reporte**: Gestionar subcategorías vinculadas a categorías padre

### 2. ANÁLISIS Y DASHBOARDS
- Generar estadísticas y métricas en tiempo real
- Crear datos para gráficos (tendencias, distribuciones, comparativas)
- Proporcionar análisis ejecutivos y técnicos
- Identificar patrones y anomalías en los datos

### 3. SOPORTE OPERATIVO
- Asistencia contextual en todos los módulos
- Detección proactiva de problemas
- Sugerencias de mejora basadas en datos
- Fallbacks inteligentes ante errores

### 4. GENERACIÓN DE CONTENIDO
- Resúmenes ejecutivos
- Documentación técnica
- Explicaciones detalladas
- Guías de uso del sistema

## REGLAS DE NEGOCIO CRÍTICAS

1. **SOFT DELETE**: Todas las eliminaciones son lógicas (deleted_at), nunca físicas
2. **ROLES Y PERMISOS**: Siempre verificar permisos antes de sugerir acciones:
   - super_admin/administrador: Acceso total
   - mantenimiento: CRUD en categorías/tipos, lectura de usuarios
   - usuario_regular/estudiante_personal: Solo crear reportes
   - operador_analista/seguridad_uce: Gestión de reportes asignados

3. **CASCADAS**:
   - Al desactivar una categoría, sus tipos de reporte también se desactivan
   - Al eliminar una categoría, sus tipos quedan huérfanos pero no se eliminan

4. **ESTADOS DE REPORTE**: pendiente → en_progreso → resuelto/rechazado
5. **PRIORIDADES**: bajo, medio, alto, urgente
6. **VISIBILIDAD**: publico, privado, solo_seguridad

## FORMATO DE RESPUESTAS

Para OPERACIONES CRUD, responde en JSON estructurado:
\`\`\`json
{
  "action": "create|read|update|delete|list|analyze",
  "entity": "usuario|reporte|categoria|tipo_reporte",
  "data": { ... },
  "explanation": "Explicación para el usuario",
  "warnings": ["Advertencias si las hay"],
  "requiresConfirmation": true/false
}
\`\`\`

Para ANÁLISIS, usa formato libre con Markdown.
Para AYUDA, sé conciso y claro.

## CONTEXTO DEL USUARIO ACTUAL
El usuario con el que interactúas tiene roles y permisos específicos que recibirás en cada mensaje.
Adapta tus respuestas y sugerencias a sus capacidades dentro del sistema.

Responde siempre en español y mantén un tono profesional pero amigable.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context }: AssistantRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for data fetching
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build context message with current data
    let contextMessage = `
## CONTEXTO DEL USUARIO ACTUAL
- ID: ${context.userId}
- Roles: ${context.userRoles.join(", ")}
- Permisos: ${context.userPermissions.join(", ")}
`;

    // Fetch relevant data based on action/context
    if (context.action === "dashboard" || context.action === "analyze") {
      const [reportesResult, categoriasResult, usuariosResult] = await Promise.all([
        supabase.from("reportes").select("*", { count: "exact" }).is("deleted_at", null),
        supabase.from("categories").select("*", { count: "exact" }).is("deleted_at", null),
        supabase.from("profiles").select("*", { count: "exact" }).is("deleted_at", null),
      ]);

      contextMessage += `
## DATOS ACTUALES DEL SISTEMA
- Total Reportes: ${reportesResult.count || 0}
- Total Categorías: ${categoriasResult.count || 0}
- Total Usuarios: ${usuariosResult.count || 0}
`;

      // Add status breakdown
      if (reportesResult.data) {
        const statusCounts = reportesResult.data.reduce((acc: Record<string, number>, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {});
        contextMessage += `
## DISTRIBUCIÓN POR ESTADO
${Object.entries(statusCounts).map(([status, count]) => `- ${status}: ${count}`).join("\n")}
`;
      }
    }

    // If specific entity is being queried
    if (context.entityType && context.entityId) {
      const { data: entityData } = await supabase
        .from(context.entityType === "tipo_reporte" ? "tipo_categories" : `${context.entityType}s`)
        .select("*")
        .eq("id", context.entityId)
        .single();

      if (entityData) {
        contextMessage += `
## ENTIDAD SELECCIONADA (${context.entityType})
${JSON.stringify(entityData, null, 2)}
`;
      }
    }

    // Add additional data if provided
    if (context.additionalData) {
      contextMessage += `
## DATOS ADICIONALES
${JSON.stringify(context.additionalData, null, 2)}
`;
    }

    // Build messages array for AI
    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextMessage },
      ...messages,
    ];

    console.log("[Assistant] Processing request for user:", context.userId);
    console.log("[Assistant] Action:", context.action);
    console.log("[Assistant] Messages count:", messages.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[Assistant] AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[Assistant] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
