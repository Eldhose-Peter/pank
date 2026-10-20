-- =============================================================================
-- Migration: 20261019000002_rls_policies.sql
-- Description: Row Level Security (RLS) policies and security-definer helper functions
-- =============================================================================

-- Enable RLS on all 12 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_drafts ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Helper Functions (SECURITY DEFINER to avoid RLS recursion)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = check_group_id AND user_id = check_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = check_group_id 
          AND user_id = check_user_id 
          AND role IN ('owner', 'admin')
    );
$$;

-- -----------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- -----------------------------------------------------------------------------
-- Users can view their own profile and profiles of peers in common groups
CREATE POLICY "profiles_select_own_or_group_peers"
ON public.profiles FOR SELECT
USING (
    id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.group_members gm1
        JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid() AND gm2.user_id = public.profiles.id
    )
);

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2. GROUPS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "groups_select_members"
ON public.groups FOR SELECT
USING (public.is_group_member(id));

CREATE POLICY "groups_insert_authenticated"
ON public.groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_update_admins"
ON public.groups FOR UPDATE
USING (public.is_group_admin(id))
WITH CHECK (public.is_group_admin(id));

CREATE POLICY "groups_delete_owner"
ON public.groups FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = public.groups.id AND user_id = auth.uid() AND role = 'owner'
    )
);

-- -----------------------------------------------------------------------------
-- 3. GROUP MEMBERS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "group_members_select"
ON public.group_members FOR SELECT
USING (public.is_group_member(group_id));

CREATE POLICY "group_members_insert_admin"
ON public.group_members FOR INSERT
WITH CHECK (
    -- Group admin or owner can add members
    public.is_group_admin(group_id)
    -- Or user adding themselves when creating a group (creator bootstrapping)
    OR (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = public.group_members.group_id))
);

CREATE POLICY "group_members_update_admin"
ON public.group_members FOR UPDATE
USING (public.is_group_admin(group_id) OR (user_id = auth.uid()))
WITH CHECK (public.is_group_admin(group_id) OR (user_id = auth.uid()));

CREATE POLICY "group_members_delete_admin"
ON public.group_members FOR DELETE
USING (public.is_group_admin(group_id));

-- -----------------------------------------------------------------------------
-- 4. GROUP INVITATIONS POLICIES
-- -----------------------------------------------------------------------------
-- Members can view invitations for their group; anyone can look up by token to join
CREATE POLICY "invitations_select"
ON public.group_invitations FOR SELECT
USING (
    public.is_group_member(group_id) OR
    auth.role() = 'authenticated'
);

CREATE POLICY "invitations_insert_member"
ON public.group_invitations FOR INSERT
WITH CHECK (public.is_group_member(group_id) AND invited_by = auth.uid());

CREATE POLICY "invitations_delete_admin"
ON public.group_invitations FOR DELETE
USING (public.is_group_admin(group_id) OR invited_by = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. EXPENSES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "expenses_select"
ON public.expenses FOR SELECT
USING (public.is_group_member(group_id));

CREATE POLICY "expenses_insert"
ON public.expenses FOR INSERT
WITH CHECK (public.is_group_member(group_id) AND created_by = auth.uid());

CREATE POLICY "expenses_update"
ON public.expenses FOR UPDATE
USING (public.is_group_member(group_id))
WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "expenses_delete"
ON public.expenses FOR DELETE
USING (public.is_group_member(group_id));

-- -----------------------------------------------------------------------------
-- 6. EXPENSE PAYMENTS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "expense_payments_select"
ON public.expense_payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
);

CREATE POLICY "expense_payments_insert"
ON public.expense_payments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
);

CREATE POLICY "expense_payments_update"
ON public.expense_payments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
);

CREATE POLICY "expense_payments_delete"
ON public.expense_payments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
);

-- -----------------------------------------------------------------------------
-- 7. EXPENSE SPLITS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "expense_splits_select"
ON public.expense_splits FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
);

CREATE POLICY "expense_splits_insert"
ON public.expense_splits FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
);

CREATE POLICY "expense_splits_update"
ON public.expense_splits FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
);

CREATE POLICY "expense_splits_delete"
ON public.expense_splits FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_id AND public.is_group_member(e.group_id)
    )
);

-- -----------------------------------------------------------------------------
-- 8. SETTLEMENTS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "settlements_select"
ON public.settlements FOR SELECT
USING (public.is_group_member(group_id));

CREATE POLICY "settlements_insert"
ON public.settlements FOR INSERT
WITH CHECK (public.is_group_member(group_id) AND created_by = auth.uid());

CREATE POLICY "settlements_update"
ON public.settlements FOR UPDATE
USING (public.is_group_member(group_id))
WITH CHECK (public.is_group_member(group_id));

CREATE POLICY "settlements_delete"
ON public.settlements FOR DELETE
USING (public.is_group_member(group_id));

-- -----------------------------------------------------------------------------
-- 9. EXPENSE AUDIT LOG POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "audit_log_select"
ON public.expense_audit_log FOR SELECT
USING (public.is_group_member(group_id));

CREATE POLICY "audit_log_insert"
ON public.expense_audit_log FOR INSERT
WITH CHECK (public.is_group_member(group_id) AND actor_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 10. CONVERSATION SESSIONS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "conv_sessions_user"
ON public.conversation_sessions FOR ALL
USING (user_id = auth.uid() AND public.is_group_member(group_id))
WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id));

-- -----------------------------------------------------------------------------
-- 11. CONVERSATION MESSAGES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "conv_messages_user"
ON public.conversation_messages FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_sessions s
        WHERE s.id = session_id AND s.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversation_sessions s
        WHERE s.id = session_id AND s.user_id = auth.uid()
    )
);

-- -----------------------------------------------------------------------------
-- 12. EXPENSE DRAFTS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "expense_drafts_user"
ON public.expense_drafts FOR ALL
USING (created_by = auth.uid() AND public.is_group_member(group_id))
WITH CHECK (created_by = auth.uid() AND public.is_group_member(group_id));
