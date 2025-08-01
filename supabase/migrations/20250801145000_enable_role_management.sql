-- Enable role management and realtime updates for presentation_users table

-- Enable realtime for presentation_users table so all users get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE presentation_users;

-- Create a function to update user roles (only creators can change roles)
CREATE OR REPLACE FUNCTION update_user_role(
    target_presentation_id uuid,
    target_nickname text,
    new_role text,
    requester_nickname text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requester_role text;
    target_exists boolean;
BEGIN
    -- Check if requester is the creator of the presentation
    SELECT role INTO requester_role
    FROM presentation_users
    WHERE presentation_id = target_presentation_id 
    AND nickname = requester_nickname;
    
    -- Only creators can change roles
    IF requester_role != 'creator' THEN
        RAISE EXCEPTION 'Only presentation creators can change user roles';
    END IF;
    
    -- Check if target user exists in the presentation
    SELECT EXISTS(
        SELECT 1 FROM presentation_users
        WHERE presentation_id = target_presentation_id 
        AND nickname = target_nickname
    ) INTO target_exists;
    
    IF NOT target_exists THEN
        RAISE EXCEPTION 'Target user is not a member of this presentation';
    END IF;
    
    -- Prevent changing creator role
    IF target_nickname = requester_nickname THEN
        RAISE EXCEPTION 'Creators cannot change their own role';
    END IF;
    
    -- Validate new role
    IF new_role NOT IN ('editor', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role. Must be either editor or viewer';
    END IF;
    
    -- Update the role
    UPDATE presentation_users
    SET role = new_role
    WHERE presentation_id = target_presentation_id 
    AND nickname = target_nickname;
    
    RETURN true;
END;
$$;

-- Add an index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_presentation_users_role_lookup 
ON presentation_users (presentation_id, role);

-- Add updated_at column to track role changes
ALTER TABLE presentation_users 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_presentation_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_presentation_users_updated_at
    BEFORE UPDATE ON presentation_users
    FOR EACH ROW
    EXECUTE FUNCTION update_presentation_users_updated_at();