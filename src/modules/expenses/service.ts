import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import {
  createExpenseSchema,
  updateExpenseSchema,
} from './validation';
import type {
  CreateExpenseDTO,
  UpdateExpenseDTO,
  Expense,
  ExpenseAuditLog,
  ExpenseFilterOptions,
} from './types';
import {
  calculateSplits,
  validatePayments,
} from '@/modules/accounting/calculations';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  GroupError,
} from '@/modules/groups/errors';

function extractReceiptUrl(
  receiptUrlColumn: string | null | undefined,
  description: string | null | undefined
): string | null {
  if (receiptUrlColumn) return receiptUrlColumn;
  if (!description) return null;
  const match = description.match(/\[Receipt Attachment\]\((https?:\/\/[^\s)]+)\)/);
  return match ? match[1] : null;
}

export class ExpenseService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Creates an expense, payments, splits, and audit record transactionally.
   * Handles multi-payer allocations and idempotency keys.
   */
  async createExpense(
    userId: string,
    groupId: string,
    input: CreateExpenseDTO
  ): Promise<{ success: boolean; expenseId: string; isDuplicate: boolean }> {
    const parsed = createExpenseSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid expense input', parsed.error.format());
    }

    const data = parsed.data;

    // 1. Verify caller membership in group
    await this.assertGroupMember(userId, groupId);

    // 2. Normalize and validate payers
    const payments = data.payers && data.payers.length > 0
      ? data.payers
      : [{ groupMemberId: data.paidByMemberId!, amountPaid: data.amount }];

    // Validate payment sum matches total amount
    validatePayments(
      payments.map((p) => ({ memberId: p.groupMemberId, amountPaid: p.amountPaid })),
      data.amount
    );

    // 3. Validate member existence in group for all payers and participants
    const memberIdsToCheck = Array.from(
      new Set([
        ...payments.map((p) => p.groupMemberId),
        ...data.participants.map((p) => p.groupMemberId),
      ])
    );
    await this.assertMembersBelongToGroup(groupId, memberIdsToCheck);

    // 4. Calculate authoritative splits with deterministic remainder distribution
    const calculatedSplits = calculateSplits(
      data.splitType,
      data.amount,
      data.participants.map((p) => ({
        memberId: p.groupMemberId,
        splitValue: p.splitValue,
      }))
    );

    const formattedSplits = calculatedSplits.map((s) => ({
      group_member_id: s.memberId,
      split_value: s.splitValue,
      owed_amount: s.owedAmount,
    }));

    const formattedPayments = payments.map((p) => ({
      group_member_id: p.groupMemberId,
      amount_paid: p.amountPaid,
    }));

    // 5. Execute transactional RPC
    const { data: rpcResult, error } = await this.supabase.rpc('create_expense_transactional', {
      p_group_id: groupId,
      p_title: data.title,
      p_description: data.description || '',
      p_amount: data.amount,
      p_currency: data.currency,
      p_split_type: data.splitType,
      p_expense_date: data.expenseDate,
      p_idempotency_key: data.idempotencyKey || null,
      p_payments: formattedPayments,
      p_splits: formattedSplits,
    });

    if (error) {
      throw new GroupError(error.message, 'CREATE_EXPENSE_FAILED');
    }

    const res = rpcResult as { success: boolean; expenseId: string; isDuplicate: boolean };

    // Update receipt_url if provided
    if (data.receiptUrl && res.expenseId) {
      try {
        const { error: updateErr } = await this.supabase
          .from('expenses')
          .update({ receipt_url: data.receiptUrl })
          .eq('id', res.expenseId);

        if (updateErr) {
          // Schema fallback if receipt_url column does not exist on remote db yet
          const receiptNote = `[Receipt Attachment](${data.receiptUrl})`;
          const appendedDesc = data.description
            ? `${data.description}\n\n${receiptNote}`
            : receiptNote;
          await this.supabase
            .from('expenses')
            .update({ description: appendedDesc })
            .eq('id', res.expenseId);
        }
      } catch (err) {
        console.warn('Error saving receipt_url on expenses:', err);
      }
    }

    return {
      success: res.success,
      expenseId: res.expenseId,
      isDuplicate: Boolean(res.isDuplicate),
    };
  }

  /**
   * Updates an existing expense transactionally, recording a full audit snapshot.
   */
  async updateExpense(
    userId: string,
    groupId: string,
    expenseId: string,
    input: UpdateExpenseDTO
  ): Promise<{ success: boolean; expenseId: string }> {
    const parsed = updateExpenseSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid expense input', parsed.error.format());
    }

    const data = parsed.data;

    // 1. Verify caller membership in group
    await this.assertGroupMember(userId, groupId);

    // 2. Normalize and validate payers
    const payments = data.payers && data.payers.length > 0
      ? data.payers
      : [{ groupMemberId: data.paidByMemberId!, amountPaid: data.amount }];

    validatePayments(
      payments.map((p) => ({ memberId: p.groupMemberId, amountPaid: p.amountPaid })),
      data.amount
    );

    // 3. Validate member existence in group
    const memberIdsToCheck = Array.from(
      new Set([
        ...payments.map((p) => p.groupMemberId),
        ...data.participants.map((p) => p.groupMemberId),
      ])
    );
    await this.assertMembersBelongToGroup(groupId, memberIdsToCheck);

    // 4. Calculate authoritative splits
    const calculatedSplits = calculateSplits(
      data.splitType,
      data.amount,
      data.participants.map((p) => ({
        memberId: p.groupMemberId,
        splitValue: p.splitValue,
      }))
    );

    const formattedSplits = calculatedSplits.map((s) => ({
      group_member_id: s.memberId,
      split_value: s.splitValue,
      owed_amount: s.owedAmount,
    }));

    const formattedPayments = payments.map((p) => ({
      group_member_id: p.groupMemberId,
      amount_paid: p.amountPaid,
    }));

    // 5. Execute transactional RPC
    const { data: rpcResult, error } = await this.supabase.rpc('update_expense_transactional', {
      p_expense_id: expenseId,
      p_group_id: groupId,
      p_title: data.title,
      p_description: data.description || '',
      p_amount: data.amount,
      p_currency: data.currency,
      p_split_type: data.splitType,
      p_expense_date: data.expenseDate,
      p_payments: formattedPayments,
      p_splits: formattedSplits,
    });

    if (error) {
      throw new GroupError(error.message, 'UPDATE_EXPENSE_FAILED');
    }

    const res = rpcResult as { success: boolean; expenseId: string };

    if (data.receiptUrl !== undefined && res.expenseId) {
      try {
        const { error: updateErr } = await this.supabase
          .from('expenses')
          .update({ receipt_url: data.receiptUrl })
          .eq('id', res.expenseId);

        if (updateErr && data.receiptUrl) {
          const receiptNote = `[Receipt Attachment](${data.receiptUrl})`;
          const baseDesc = data.description ?? '';
          const cleanDesc = baseDesc.replace(/\n\n\[Receipt Attachment\]\([^)]+\)/g, '').trim();
          const appendedDesc = cleanDesc ? `${cleanDesc}\n\n${receiptNote}` : receiptNote;
          await this.supabase
            .from('expenses')
            .update({ description: appendedDesc })
            .eq('id', res.expenseId);
        }
      } catch (err) {
        console.warn('Error updating receipt_url on expenses:', err);
      }
    }

    return {
      success: res.success,
      expenseId: res.expenseId,
    };
  }

  /**
   * Soft deletes an expense with audit log tracking.
   */
  async deleteExpense(
    userId: string,
    groupId: string,
    expenseId: string
  ): Promise<{ success: boolean; expenseId: string }> {
    await this.assertGroupMember(userId, groupId);

    const { data: rpcResult, error } = await this.supabase.rpc('delete_expense_transactional', {
      p_expense_id: expenseId,
      p_group_id: groupId,
    });

    if (error) {
      throw new GroupError(error.message, 'DELETE_EXPENSE_FAILED');
    }

    const res = rpcResult as { success: boolean; expenseId: string };
    return {
      success: res.success,
      expenseId: res.expenseId,
    };
  }

  /**
   * Fetches an individual expense with payments and splits.
   */
  async getExpense(
    userId: string,
    groupId: string,
    expenseId: string
  ): Promise<Expense> {
    await this.assertGroupMember(userId, groupId);

    const { data: expense, error } = await this.supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('group_id', groupId)
      .single();

    if (error || !expense) {
      throw new NotFoundError('Expense not found');
    }

    const { data: payments } = await this.supabase
      .from('expense_payments')
      .select('*')
      .eq('expense_id', expenseId);

    const { data: splits } = await this.supabase
      .from('expense_splits')
      .select('*')
      .eq('expense_id', expenseId);

    return {
      id: expense.id,
      groupId: expense.group_id,
      title: expense.title,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      splitType: expense.split_type,
      expenseDate: expense.expense_date,
      createdBy: expense.created_by,
      idempotencyKey: expense.idempotency_key,
      receiptUrl: extractReceiptUrl(expense.receipt_url, expense.description),
      isDeleted: expense.is_deleted,
      payments: (payments || []).map((p) => ({
        id: p.id,
        expenseId: p.expense_id,
        groupMemberId: p.group_member_id,
        amountPaid: p.amount_paid,
      })),
      splits: (splits || []).map((s) => ({
        id: s.id,
        expenseId: s.expense_id,
        groupMemberId: s.group_member_id,
        splitValue: Number(s.split_value),
        owedAmount: s.owed_amount,
      })),
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
    };
  }

  /**
   * Fetches list of expenses for a group with payments and splits.
   */
  async getExpenses(
    userId: string,
    groupId: string,
    options: ExpenseFilterOptions = {}
  ): Promise<Expense[]> {
    await this.assertGroupMember(userId, groupId);

    let query = this.supabase
      .from('expenses')
      .select('*')
      .eq('group_id', groupId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!options.includeDeleted) {
      query = query.eq('is_deleted', false);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data: expenses, error } = await query;
    if (error) {
      throw new GroupError(error.message);
    }

    if (!expenses || expenses.length === 0) {
      return [];
    }

    const expenseIds = expenses.map((e) => e.id);

    // Fetch payments and splits for all expenses
    const { data: payments } = await this.supabase
      .from('expense_payments')
      .select('*')
      .in('expense_id', expenseIds);

    const { data: splits } = await this.supabase
      .from('expense_splits')
      .select('*')
      .in('expense_id', expenseIds);

    const paymentsByExpense: Record<string, typeof payments> = {};
    for (const p of payments || []) {
      if (!paymentsByExpense[p.expense_id]) paymentsByExpense[p.expense_id] = [];
      paymentsByExpense[p.expense_id]!.push(p);
    }

    const splitsByExpense: Record<string, typeof splits> = {};
    for (const s of splits || []) {
      if (!splitsByExpense[s.expense_id]) splitsByExpense[s.expense_id] = [];
      splitsByExpense[s.expense_id]!.push(s);
    }

    return expenses.map((e) => ({
      id: e.id,
      groupId: e.group_id,
      title: e.title,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      splitType: e.split_type,
      expenseDate: e.expense_date,
      createdBy: e.created_by,
      idempotencyKey: e.idempotency_key,
      receiptUrl: extractReceiptUrl(e.receipt_url, e.description),
      isDeleted: e.is_deleted,
      payments: (paymentsByExpense[e.id] || []).map((p) => ({
        id: p.id,
        expenseId: p.expense_id,
        groupMemberId: p.group_member_id,
        amountPaid: p.amount_paid,
      })),
      splits: (splitsByExpense[e.id] || []).map((s) => ({
        id: s.id,
        expenseId: s.expense_id,
        groupMemberId: s.group_member_id,
        splitValue: Number(s.split_value),
        owedAmount: s.owed_amount,
      })),
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    }));
  }

  /**
   * Retrieves full audit history for an expense.
   */
  async getExpenseAuditHistory(
    userId: string,
    groupId: string,
    expenseId: string
  ): Promise<ExpenseAuditLog[]> {
    await this.assertGroupMember(userId, groupId);

    const { data, error } = await this.supabase
      .from('expense_audit_log')
      .select('*')
      .eq('expense_id', expenseId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new GroupError(error.message);
    }

    return (data || []).map((row) => ({
      id: row.id,
      expenseId: row.expense_id,
      groupId: row.group_id,
      action: row.action,
      actorId: row.actor_id,
      snapshotBefore: row.snapshot_before,
      snapshotAfter: row.snapshot_after,
      changeSummary: row.change_summary,
      createdAt: row.created_at,
    }));
  }

  private async assertGroupMember(userId: string, groupId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      throw new ForbiddenError('You are not a member of this group');
    }
  }

  private async assertMembersBelongToGroup(
    groupId: string,
    memberIds: string[]
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .in('id', memberIds);

    if (error) {
      throw new GroupError('Failed to verify group members');
    }

    const foundIds = new Set((data || []).map((m) => m.id));
    for (const id of memberIds) {
      if (!foundIds.has(id)) {
        throw new ValidationError(`Member ${id} does not belong to group ${groupId}`);
      }
    }
  }
}
