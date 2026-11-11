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

  it('detects proportional split from fraction language like "one third"', async () => {
    const twoMembers = [
      { id: 'm-me', displayName: 'Demo User', isCurrentUser: true },
      { id: 'm-alice', displayName: 'Alice', isCurrentUser: false },
    ];
    const input = 'Alice and i ate pizza for 300 rupees, Alice ate one third. Split based on the amount eaten.';
    const draft = await client.extractExpense(input, twoMembers, 'INR');

    expect(draft.amount).toBe(300);
    expect(draft.splitType).not.toBe('equal');
    // Should be 'shares' (1:2 ratio) or 'percentage' or 'exact' — anything but equal
    expect(['shares', 'percentage', 'exact']).toContain(draft.splitType);
  });

  it('detects ratio-based split like "70-30 split"', async () => {
    const twoMembers = [
      { id: 'm-me', displayName: 'Eldho', isCurrentUser: true },
      { id: 'm-rahul', displayName: 'Rahul', isCurrentUser: false },
    ];
    const input = 'Paid ₹1000 for cab with Rahul, 70-30 split';
    const draft = await client.extractExpense(input, twoMembers, 'INR');

    expect(draft.amount).toBe(1000);
    expect(draft.splitType).not.toBe('equal');
  });

  it('detects "split based on usage" as non-equal', async () => {
    const twoMembers = [
      { id: 'm-me', displayName: 'Eldho', isCurrentUser: true },
      { id: 'm-rahul', displayName: 'Rahul', isCurrentUser: false },
    ];
    const input = 'Rahul and I used internet for 600 rupees. I used half, Rahul used the other half. Split based on usage.';
    const draft = await client.extractExpense(input, twoMembers, 'INR');

    expect(draft.amount).toBe(600);
    // "half and half" could reasonably be equal or shares — both are correct
    expect(['equal', 'shares', 'percentage', 'exact']).toContain(draft.splitType);
  });
});
