-- Define the user_role ENUM to cover all our required app roles
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'citizen',
        'volunteer',
        'admin',
        'government',
        'emergency'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- A function to automatically create a profile for new users
-- It extracts 'role' from raw_user_meta_data (passed during Supabase signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into the main profiles table
  INSERT INTO public.profiles (id, role, points, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(
        (new.raw_user_meta_data->>'role')::public.user_role, 
        'citizen'::public.user_role
    ),
    0,
    now(),
    now()
  );
  
  -- Insert into role_assignments table for granular RBAC history/tracking
  INSERT INTO public.role_assignments (user_id, role, active)
  VALUES (
    new.id, 
    -- Map emergency back to emergency_service if required by role_assignments check constraint
    CASE 
      WHEN (new.raw_user_meta_data->>'role') = 'emergency' THEN 'emergency_service'
      WHEN (new.raw_user_meta_data->>'role') = 'government' THEN 'government'
      ELSE 'resident'
    END,
    true
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to fire the function whenever a user signs up via Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
