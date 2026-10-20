-- =============================================================================
-- Migration: 20261019000003_triggers_and_functions.sql
-- Description: Core triggers, invitation acceptance, and transactional functions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger: Auto-create profile when user signs up in auth.users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, default_currency)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'default_currency', 'INR')
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. Trigger: Auto-add group creator as owner in group_members
-- -----------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS on_group_created ON public.groups;
CREATE TRIGGER on_group_created
    AFTER INSERT ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_group();

-- -----------------------------------------------------------------------------
-- 3. Function: Accept Group Invitation (with placeholder claiming)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_group_invitation(invite_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inv RECORD;
    current_user_id UUID := auth.uid();
    user_profile RECORD;
    target_member_id UUID;
    existing_member RECORD;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Fetch user profile
    SELECT * INTO user_profile FROM public.profiles WHERE id = current_user_id;
    IF user_profile IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Lookup invitation
    SELECT * INTO inv FROM public.group_invitations
    WHERE token = invite_token
    FOR UPDATE;

    IF inv IS NULL THEN
        RAISE EXCEPTION 'Invalid invitation token';
    END IF;

    IF inv.expires_at < timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'Invitation token has expired';
    END IF;

    IF inv.max_uses IS NOT NULL AND inv.use_count >= inv.max_uses THEN
        RAISE EXCEPTION 'Invitation token usage limit reached';
    END IF;

    -- Check if user is already a member
    SELECT * INTO existing_member FROM public.group_members
    WHERE group_id = inv.group_id AND user_id = current_user_id;

    IF existing_member IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'groupId', inv.group_id,
            'memberId', existing_member.id,
            'message', 'Already a member'
        );
    END IF;

    -- If invitation targets a placeholder member, claim it
    IF inv.placeholder_member_id IS NOT NULL THEN
        UPDATE public.group_members
        SET user_id = current_user_id,
            display_name = user_profile.full_name,
            is_placeholder = false
        WHERE id = inv.placeholder_member_id AND group_id = inv.group_id;

        target_member_id := inv.placeholder_member_id;
    ELSE
        -- Insert new member
        INSERT INTO public.group_members (group_id, user_id, display_name, role, is_placeholder)
        VALUES (inv.group_id, current_user_id, user_profile.full_name, 'member', false)
        RETURNING id INTO target_member_id;
    END IF;

    -- Increment invitation use count
    UPDATE public.group_invitations
    SET use_count = use_count + 1
    WHERE id = inv.id;

    RETURN jsonb_build_object(
        'success', true,
        'groupId', inv.group_id,
        'memberId', target_member_id,
        'message', 'Joined successfully'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Function: Transactional Expense Creation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_expense_transactional(
    p_group_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_amount BIGINT,
    p_currency VARCHAR(3),
    p_split_type TEXT,
    p_expense_date DATE,
    p_idempotency_key UUID,
    p_payments JSONB, -- array of { "group_member_id": UUID, "amount_paid": BIGINT }
    p_splits JSONB    -- array of { "group_member_id": UUID, "split_value": NUMERIC, "owed_amount": BIGINT }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_expense_id UUID;
    v_total_paid BIGINT := 0;
    v_total_owed BIGINT := 0;
    v_item JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify caller is a group member
    IF NOT public.is_group_member(p_group_id, v_user_id) THEN
        RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    -- Check idempotency
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_expense_id FROM public.expenses WHERE idempotency_key = p_idempotency_key;
        IF v_expense_id IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'expenseId', v_expense_id, 'isDuplicate', true);
        END IF;
    END IF;

    -- Validate Payments sum
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_total_paid := v_total_paid + (v_item->>'amount_paid')::BIGINT;
    END LOOP;

    IF v_total_paid <> p_amount THEN
        RAISE EXCEPTION 'Total payments (%) do not match expense amount (%)', v_total_paid, p_amount;
    END IF;

    -- Validate Splits sum
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_splits)
    LOOP
        v_total_owed := v_total_owed + (v_item->>'owed_amount')::BIGINT;
    END LOOP;

    IF v_total_owed <> p_amount THEN
        RAISE EXCEPTION 'Total splits (%) do not match expense amount (%)', v_total_owed, p_amount;
    END IF;

    -- Insert Expense
    INSERT INTO public.expenses (
        group_id, title, description, amount, currency, split_type, expense_date, created_by, idempotency_key
    )
    VALUES (
        p_group_id, p_title, p_description, p_amount, p_currency, p_split_type, p_expense_date, v_user_id, p_idempotency_key
    )
    RETURNING id INTO v_expense_id;

    -- Insert Payments
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.expense_payments (expense_id, group_member_id, amount_paid)
        VALUES (v_expense_id, (v_item->>'group_member_id')::UUID, (v_item->>'amount_paid')::BIGINT);
    END LOOP;

    -- Insert Splits
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_splits)
    LOOP
        INSERT INTO public.expense_splits (expense_id, group_member_id, split_value, owed_amount)
        VALUES (
            v_expense_id,
            (v_item->>'group_member_id')::UUID,
            (v_item->>'split_value')::NUMERIC,
            (v_item->>'owed_amount')::BIGINT
        );
    END LOOP;

    -- Insert Audit Log
    INSERT INTO public.expense_audit_log (
        expense_id, group_id, action, actor_id, snapshot_after, change_summary
    )
    VALUES (
        v_expense_id,
        p_group_id,
        'created',
        v_user_id,
        jsonb_build_object(
            'amount', p_amount,
            'title', p_title,
            'split_type', p_split_type,
            'payments', p_payments,
            'splits', p_splits
        ),
        'Expense created'
    );

    RETURN jsonb_build_object('success', true, 'expenseId', v_expense_id, 'isDuplicate', false);
END;
$$;
