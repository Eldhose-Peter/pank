import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name cannot be empty')
    .max(100, 'Group name must be 100 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer')
    .optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code (e.g. INR, USD)')
    .default('INR'),
});

export const updateGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name cannot be empty')
    .max(100, 'Group name must be 100 characters or fewer')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer')
    .optional(),
});

export const addMemberSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name cannot be empty')
    .max(50, 'Display name must be 50 characters or fewer'),
  userId: z.string().uuid('Invalid user ID').optional(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  isPlaceholder: z.boolean().default(false),
});

export const createInvitationSchema = z.object({
  placeholderMemberId: z.string().uuid('Invalid placeholder member ID').optional(),
  expiresInDays: z
    .number()
    .int()
    .min(1, 'Expiration must be at least 1 day')
    .max(30, 'Expiration cannot exceed 30 days')
    .default(7),
  maxUses: z.number().int().positive('Max uses must be positive').nullable().optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().trim().min(10, 'Invalid invitation token format'),
});

export type CreateGroupDTO = z.infer<typeof createGroupSchema>;
export type UpdateGroupDTO = z.infer<typeof updateGroupSchema>;
export type AddMemberDTO = z.infer<typeof addMemberSchema>;
export type CreateInvitationDTO = z.infer<typeof createInvitationSchema>;
export type CreateInvitationInputDTO = z.input<typeof createInvitationSchema>;
export type AcceptInvitationDTO = z.infer<typeof acceptInvitationSchema>;
