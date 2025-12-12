-- Trigger function to block notification creation when notifications are disabled
CREATE OR REPLACE FUNCTION public.block_notification_if_disabled()
RETURNS TRIGGER AS $$
DECLARE
  notifications_enabled BOOLEAN;
BEGIN
  -- Check if notifications are enabled for the target user
  SELECT enabled INTO notifications_enabled
  FROM public.settings
  WHERE user_id = NEW.user_id;
  
  -- If settings don't exist or notifications are explicitly disabled, block the insert
  IF notifications_enabled IS NOT NULL AND notifications_enabled = FALSE THEN
    -- Silently skip the notification (don't raise error, just don't insert)
    RETURN NULL;
  END IF;
  
  -- Allow the notification to be created
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS check_notifications_enabled ON public.notifications;

-- Create the trigger
CREATE TRIGGER check_notifications_enabled
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.block_notification_if_disabled();