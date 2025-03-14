-- Create a function to create the profiles table
CREATE OR REPLACE FUNCTION create_profiles_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Create the profiles table
  CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    previous_login TIMESTAMP WITH TIME ZONE,
    classification TEXT DEFAULT 'Nuevo',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Add foreign key constraint
  ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

  -- Set up Row Level Security (RLS)
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

  -- Create policies
  -- Users can view their own profile
  CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

  -- Users can update their own profile
  CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

  -- Authenticated users can insert profiles
  CREATE POLICY "Authenticated users can insert profiles" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

  -- Service role can manage all profiles
  CREATE POLICY "Service role can manage all profiles" 
    ON public.profiles 
    USING (auth.role() = 'service_role');

  RETURN TRUE;
END;
$$;

