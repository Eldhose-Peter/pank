import { describe, it, expect } from 'vitest';
import { GeminiAIClient } from '@/modules/ai/gemini-client';

describe('AI: GeminiAIClient Expense Parsing', () => {
  const client = new GeminiAIClient();
  const members = [
    { id: 'm-me', displayName: 'Eldho', isCurrentUser: true },
    { id: 'm-rahul', displayName: 'Rahul', isCurrentUser: false },
    { id: 'm-priya', displayName: 'Priya', isCurrentUser: false },
    { id: 'm-arjun', displayName: 'Arjun', isCurrentUser: false },
  ];

  it('correctly parses the primary example prompt into structured draft', async () => {
    const input = 'I paid ₹2,400 for dinner. Split it equally between me, Rahul, Priya and Arjun.';
    const draft = await client.extractExpense(input, members, 'INR');

    expect(draft.title).toBe('Dinner');
    expect(draft.amount).toBe(2400);
    expect(draft.currency).toBe('INR');
    expect(draft.splitType).toBe('equal');
    expect(draft.payers).toEqual([{ rawName: 'me', amount: 2400 }]);

    const participantNames = draft.participants.map((p) => p.rawName.toLowerCase());
    expect(participantNames).toContain('me');
    expect(participantNames).toContain('rahul');
    expect(participantNames).toContain('priya');
    expect(participantNames).toContain('arjun');
    expect(draft.clarificationNeeded).toHaveLength(0);
  });

  it('detects USD and other currencies properly', async () => {
    const input = 'Paid $150 for Groceries with Rahul and Priya';
    const draft = await client.extractExpense(input, members, 'INR');

    expect(draft.amount).toBe(150);
    expect(draft.currency).toBe('USD');
    expect(draft.title).toBe('Groceries');
  });

  it('flags missing amount for clarification', async () => {
    const input = 'Split dinner between me and Rahul';
    const draft = await client.extractExpense(input, members, 'INR');

    expect(draft.amount).toBe(0);
    expect(draft.clarificationNeeded.length).toBeGreaterThan(0);
    expect(draft.clarificationNeeded[0]).toMatch(/amount/i);
  });

  it('handles "everyone" / "all of us" split cleanly', async () => {
    const input = 'I spent ₹500 on snacks for everyone';
    const draft = await client.extractExpense(input, members, 'INR');

    expect(draft.amount).toBe(500);
    expect(draft.participants.length).toBe(members.length);
  });
});
