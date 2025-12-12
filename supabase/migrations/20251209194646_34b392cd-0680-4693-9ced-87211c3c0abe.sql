-- Fix the notification type cast in crear_notificacion_comentario function
CREATE OR REPLACE FUNCTION public.crear_notificacion_comentario()
RETURNS TRIGGER AS $$
DECLARE
  v_autor_id UUID;
  v_usuario_nombre TEXT;
  v_tipo_notificacion notification_type;
  v_titulo TEXT;
  v_mensaje TEXT;
BEGIN
  -- Obtener nombre del usuario que comentó
  SELECT COALESCE(name, email, username) INTO v_usuario_nombre
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Si es respuesta a un comentario
  IF NEW.comentario_padre_id IS NOT NULL THEN
    -- Obtener el autor del comentario padre
    SELECT user_id INTO v_autor_id
    FROM comentarios
    WHERE id = NEW.comentario_padre_id;
    
    v_tipo_notificacion := 'comentario'::notification_type;
    v_titulo := '💬 Nueva respuesta a tu comentario';
    v_mensaje := v_usuario_nombre || ' respondió a tu comentario: "' || LEFT(NEW.contenido, 50) || '"';
  ELSE
    -- Es comentario en una publicación
    SELECT user_id INTO v_autor_id
    FROM publicaciones
    WHERE id = NEW.publicacion_id;
    
    v_tipo_notificacion := 'comentario'::notification_type;
    v_titulo := '💬 Nuevo comentario en tu publicación';
    v_mensaje := v_usuario_nombre || ' comentó: "' || LEFT(NEW.contenido, 50) || '"';
  END IF;
  
  -- No crear notificación si el usuario comenta en su propio contenido
  IF v_autor_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Crear la notificación con tipo correcto
  INSERT INTO notifications (user_id, title, message, type, data, read)
  VALUES (
    v_autor_id,
    v_titulo,
    v_mensaje,
    v_tipo_notificacion,
    jsonb_build_object(
      'comentario_id', NEW.id,
      'publicacion_id', NEW.publicacion_id,
      'comentario_padre_id', NEW.comentario_padre_id,
      'usuario_id', NEW.user_id,
      'tipo', CASE WHEN NEW.comentario_padre_id IS NOT NULL THEN 'respuesta' ELSE 'comentario' END
    ),
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;