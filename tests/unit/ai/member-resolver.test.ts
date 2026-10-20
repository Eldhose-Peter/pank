import { describe, it, expect } from 'vitest';
import { MemberResolver, stringSimilarity, type GroupMemberCandidate } from '@/modules/ai/member-resolver';

describe('AI: MemberResolver', () => {
  const members: GroupMemberCandidate[] = [
    { id: 'm-alice', displayName: 'Alice Johnson', userId: 'u-alice', isCurrentUser: true },
    { id: 'm-rahul', displayName: 'Rahul Sharma', userId: 'u-rahul', isCurrentUser: false },
    { id: 'm-priya', displayName: 'Priya Patel', userId: 'u-priya', isCurrentUser: false },
    { id: 'm-arjun', displayName: 'Arjun Verma', userId: 'u-arjun', isCurrentUser: false },
  ];

  it('calculates string similarity accurately', () => {
    expect(stringSimilarity('Priya', 'Priya')).toBe(1.0);
    expect(stringSimilarity('priya', 'PRIYA')).toBe(1.0);
    expect(stringSimilarity('Priyah', 'Priya')).toBeGreaterThan(0.8);
    expect(stringSimilarity('Alice', 'Bob')).toBeLessThan(0.3);
  });

  it('resolves relative terms ("me", "I", "myself") to current user', () => {
    const result = MemberResolver.resolveMembers(
      [{ rawName: 'me', amount: 2400 }],
      [{ rawName: 'I' }, { rawName: 'Rahul' }],
      members,
      'm-alice'
    );

    expect(result.resolvedPayers).toHaveLength(1);
    expect(result.resolvedPayers[0].groupMemberId).toBe('m-alice');
    expect(result.resolvedPayers[0].amountPaid).toBe(240000); // 2400 * 100 paise

    expect(result.resolvedParticipants).toHaveLength(2);
    expect(result.resolvedParticipants.map((p) => p.groupMemberId)).toContain('m-alice');
    expect(result.resolvedParticipants.map((p) => p.groupMemberId)).toContain('m-rahul');
    expect(result.unresolvedNames).toHaveLength(0);
  });

  it('resolves first names matching unique group members', () => {
    const result = MemberResolver.resolveMembers(
      [{ rawName: 'Alice', amount: 1000 }],
      [
        { rawName: 'Rahul' },
        { rawName: 'Priya' },
        { rawName: 'Arjun' },
      ],
      members,
      'm-alice'
    );

    expect(result.resolvedPayers[0].groupMemberId).toBe('m-alice');
    expect(result.resolvedParticipants.map((p) => p.groupMemberId)).toEqual([
      'm-rahul',
      'm-priya',
      'm-arjun',
    ]);
    expect(result.unresolvedNames).toHaveLength(0);
  });

  it('resolves minor typos with fuzzy similarity', () => {
    const result = MemberResolver.resolveMembers(
      [{ rawName: 'me' }],
      [{ rawName: 'Priyah' }], // Typo for Priya
      members,
      'm-alice'
    );

    expect(result.resolvedParticipants).toHaveLength(1);
    expect(result.resolvedParticipants[0].groupMemberId).toBe('m-priya');
  });

  it('detects ambiguous matches when multiple members share the same name', () => {
    const ambiguousGroup: GroupMemberCandidate[] = [
      { id: 'm-1', displayName: 'Rahul Sharma', userId: 'u-1', isCurrentUser: false },
      { id: 'm-2', displayName: 'Rahul Verma', userId: 'u-2', isCurrentUser: false },
    ];

    const result = MemberResolver.resolveMembers(
      [{ rawName: 'me' }],
      [{ rawName: 'Rahul' }],
      ambiguousGroup,
      'm-current'
    );

    expect(result.ambiguousMatches).toHaveLength(1);
    expect(result.ambiguousMatches[0].rawName).toBe('Rahul');
    expect(result.ambiguousMatches[0].candidates).toHaveLength(2);
  });

  it('captures completely unresolved names with suggestions', () => {
    const result = MemberResolver.resolveMembers(
      [{ rawName: 'me' }],
      [{ rawName: 'Vikram' }], // Not in group
      members,
      'm-alice'
    );

    expect(result.unresolvedNames).toHaveLength(1);
    expect(result.unresolvedNames[0].rawName).toBe('Vikram');
  });
});
