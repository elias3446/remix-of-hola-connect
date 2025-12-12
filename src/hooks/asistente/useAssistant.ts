import { useState, useCallback, useRef, useEffect } from 'react';
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

const STORAGE_KEY = 'unialerta_assistant_messages';

// Load messages from localStorage
const loadMessagesFromStorage = (): Message[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((m: Message) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
};

// Save messages to localStorage
const saveMessagesToStorage = (messages: Message[]) => {
  try {
    const toSave = messages.filter(m => !m.isStreaming);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('[useAssistant] Error saving to localStorage:', error);
  }
};

// System prompt base para el asistente UniAlerta UCE
const getSystemPrompt = (roles: string[], permisos: string[]) => {
  const isAdmin = roles.includes('super_admin') || roles.includes('administrador');
  const isMantenimiento = roles.includes('mantenimiento');
  const isOperador = roles.includes('operador_analista') || roles.includes('seguridad_uce');
  const isRegularUser = roles.includes('usuario_regular') || roles.includes('estudiante_personal') || roles.length === 0;

  // Define accessible modules based on role
  let accessibleModules = '';
  let restrictions = '';

  if (isAdmin) {
    accessibleModules = `
### ACCESO COMPLETO (ADMINISTRADOR)
Tienes acceso total a todas las funcionalidades:
- Gestión completa de usuarios, roles y permisos
- Gestión de reportes (todos)
- Gestión de categorías y tipos de reporte
- Dashboard y estadísticas completas
- Auditoría del sistema
- Configuraciones del sistema`;
    restrictions = 'Sin restricciones de acceso.';
  } else if (isMantenimiento) {
    accessibleModules = `
### ACCESO DE MANTENIMIENTO
Tienes acceso a:
- Gestión de categorías (crear, editar, eliminar)
- Gestión de tipos de reporte (crear, editar, eliminar)
- Lectura de usuarios (solo visualización)
- Reportes: solo lectura`;
    restrictions = `
**RESTRICCIONES IMPORTANTES:**
- NO puedes crear, editar o eliminar usuarios
- NO puedes acceder a configuraciones del sistema
- NO puedes ver estadísticas de auditoría
- Si el usuario pregunta sobre estas funciones, indica amablemente que no tiene permisos.`;
  } else if (isOperador) {
    accessibleModules = `
### ACCESO DE OPERADOR/SEGURIDAD
Tienes acceso a:
- Gestión de reportes asignados al usuario
- Visualización de categorías y tipos de reporte
- Sus propias publicaciones en la red social
- Sus propios mensajes
- Su propia configuración de perfil`;
    restrictions = `
**RESTRICCIONES IMPORTANTES:**
- NO puedes gestionar usuarios
- NO puedes crear/editar/eliminar categorías o tipos
- NO puedes acceder a reportes de otros usuarios
- NO puedes ver estadísticas globales del sistema
- Si el usuario pregunta sobre estas funciones, indica amablemente que no tiene permisos.`;
  } else {
    accessibleModules = `
### ACCESO BÁSICO (USUARIO REGULAR)
Tienes acceso limitado a:
- Crear nuevos reportes
- Ver sus propios reportes
- Sus propias publicaciones en la red social
- Sus propios mensajes
- Su propia configuración de perfil`;
    restrictions = `
**RESTRICCIONES IMPORTANTES:**
- NO puedes gestionar usuarios
- NO puedes ver reportes de otros usuarios
- NO puedes crear/editar/eliminar categorías o tipos
- NO puedes acceder a estadísticas del sistema
- NO puedes acceder al dashboard administrativo
- Si el usuario pregunta sobre funciones administrativas, indica amablemente que no tiene los permisos necesarios.`;
  }

  return `Eres el Asistente Integral de UniAlerta UCE, una plataforma de gestión de reportes e incidentes para la Universidad Central del Ecuador.

## TU ROL Y CAPACIDADES
${accessibleModules}

## RESTRICCIONES DE ACCESO
${restrictions}

## PERMISOS ESPECÍFICOS DEL USUARIO
Los permisos actuales son: ${permisos.length > 0 ? permisos.join(', ') : 'Permisos básicos'}

## REGLAS DE NEGOCIO CRÍTICAS

1. **RESPETAR PERMISOS**: NUNCA proporciones información sobre entidades a las que el usuario no tiene acceso
2. **SOFT DELETE**: Todas las eliminaciones son lógicas (deleted_at), nunca físicas
3. **ESTADOS DE REPORTE**: pendiente → en_progreso → resuelto/rechazado
4. **PRIORIDADES**: bajo, medio, alto, urgente
5. **VISIBILIDAD**: publico, privado, solo_seguridad

## FORMATO DE RESPUESTAS

Para OPERACIONES CRUD (si tiene permisos), responde en JSON estructurado:
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

Para solicitudes SIN PERMISOS, responde con:
\`\`\`json
{
  "action": "denied",
  "reason": "No tienes permisos para [acción específica]",
  "suggestion": "Contacta a un administrador si necesitas acceso"
}
\`\`\`

Para ANÁLISIS (si tiene permisos), usa formato libre con Markdown.
Para AYUDA, sé conciso y claro.

Responde siempre en español y mantén un tono profesional pero amigable.

## MEMORIA DE CONVERSACIÓN
Tienes acceso al historial completo de mensajes previos. Úsalo para dar respuestas contextuales y recordar lo que el usuario ha discutido anteriormente.`;
};

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent';

export function useAssistant(): UseAssistantReturn {
  const [messages, setMessages] = useState<Message[]>(() => loadMessagesFromStorage());
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { data: userRoles } = useOptimizedUserRoles();
  const { data: reportes = [] } = useOptimizedReportes();
  const { data: categorias = [] } = useOptimizedCategories();
  const { data: tiposReporte = [] } = useOptimizedTipoReportes();
  const { data: usuarios = [] } = useOptimizedUsers();
  const { stats, statusDistribution, priorityDistribution, rolesDistribution } = useDashboardStats();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    saveMessagesToStorage(messages);
  }, [messages]);

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
      // Build conversation history for Gemini format (include ALL previous messages for memory)
      const currentMessages = [...messages, userMessage];
      const conversationHistory = currentMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      // Gemini API request body with role-based system prompt
      const systemPrompt = getSystemPrompt(
        userRoles?.roles || [],
        userRoles?.permisos || []
      );
      const requestBody = {
        systemInstruction: {
          parts: [{ text: systemPrompt + '\n\n' + buildSystemContext() }],
        },
        contents: conversationHistory,
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
    localStorage.removeItem(STORAGE_KEY);
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
