-- Create users table (public profiles that reference auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scholiums table (study groups/teams)
CREATE TABLE IF NOT EXISTS public.scholiums (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  encrypted_access_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scholium members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.scholium_members (
  id SERIAL PRIMARY KEY,
  scholium_id INTEGER REFERENCES public.scholiums(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_host BOOLEAN DEFAULT FALSE,
  can_add_homework BOOLEAN DEFAULT FALSE,
  can_create_subject BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scholium_id, user_id)
);

-- Homework table
CREATE TABLE IF NOT EXISTS public.homework (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject_id INTEGER REFERENCES public.subjects(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scholium_id INTEGER REFERENCES public.scholiums(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework completion tracking per user
CREATE TABLE IF NOT EXISTS public.homework_completion (
  id SERIAL PRIMARY KEY,
  homework_id INTEGER REFERENCES public.homework(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(homework_id, user_id)
);

-- File attachments for homework
CREATE TABLE IF NOT EXISTS public.attachments (
  id SERIAL PRIMARY KEY,
  homework_id INTEGER REFERENCES public.homework(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_homework_due_date ON public.homework(due_date);
CREATE INDEX IF NOT EXISTS idx_homework_subject ON public.homework(subject_id);
CREATE INDEX IF NOT EXISTS idx_homework_scholium ON public.homework(scholium_id);
CREATE INDEX IF NOT EXISTS idx_scholium_members_user ON public.scholium_members(user_id);
CREATE INDEX IF NOT EXISTS idx_scholium_members_scholium ON public.scholium_members(scholium_id);
CREATE INDEX IF NOT EXISTS idx_homework_completion_user ON public.homework_completion(user_id);
CREATE INDEX IF NOT EXISTS idx_homework_completion_homework ON public.homework_completion(homework_id);
