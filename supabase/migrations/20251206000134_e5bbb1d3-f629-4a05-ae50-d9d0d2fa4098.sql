-- Add tables to supabase_realtime publication for real-time sync
-- (categories, tipo_categories, user_roles already have REPLICA IDENTITY FULL from previous migration)
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tipo_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;