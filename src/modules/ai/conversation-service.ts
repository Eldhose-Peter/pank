import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { GeminiAIClient } from './gemini-client';
import { BalanceService } from '@/modules/accounting/service';
import type { ConversationSession, ConversationMessage } from './types';
import { ForbiddenError, NotFoundError, GroupError } from '@/modules/groups/errors';

export class ConversationService {
  private gemini: GeminiAIClient;

  constructor(private supabase: SupabaseClient<Database>) {
    this.gemini = new GeminiAIClient();
  }

  /**
   * Starts a new conversation session for natural language expense entry or queries.
   */
  async createSession(userId: string, groupId: string): Promise<ConversationSession> {
    await this.assertGroupMember(userId, groupId);

    const { data, error } = await this.supabase
      .from('conversation_sessions')
      .insert({
        group_id: groupId,
        user_id: userId,
        status: 'active',
      })
      .select()
      .single();

    if (error || !data) {
      throw new GroupError(error?.message || 'Failed to create conversation session');
    }

    return {
      id: data.id,
      groupId: data.group_id,
      userId: data.user_id,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Retrieves messages for a conversation session.
   */
  async getSessionMessages(userId: string, sessionId: string): Promise<ConversationMessage[]> {
    const { data: session } = await this.supabase
      .from('conversation_sessions')
      .select('group_id, user_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    await this.assertGroupMember(userId, session.group_id);

    const { data, error } = await this.supabase
      .from('conversation_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new GroupError(error.message);
    }

    return (data || []).map((m) => ({
      id: m.id,
      sessionId: m.session_id,
      role: m.role,
      content: m.content,
      metadata: (m.metadata as Record<string, unknown>) || {},
      createdAt: m.created_at,
    }));
  }

  /**
   * Answers questions about group balances and expense history using Gemini.
   */
  async askAssistant(
    userId: string,
    groupId: string,
    sessionId: string,
    query: string
  ): Promise<{ answer: string; messageId: string }> {
    await this.assertGroupMember(userId, groupId);

    // 1. Fetch factual group financial balance summary
    const balanceService = new BalanceService(this.supabase);
    const balanceSummary = await balanceService.getGroupBalances(userId, groupId);

    const spendingFormatted = `${balanceSummary.currency} ${(balanceSummary.totalGroupSpending / 100).toFixed(2)}`;

    const memberBalancesText = Object.values(balanceSummary.balances)
      .map((b) => {
        const amountFormatted = `${balanceSummary.currency} ${(Math.abs(b.netBalance) / 100).toFixed(2)}`;
        if (b.netBalance > 0) return `- ${b.displayName} is owed ${amountFormatted} (+${amountFormatted})`;
        if (b.netBalance < 0) return `- ${b.displayName} owes ${amountFormatted} (-${amountFormatted})`;
        return `- ${b.displayName} is settled up (₹0.00)`;
      })
      .join('\n');

    const debtsText = balanceSummary.simplifiedDebts.length > 0
      ? balanceSummary.simplifiedDebts
          .map((d) => `- ${d.fromDisplayName} owes ${d.toDisplayName}: ${d.currency} ${(d.amount / 100).toFixed(2)}`)
          .join('\n')
      : 'All debts are fully settled.';

    const contextSummary = `Total Group Spending: ${spendingFormatted}
Member Net Balances:
${memberBalancesText}

Simplified Debts (Who owes whom):
${debtsText}`;

    // 2. Query Gemini
    const answer = await this.gemini.answerGroupQuery(query, contextSummary);

    // 3. Save user message and assistant reply
    await this.supabase.from('conversation_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: query,
    });

    const { data: replyRecord, error } = await this.supabase
      .from('conversation_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: answer,
      })
      .select()
      .single();

    if (error || !replyRecord) {
      throw new GroupError(error?.message || 'Failed to save assistant message');
    }

    return {
      answer,
      messageId: replyRecord.id,
    };
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
}
