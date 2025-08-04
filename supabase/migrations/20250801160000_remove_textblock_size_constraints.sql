-- Migration to remove size constraints from TextBlocks in content_json
-- This enables dynamic resizing by removing fixed size objects from database

-- Update all existing slides to remove 'size' property from textBlocks in content_json
UPDATE public.slides 
SET content_json = (
  SELECT jsonb_build_object(
    'textBlocks', 
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', textblock->>'id',
            'content', textblock->>'content', 
            'position', textblock->'position'
          )
        )
        FROM jsonb_array_elements(content_json->'textBlocks') AS textblock
        WHERE textblock ? 'id'
      ),
      '[]'::jsonb
    )
  )
)
WHERE content_json ? 'textBlocks' 
  AND jsonb_typeof(content_json->'textBlocks') = 'array'
  AND jsonb_array_length(content_json->'textBlocks') > 0;

-- Add a comment to document this change
COMMENT ON COLUMN public.slides.content_json IS 'Slide content in JSON format. TextBlocks should only contain: id, content, and position. Size is handled dynamically in frontend.';