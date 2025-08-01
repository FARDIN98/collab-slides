-- Migration to update slides table structure
-- This file can be used to modify only the slides table without affecting other tables

-- Add any new columns to slides table if needed
-- Example: ALTER TABLE public.slides ADD COLUMN IF NOT EXISTS new_column_name data_type;

-- Update existing slides table constraints or indexes if needed
-- Example: CREATE INDEX IF NOT EXISTS idx_slides_presentation_slide ON public.slides(presentation_id, slide_number);

-- Ensure proper ordering constraint
ALTER TABLE public.slides 
ADD CONSTRAINT unique_slide_number_per_presentation 
UNIQUE (presentation_id, slide_number);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_slides_presentation_id ON public.slides(presentation_id);
CREATE INDEX IF NOT EXISTS idx_slides_slide_number ON public.slides(slide_number);