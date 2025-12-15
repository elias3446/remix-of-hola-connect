-- Remove chat_assistant_enabled column from settings table
ALTER TABLE public.settings DROP COLUMN IF EXISTS chat_assistant_enabled;