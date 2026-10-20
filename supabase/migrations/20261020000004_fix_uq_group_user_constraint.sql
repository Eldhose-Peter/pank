-- =============================================================================
-- Migration: 20261020000004_fix_uq_group_user_constraint.sql
-- Description: Standard UNIQUE (group_id, user_id) allowing multiple NULL placeholders
-- =============================================================================

ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS uq_group_user;
DROP INDEX IF EXISTS public.uq_group_user_not_null;

-- Standard SQL UNIQUE treats NULL as distinct, allowing multiple placeholders per group
-- while enforcing that any non-null user_id can only appear once per group.
ALTER TABLE public.group_members
ADD CONSTRAINT uq_group_user UNIQUE (group_id, user_id);

-- Ensure handle_new_group function matches constraint
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    creator_name TEXT;
BEGIN
    SELECT full_name INTO creator_name FROM public.profiles WHERE id = NEW.created_by;
    IF creator_name IS NULL THEN
        creator_name := 'Owner';
    END IF;

    INSERT INTO public.group_members (group_id, user_id, display_name, role, is_placeholder)
    VALUES (NEW.id, NEW.created_by, creator_name, 'owner', false)
    ON CONFLICT (group_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$;
