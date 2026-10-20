export type MemberRole = 'owner' | 'admin' | 'member';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string | null;
  displayName: string;
  role: MemberRole;
  isPlaceholder: boolean;
  joinedAt: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  token: string;
  invitedBy: string;
  placeholderMemberId: string | null;
  expiresAt: string;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  currency?: string;
}

export interface AddMemberInput {
  displayName: string;
  userId?: string;
  role?: MemberRole;
  isPlaceholder?: boolean;
}

export interface CreateInvitationInput {
  placeholderMemberId?: string;
  expiresInDays?: number;
  maxUses?: number;
}
