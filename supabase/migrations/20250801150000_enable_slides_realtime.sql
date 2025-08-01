-- Enable realtime for slides table and add slide management functions
-- This migration enables real-time updates for slides and adds constraints

-- Enable realtime for slides table (ignore if already exists)
DO $$
BEGIN
  -- Check if table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'slides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE slides;
  END IF;
END $$;

-- Add unique constraint to prevent duplicate slide numbers within a presentation
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_slide_number_per_presentation'
  ) THEN
    ALTER TABLE slides ADD CONSTRAINT unique_slide_number_per_presentation 
      UNIQUE (presentation_id, slide_number);
  END IF;
END $$;

-- Create index for better performance on slide queries
CREATE INDEX IF NOT EXISTS idx_slides_presentation_slide_number 
  ON slides (presentation_id, slide_number);

-- Create function to reorder slides after deletion
CREATE OR REPLACE FUNCTION reorder_slides_after_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Reorder slide numbers to fill gaps after deletion
  UPDATE slides 
  SET slide_number = new_numbers.new_number
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY slide_number) as new_number
    FROM slides 
    WHERE presentation_id = OLD.presentation_id
  ) as new_numbers
  WHERE slides.id = new_numbers.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically reorder slides after deletion
DROP TRIGGER IF EXISTS trigger_reorder_slides_after_deletion ON slides;
CREATE TRIGGER trigger_reorder_slides_after_deletion
  AFTER DELETE ON slides
  FOR EACH ROW
  EXECUTE FUNCTION reorder_slides_after_deletion();

-- Add updated_at trigger for slides table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_slides_updated_at ON slides;
CREATE TRIGGER trigger_update_slides_updated_at
  BEFORE UPDATE ON slides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();