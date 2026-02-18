-- Create a trigger to automatically create a user profile when a new user signs up
-- This ensures every auth.users entry has a corresponding public.users entry

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_exists boolean;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = new.id) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Insert with explicit column values
    INSERT INTO public.users (id, email, name, role, created_at, updated_at)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'name', 'User'),
      COALESCE(new.raw_user_meta_data->>'role', 'student'),
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Created user profile for: %', new.email;
  ELSE
    RAISE LOG 'User profile already exists for: %', new.email;
  END IF;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile for %: %', new.email, SQLERRM;
    RETURN new;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
