import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedUserRoles } from '@/hooks/entidades/useOptimizedUserRoles';
import { useOptimizedReportes } from '@/hooks/entidades/useOptimizedReportes';
import { useOptimizedCategories } from '@/hooks/entidades/useOptimizedCategories';
import { useOptimizedTipoReportes } from '@/hooks/entidades/useOptimizedTipoReportes';
import { useOptimizedUsers } from '@/hooks/entidades/useOptimizedUsers';
import { useDashboardStats } from '@/hooks/controlador/useDashboardStats';
import { toast } from 'sonner';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AssistantContext {
  action?: string;
  entityType?: string;
  entityId?: string;
  additionalData?: Record<string, unknown>;
}

interface UseAssistantReturn {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string, context?: AssistantContext) => Promise<void>;
  clearMessages: () => void;
  stopGeneration: () => void;
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

Responde siempre en español y mantén un tono profesional pero amigable.`;

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent';

export function useAssistant(): UseAssistantReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { data: userRoles } = useOptimizedUserRoles();
  const { data: reportes = [] } = useOptimizedReportes();
  const { data: categorias = [] } = useOptimizedCategories();
  const { data: tiposReporte = [] } = useOptimizedTipoReportes();
  const { data: usuarios = [] } = useOptimizedUsers();
  const { stats, statusDistribution, priorityDistribution, rolesDistribution } = useDashboardStats();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build system context with current data
  const buildSystemContext = useCallback(() => {
    const reportesActivos = reportes.filter(r => r.activo && !r.deleted_at);
    
    return `
## CONTEXTO DEL USUARIO ACTUAL
- ID: ${user?.id || 'N/A'}
- Roles: ${userRoles?.roles?.join(', ') || 'Sin roles'}
- Permisos: ${userRoles?.permisos?.join(', ') || 'Sin permisos'}

## DATOS ACTUALES DEL SISTEMA
- Total Reportes: ${reportesActivos.length}
- Total Categorías: ${categorias.filter(c => !c.deleted_at).length}
- Total Tipos de Reporte: ${tiposReporte.filter(t => !t.deleted_at).length}
- Total Usuarios: ${usuarios.filter(u => !u.deleted_at).length}

## DISTRIBUCIÓN POR ESTADO DE REPORTES
${statusDistribution?.map(s => `- ${s.name}: ${s.value}`).join('\n') || 'Sin datos'}

## DISTRIBUCIÓN POR PRIORIDAD
${priorityDistribution?.map(p => `- ${p.name}: ${p.value}`).join('\n') || 'Sin datos'}

## DISTRIBUCIÓN POR ROL DE USUARIOS
${rolesDistribution?.map(r => `- ${r.name}: ${r.value}`).join('\n') || 'Sin datos'}

## ESTADÍSTICAS DEL DASHBOARD
${stats ? `
- Reportes pendientes: ${stats.reportesPendientes}
- Reportes en proceso: ${stats.reportesEnProceso}
- Reportes resueltos: ${stats.reportesResueltos}
- Usuarios activos: ${stats.usuariosActivos}
- Publicaciones: ${stats.publicaciones}
- Conversaciones: ${stats.conversaciones}
` : 'Cargando estadísticas...'}
`;
  }, [user, userRoles, reportes, categorias, tiposReporte, usuarios, stats, statusDistribution, priorityDistribution, rolesDistribution]);

  const sendMessage = useCallback(async (content: string, context?: AssistantContext) => {
    if (!user) {
      toast.error('Debes iniciar sesión para usar el asistente');
      return;
    }

    if (!GEMINI_API_KEY) {
      toast.error('API key de Gemini no configurada');
      return;
    }

    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create assistant message placeholder
    const assistantMessageId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    // Setup abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Build conversation history for Gemini format
      const conversationHistory = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      // Gemini API request body
      const requestBody = {
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT + '\n\n' + buildSystemContext() }],
        },
        contents: [
          ...conversationHistory,
          {
            role: 'user',
            parts: [{ text: content }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.95,
          topK: 40,
        },
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}&alt=sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Gemini API Error]', errorData);
        if (response.status === 429) {
          toast.error('Límite de solicitudes excedido. Intenta más tarde.');
        } else if (response.status === 403) {
          toast.error('API key inválida o sin permisos.');
        } else {
          toast.error(errorData.error?.message || 'Error al comunicarse con Gemini');
        }
        setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
        return;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.trim() === '' || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            // Gemini streaming response format
            const textPart = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textPart) {
              fullContent += textPart;
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: fullContent }
                  : m
              ));
            }
          } catch {
            // Incomplete JSON, continue
          }
        }
      }

      // Mark as complete
      setMessages(prev => prev.map(m => 
        m.id === assistantMessageId 
          ? { ...m, isStreaming: false }
          : m
      ));
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { ...m, isStreaming: false, content: m.content + '\n\n*[Generación detenida]*' }
            : m
        ));
      } else {
        console.error('[useAssistant] Error:', error);
        toast.error('Error al procesar la respuesta del asistente');
        setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [user, messages, buildSystemContext]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    stopGeneration,
  };
}
