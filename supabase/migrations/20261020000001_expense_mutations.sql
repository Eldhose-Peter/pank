-- =============================================================================
-- Migration: 20261020000001_expense_mutations.sql
-- Description: Transactional functions for updating and deleting expenses with audit logs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Function: Update Expense Transactional (with audit snapshot)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_expense_transactional(
    p_expense_id UUID,
    p_group_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_amount BIGINT,
    p_currency VARCHAR(3),
    p_split_type TEXT,
    p_expense_date DATE,
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
    v_total_paid BIGINT := 0;
    v_total_owed BIGINT := 0;
    v_item JSONB;
    v_old_expense RECORD;
    v_old_payments JSONB;
    v_old_splits JSONB;
    v_snapshot_before JSONB;
    v_snapshot_after JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify caller is a group member
    IF NOT public.is_group_member(p_group_id, v_user_id) THEN
        RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    -- Fetch existing expense
    SELECT * INTO v_old_expense FROM public.expenses
    WHERE id = p_expense_id AND group_id = p_group_id AND is_deleted = false
    FOR UPDATE;

    IF v_old_expense IS NULL THEN
        RAISE EXCEPTION 'Expense not found or already deleted';
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

    -- Capture snapshot before
    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'group_member_id', group_member_id,
        'amount_paid', amount_paid
    )), '[]'::jsonb) INTO v_old_payments
    FROM public.expense_payments WHERE expense_id = p_expense_id;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'group_member_id', group_member_id,
        'split_value', split_value,
        'owed_amount', owed_amount
    )), '[]'::jsonb) INTO v_old_splits
    FROM public.expense_splits WHERE expense_id = p_expense_id;

    v_snapshot_before := jsonb_build_object(
        'title', v_old_expense.title,
        'description', v_old_expense.description,
        'amount', v_old_expense.amount,
        'currency', v_old_expense.currency,
        'split_type', v_old_expense.split_type,
        'expense_date', v_old_expense.expense_date,
        'payments', v_old_payments,
        'splits', v_old_splits
    );

    -- Update Expense header
    UPDATE public.expenses
    SET title = p_title,
        description = p_description,
        amount = p_amount,
        currency = p_currency,
        split_type = p_split_type,
        expense_date = p_expense_date,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_expense_id;

    -- Delete old payments and splits
    DELETE FROM public.expense_payments WHERE expense_id = p_expense_id;
    DELETE FROM public.expense_splits WHERE expense_id = p_expense_id;

    -- Insert new Payments
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.expense_payments (expense_id, group_member_id, amount_paid)
        VALUES (p_expense_id, (v_item->>'group_member_id')::UUID, (v_item->>'amount_paid')::BIGINT);
    END LOOP;

    -- Insert new Splits
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_splits)
    LOOP
        INSERT INTO public.expense_splits (expense_id, group_member_id, split_value, owed_amount)
        VALUES (
            p_expense_id,
            (v_item->>'group_member_id')::UUID,
            (v_item->>'split_value')::NUMERIC,
            (v_item->>'owed_amount')::BIGINT
        );
    END LOOP;

    -- Snapshot after
    v_snapshot_after := jsonb_build_object(
        'title', p_title,
        'description', p_description,
        'amount', p_amount,
        'currency', p_currency,
        'split_type', p_split_type,
        'expense_date', p_expense_date,
        'payments', p_payments,
        'splits', p_splits
    );

    -- Insert Audit Log
    INSERT INTO public.expense_audit_log (
        expense_id, group_id, action, actor_id, snapshot_before, snapshot_after, change_summary
    )
    VALUES (
        p_expense_id,
        p_group_id,
        'updated',
        v_user_id,
        v_snapshot_before,
        v_snapshot_after,
        'Expense updated'
    );

    RETURN jsonb_build_object('success', true, 'expenseId', p_expense_id);
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. Function: Delete Expense Transactional (soft delete with audit log)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_expense_transactional(
    p_expense_id UUID,
    p_group_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_old_expense RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify caller is a group member
    IF NOT public.is_group_member(p_group_id, v_user_id) THEN
        RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    -- Fetch existing expense
    SELECT * INTO v_old_expense FROM public.expenses
    WHERE id = p_expense_id AND group_id = p_group_id AND is_deleted = false
    FOR UPDATE;

    IF v_old_expense IS NULL THEN
        RAISE EXCEPTION 'Expense not found or already deleted';
    END IF;

    -- Soft delete
    UPDATE public.expenses
    SET is_deleted = true,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_expense_id;

    -- Insert Audit Log
    INSERT INTO public.expense_audit_log (
        expense_id, group_id, action, actor_id, snapshot_before, change_summary
    )
    VALUES (
        p_expense_id,
        p_group_id,
        'deleted',
        v_user_id,
        jsonb_build_object(
            'title', v_old_expense.title,
            'amount', v_old_expense.amount,
            'currency', v_old_expense.currency,
            'split_type', v_old_expense.split_type
        ),
        'Expense deleted'
    );

    RETURN jsonb_build_object('success', true, 'expenseId', p_expense_id);
END;
$$;
