import { supabase } from '@/integrations/supabase/client';

// Función para obtener IP real del usuario
const getClientIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
};

// Función para obtener metadata del navegador
const getBrowserMetadata = () => ({
  browser: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  timestamp: new Date().toISOString()
});

// Obtener profile_id desde auth.uid()
const getProfileId = async (authUserId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .single();
  
  if (error || !data) {
    console.warn('Profile not found for auth user:', authUserId);
    return null;
  }
  
  return data.id;
};

interface AuditLoginParams {
  authUserId: string;
  email?: string;
  sessionId?: string;
}

interface AuditLogoutParams {
  authUserId: string;
  email?: string;
}

export function useAuditLog() {
  const auditLogin = async ({ authUserId, email, sessionId }: AuditLoginParams) => {
    try {
      // Obtener el profile_id del usuario
      const profileId = await getProfileId(authUserId);
      if (!profileId) {
        console.warn('Audit login skipped: profile does not exist for user', authUserId);
        return;
      }

      const userAgent = navigator.userAgent;
      const ipAddress = await getClientIP();

      await supabase.rpc('audit_user_login', {
        p_user_id: profileId,
        p_user_agent: userAgent,
        p_ip_address: ipAddress,
        p_metadata: {
          email,
          login_method: 'email_password',
          session_id: sessionId,
          ...getBrowserMetadata()
        }
      });
    } catch (error) {
      console.error('Error registering login audit:', error);
    }
  };

  const auditLogout = async ({ authUserId, email }: AuditLogoutParams) => {
    try {
      // Obtener el profile_id del usuario
      const profileId = await getProfileId(authUserId);
      if (!profileId) {
        console.warn('Audit logout skipped: profile does not exist for user', authUserId);
        return;
      }

      const userAgent = navigator.userAgent;
      const ipAddress = await getClientIP();

      await supabase.rpc('audit_user_logout', {
        p_user_id: profileId,
        p_user_agent: userAgent,
        p_ip_address: ipAddress,
        p_metadata: {
          email,
          logout_method: 'manual',
          ...getBrowserMetadata()
        }
      });
    } catch (error) {
      console.error('Error registering logout audit:', error);
    }
  };

  return { auditLogin, auditLogout };
}
