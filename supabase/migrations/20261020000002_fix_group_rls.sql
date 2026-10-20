-- =============================================================================
-- Migration: 20261020000002_fix_group_rls.sql
-- Description: Allow group creators to select their groups during bootstrapping
-- =============================================================================

DROP POLICY IF EXISTS "groups_select_members" ON public.groups;

CREATE POLICY "groups_select_members"
ON public.groups FOR SELECT
USING (
    created_by = auth.uid() OR
    public.is_group_member(id)
);
