-- Add default permission columns to scholiums table
ALTER TABLE public.scholiums 
  ADD COLUMN IF NOT EXISTS default_can_add_homework BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS default_can_create_subject BOOLEAN DEFAULT TRUE;

-- Update existing scholiums to have default permissions enabled
UPDATE public.scholiums 
SET 
  default_can_add_homework = TRUE,
  default_can_create_subject = TRUE
WHERE default_can_add_homework IS NULL OR default_can_create_subject IS NULL;
