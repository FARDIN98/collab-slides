-- Add unique constraint to prevent duplicate users in the same presentation
-- This will prevent the same user from being added multiple times to the same presentation

-- First, remove any existing duplicates (keep the earliest entry for each user-presentation pair)
-- Using ROW_NUMBER() to identify duplicates since MIN() doesn't work with UUID
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY presentation_id, nickname 
               ORDER BY joined_at ASC
           ) as row_num
    FROM presentation_users
)
DELETE FROM presentation_users 
WHERE id IN (
    SELECT id 
    FROM duplicates 
    WHERE row_num > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE presentation_users 
ADD CONSTRAINT unique_user_per_presentation 
UNIQUE (presentation_id, nickname);

-- Add an index for better performance on lookups
CREATE INDEX IF NOT EXISTS idx_presentation_users_lookup 
ON presentation_users (presentation_id, nickname);