import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { recordSettlementSchema } from './validation';
import type { Settlement, RecordSettlementDTO } from './types';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  GroupError,
} from '@/modules/groups/errors';

export class SettlementService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Records a repayment between two group members.
   */
  async recordSettlement(
    userId: string,
    groupId: string,
    input: RecordSettlementDTO
  ): Promise<Settlement> {
    const parsed = recordSettlementSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid settlement input', parsed.error.format());
    }

    const data = parsed.data;

    // 1. Verify caller membership
    await this.assertGroupMember(userId, groupId);

    // 2. Verify both payer and payee belong to the group
    await this.assertMembersBelongToGroup(groupId, [
      data.payerMemberId,
      data.payeeMemberId,
    ]);

    // 3. Insert settlement
    const { data: record, error } = await this.supabase
      .from('settlements')
      .insert({
        group_id: groupId,
        payer_member_id: data.payerMemberId,
        payee_member_id: data.payeeMemberId,
        amount: data.amount,
        currency: data.currency,
        payment_method: data.paymentMethod || null,
        notes: data.notes || null,
        settled_at: data.settledAt,
        created_by: userId,
        is_deleted: false,
      })
      .select()
      .single();

    if (error || !record) {
      throw new GroupError(error?.message || 'Failed to record settlement');
    }

    return {
      id: record.id,
      groupId: record.group_id,
      payerMemberId: record.payer_member_id,
      payeeMemberId: record.payee_member_id,
      amount: record.amount,
      currency: record.currency,
      paymentMethod: record.payment_method,
      notes: record.notes,
      settledAt: record.settled_at,
      createdBy: record.created_by,
      isDeleted: record.is_deleted,
      createdAt: record.created_at,
    };
  }

  /**
   * Soft deletes a settlement record.
   */
  async deleteSettlement(
    userId: string,
    groupId: string,
    settlementId: string
  ): Promise<void> {
    await this.assertGroupMember(userId, groupId);

    const { error } = await this.supabase
      .from('settlements')
      .update({ is_deleted: true })
      .eq('id', settlementId)
      .eq('group_id', groupId);

    if (error) {
      throw new GroupError(error.message);
    }
  }

  /**
   * Lists all active settlements in a group.
   */
  async getSettlements(
    userId: string,
    groupId: string,
    includeDeleted: boolean = false
  ): Promise<Settlement[]> {
    await this.assertGroupMember(userId, groupId);

    let query = this.supabase
      .from('settlements')
      .select('*')
      .eq('group_id', groupId)
      .order('settled_at', { ascending: false });

    if (!includeDeleted) {
      query = query.eq('is_deleted', false);
    }

    const { data, error } = await query;
    if (error) {
      throw new GroupError(error.message);
    }

    return (data || []).map((record) => ({
      id: record.id,
      groupId: record.group_id,
      payerMemberId: record.payer_member_id,
      payeeMemberId: record.payee_member_id,
      amount: record.amount,
      currency: record.currency,
      paymentMethod: record.payment_method,
      notes: record.notes,
      settledAt: record.settled_at,
      createdBy: record.created_by,
      isDeleted: record.is_deleted,
      createdAt: record.created_at,
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
