/*
# Fix handle_new_user trigger function

Updates the trigger to match the current profiles schema
(removes stale qr_code reference).
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Thành viên mới'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
