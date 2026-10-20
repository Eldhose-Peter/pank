import { describe, it, expect } from 'vitest';
import {
  createGroupSchema,
  addMemberSchema,
  createInvitationSchema,
} from '@/modules/groups/validation';

describe('Groups: Validation Schemas', () => {
  describe('createGroupSchema', () => {
    it('validates a valid group input with default currency', () => {
      const result = createGroupSchema.safeParse({
        name: 'Goa Trip 2026',
        description: 'Expenses for Goa vacation',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('INR');
        expect(result.data.name).toBe('Goa Trip 2026');
      }
    });

    it('rejects empty or whitespace-only group name', () => {
      const result = createGroupSchema.safeParse({
        name: '   ',
      });

      expect(result.success).toBe(false);
    });

    it('rejects invalid currency code', () => {
      const result = createGroupSchema.safeParse({
        name: 'Flatmates',
        currency: 'INVALID',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('addMemberSchema', () => {
    it('validates a placeholder member with display name', () => {
      const result = addMemberSchema.safeParse({
        displayName: 'Rahul',
        isPlaceholder: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('member');
      }
    });

    it('validates an authenticated user member with valid uuid', () => {
      const result = addMemberSchema.safeParse({
        displayName: 'Priya Sharma',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'admin',
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid user uuid', () => {
      const result = addMemberSchema.safeParse({
        displayName: 'Test',
        userId: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('createInvitationSchema', () => {
    it('applies default expiration of 7 days', () => {
      const result = createInvitationSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expiresInDays).toBe(7);
      }
    });

    it('rejects expiration longer than 30 days', () => {
      const result = createInvitationSchema.safeParse({
        expiresInDays: 31,
      });

      expect(result.success).toBe(false);
    });
  });
});
