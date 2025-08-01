-- Migration to add default slides to existing presentations
-- This will add a default slide to any presentation that doesn't have slides

-- Function to create a default slide for a presentation
CREATE OR REPLACE FUNCTION create_default_slide_for_presentation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a default slide for the new presentation
  INSERT INTO public.slides (presentation_id, slide_number, content_json)
  VALUES (NEW.id, 1, '{"title": "Welcome to your presentation", "content": "Click to edit this slide"}');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add default slide when presentation is created
CREATE TRIGGER create_default_slide_trigger
  AFTER INSERT ON public.presentations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_slide_for_presentation();

-- Add default slides to existing presentations that don't have any slides
INSERT INTO public.slides (presentation_id, slide_number, content_json)
SELECT 
  p.id,
  1,
  '{"title": "Welcome to your presentation", "content": "Click to edit this slide"}'
FROM public.presentations p
LEFT JOIN public.slides s ON p.id = s.presentation_id
WHERE s.id IS NULL;