-- =============================================================================
-- Migration: 20261020000003_fix_placeholder_unique_constraint.sql
-- Description: Allow multiple placeholder members with NULL user_id per group
-- =============================================================================

ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS uq_group_user;

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_user_not_null
ON public.group_members (group_id, user_id)
WHERE user_id IS NOT NULL;
