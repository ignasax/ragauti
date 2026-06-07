-- Fix handle_new_user security definer function.
-- Supabase now requires SET search_path on SECURITY DEFINER functions;
-- without it the function can fail when a new user signs up via OAuth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id) ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$;
