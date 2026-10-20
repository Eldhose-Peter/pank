import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  createInvitationSchema,
  type CreateGroupDTO,
  type UpdateGroupDTO,
  type AddMemberDTO,
  type CreateInvitationDTO,
  type CreateInvitationInputDTO,
} from './validation';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  GroupError,
} from './errors';
import type { Group, GroupMember, GroupInvitation } from './types';

export class GroupService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Creates a new group and bootstraps the creator as the group owner.
   */
  async createGroup(userId: string, input: CreateGroupDTO): Promise<Group> {
    const parsed = createGroupSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid group input', parsed.error.format());
    }

    const { name, description, currency } = parsed.data;

    // 1. Insert the group
    const { data: group, error: groupError } = await this.supabase
      .from('groups')
      .insert({
        name,
        description: description || null,
        currency,
        created_by: userId,
      })
      .select()
      .single();

    if (groupError || !group) {
      throw new GroupError(groupError?.message || 'Failed to create group');
    }

    // 2. Add creator as owner member (fallback if trigger is disabled or in local mocking)
    const { error: memberError } = await this.supabase
      .from('group_members')
      .upsert(
        {
          group_id: group.id,
          user_id: userId,
          display_name: 'Owner',
          role: 'owner',
          is_placeholder: false,
        },
        { onConflict: 'group_id, user_id' }
      );

    if (memberError) {
      // If trigger already inserted it, ignore conflict error
      if (!memberError.message.includes('duplicate')) {
        console.warn('Group member upsert notice:', memberError.message);
      }
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      currency: group.currency,
      createdBy: group.created_by,
      createdAt: group.created_at,
      updatedAt: group.updated_at,
    };
  }

  /**
   * Fetches all groups where the user is an active member.
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    const { data, error } = await this.supabase
      .from('group_members')
      .select('groups (*)')
      .eq('user_id', userId);

    if (error) {
      throw new GroupError(error.message);
    }

    if (!data) return [];

    return data
      .map((row) => (row as unknown as { groups: Database['public']['Tables']['groups']['Row'] }).groups)
      .filter(Boolean)
      .map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        currency: g.currency,
        createdBy: g.created_by,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      }));
  }

  /**
   * Fetches a single group with its members, verifying caller membership.
   */
  async getGroupWithMembers(
    userId: string,
    groupId: string
  ): Promise<{ group: Group; members: GroupMember[] }> {
    // 1. Verify membership
    const { data: memberRecord, error: memberCheckError } = await this.supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberCheckError) {
      throw new GroupError(memberCheckError.message);
    }

    if (!memberRecord) {
      throw new ForbiddenError('You are not a member of this group');
    }

    // 2. Fetch group
    const { data: group, error: groupError } = await this.supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      throw new NotFoundError('Group not found');
    }

    // 3. Fetch all members
    const { data: members, error: membersError } = await this.supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (membersError) {
      throw new GroupError(membersError.message);
    }

    return {
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        currency: group.currency,
        createdBy: group.created_by,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      },
      members: (members || []).map((m) => ({
        id: m.id,
        groupId: m.group_id,
        userId: m.user_id,
        displayName: m.display_name,
        role: m.role,
        isPlaceholder: m.is_placeholder,
        joinedAt: m.joined_at,
      })),
    };
  }

  /**
   * Adds a member or placeholder member to the group (Admin only).
   */
  async addMember(
    callerUserId: string,
    groupId: string,
    input: AddMemberDTO
  ): Promise<GroupMember> {
    const parsed = addMemberSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid member input', parsed.error.format());
    }

    // Check caller is admin or owner
    await this.assertAdminOrOwner(callerUserId, groupId);

    const { displayName, userId, role, isPlaceholder } = parsed.data;

    const { data, error } = await this.supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId || null,
        display_name: displayName,
        role: role || 'member',
        is_placeholder: isPlaceholder ?? (userId ? false : true),
      })
      .select()
      .single();

    if (error || !data) {
      throw new GroupError(error?.message || 'Failed to add group member');
    }

    return {
      id: data.id,
      groupId: data.group_id,
      userId: data.user_id,
      displayName: data.display_name,
      role: data.role,
      isPlaceholder: data.is_placeholder,
      joinedAt: data.joined_at,
    };
  }

  /**
   * Generates a shareable invitation token.
   */
  async createInvitation(
    callerUserId: string,
    groupId: string,
    input: CreateInvitationInputDTO = {}
  ): Promise<GroupInvitation> {
    const parsed = createInvitationSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError('Invalid invitation input', parsed.error.format());
    }

    // Verify caller is member
    const { data: callerMember } = await this.supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', callerUserId)
      .maybeSingle();

    if (!callerMember) {
      throw new ForbiddenError('Only group members can generate invitations');
    }

    const { placeholderMemberId, expiresInDays, maxUses } = parsed.data;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from('group_invitations')
      .insert({
        group_id: groupId,
        invited_by: callerUserId,
        placeholder_member_id: placeholderMemberId || null,
        expires_at: expiresAt,
        max_uses: maxUses || null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new GroupError(error?.message || 'Failed to create invitation');
    }

    return {
      id: data.id,
      groupId: data.group_id,
      token: data.token,
      invitedBy: data.invited_by,
      placeholderMemberId: data.placeholder_member_id,
      expiresAt: data.expires_at,
      maxUses: data.max_uses,
      useCount: data.use_count,
      createdAt: data.created_at,
    };
  }

  /**
   * Accepts an invitation token to join the group or claim a placeholder.
   */
  async acceptInvitation(userId: string, token: string): Promise<{ groupId: string; memberId: string }> {
    const { data, error } = await (this.supabase.rpc as any)('accept_group_invitation', {
      invite_token: token,
    });

    if (error) {
      throw new GroupError(error.message);
    }

    const result = data as { success: boolean; groupId: string; memberId: string; message: string };
    if (!result || !result.success) {
      throw new GroupError(result?.message || 'Failed to accept invitation');
    }

    return {
      groupId: result.groupId,
      memberId: result.memberId,
    };
  }

  private async assertAdminOrOwner(userId: string, groupId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    const member = data as { role?: string } | null;
    if (error || !member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenError('Admin or owner permissions required for this action');
    }
  }
}
