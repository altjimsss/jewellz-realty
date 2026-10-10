-- Fix Supabase Auth invites failing with "Database error saving user".
-- The auth.users insert trigger writes NEW.email into public.profiles.email,
-- so older databases need this column before invites/admin-created users work.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  next_full_name TEXT;
  next_role TEXT;
  role_is_enum BOOLEAN;
BEGIN
  next_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  next_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');

  IF next_role NOT IN ('admin', 'agent', 'developer_partner') THEN
    next_role := 'agent';
  END IF;

  SELECT c.udt_name = 'user_role'
    INTO role_is_enum
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'profiles'
    AND c.column_name = 'role';

  IF role_is_enum THEN
    EXECUTE '
      INSERT INTO public.profiles (id, email, full_name, role, is_active)
      VALUES ($1, $2, $3, $4::public.user_role, TRUE)
      ON CONFLICT (id) DO UPDATE
        SET
          email     = COALESCE(EXCLUDED.email, profiles.email),
          full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
          role      = COALESCE(profiles.role, EXCLUDED.role)'
    USING NEW.id, NEW.email, next_full_name, next_role;
  ELSE
    EXECUTE '
      INSERT INTO public.profiles (id, email, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (id) DO UPDATE
        SET
          email     = COALESCE(EXCLUDED.email, profiles.email),
          full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
          role      = COALESCE(profiles.role, EXCLUDED.role)'
    USING NEW.id, NEW.email, next_full_name, next_role;
  END IF;

  RETURN NEW;
END;
$$;
