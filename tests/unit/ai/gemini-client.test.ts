import { describe, it, expect, vi } from 'vitest';
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

  it('extracts receipt in fallback offline mode gracefully', async () => {
    const fakeImageBuffer = Buffer.from('fake-image-data');
    const draft = await client.extractExpenseFromReceipt(
      fakeImageBuffer,
      'image/jpeg',
      members,
      'INR',
      'Split equally between everyone'
    );

    expect(draft).toBeDefined();
    expect(draft.amount).toBeGreaterThan(0);
    expect(draft.currency).toBe('INR');
    expect(draft.participants.length).toBeGreaterThan(0);
  });

  it('refines an existing itemized draft with subsequent split instructions', async () => {
    const existingDraft = {
      title: 'Pizzeria Romana',
      amount: 85000, // ₹850 in paise
      currency: 'INR',
      receiptItems: [
        { name: 'Farmhouse Pizza', amount: 450 },
        { name: 'Garlic Bread', amount: 150 },
        { name: 'Cold Drinks', amount: 100 },
        { name: 'Choco Mousse', amount: 150 },
      ],
    };

    const refined = await client.refineExpenseDraft(
      existingDraft,
      'Rahul had the Farmhouse Pizza, split the rest equally with Priya and me',
      members
    );

    expect(refined).toBeDefined();
    expect(refined.amount).toBe(850);
    expect(refined.receiptItems?.length).toBe(4);
    expect(refined.participants.length).toBeGreaterThan(0);
  });

  it('refines an existing draft with proportional ratio instructions', async () => {
    const existingDraft = {
      title: 'Coffee House',
      amount: 30000,
      currency: 'INR',
      receiptItems: [{ name: 'Cappuccino x2', amount: 300 }],
    };

    const refined = await client.refineExpenseDraft(
      existingDraft,
      'Rahul ate one third, Priya and Arjun split the rest',
      members
    );

    expect(refined).toBeDefined();
    expect(refined.amount).toBe(300);
    expect(refined.participants.length).toBeGreaterThan(0);
  });

  describe('answerGroupQuery Guardrails & Negative Constraints', () => {
    const contextSummary = `Total Group Spending: INR 5000.00
Member Net Balances:
- Rahul owes INR 1500.00
- Eldho is owed INR 1500.00
Simplified Debts:
- Rahul owes Eldho: INR 1500.00`;

    it('offline mode: returns simulated summary for on-topic questions', async () => {
      const answer = await client.answerGroupQuery('Who owes whom?', contextSummary);
      expect(answer).toContain('Based on the group records:');
      expect(answer).toContain('Rahul owes Eldho: INR 1500.00');
    });

    it('offline mode: immediately refuses off-topic coding queries', async () => {
      const answer = await client.answerGroupQuery(
        'Write a python script to calculate debts',
        contextSummary
      );
      expect(answer).toBe(
        "I can only help with questions about your group's expenses, balances, and settlements."
      );
    });

    it('offline mode: refuses creative writing and trivia queries', async () => {
      const storyAnswer = await client.answerGroupQuery(
        'Write a poem about splitting bills with friends',
        contextSummary
      );
      expect(storyAnswer).toBe(
        "I can only help with questions about your group's expenses, balances, and settlements."
      );

      const triviaAnswer = await client.answerGroupQuery(
        'What is the capital of France?',
        contextSummary
      );
      expect(triviaAnswer).toBe(
        "I can only help with questions about your group's expenses, balances, and settlements."
      );
    });

    it('configures systemInstruction, maxOutputTokens: 300, and temperature: 0.1 on Gemini generateContent', async () => {
      interface MockContentParams {
        model: string;
        contents: string;
        config: {
          systemInstruction: string;
          temperature: number;
          maxOutputTokens: number;
        };
      }
      let capturedParams: MockContentParams | null = null;
      const mockGenerateContent = (params: MockContentParams) => {
        capturedParams = params;
        return Promise.resolve({
          text: 'Rahul owes Eldho ₹1,500.',
        });
      };

      const customClient = new GeminiAIClient();
      // Inject mock client
      (customClient as unknown as { client: unknown }).client = {
        models: {
          generateContent: mockGenerateContent,
        },
      };

      const result = await customClient.answerGroupQuery(
        'Who owes whom in this group?',
        contextSummary
      );

      expect(result).toBe('Rahul owes Eldho ₹1,500.');
      expect(capturedParams).not.toBeNull();

      // Verify token cap and temperature
      expect(capturedParams!.config.maxOutputTokens).toBe(300);
      expect(capturedParams!.config.temperature).toBe(0.1);

      // Verify strict domain boundaries and negative constraints in systemInstruction
      const instruction = capturedParams!.config.systemInstruction;
      expect(instruction).toContain(
        "sole purpose is answering questions about this group's expenses, member balances, who owes whom, and settlements"
      );
      expect(instruction).toContain('forbidden from writing code, programming scripts');
      expect(instruction).toContain('general knowledge, roleplay, or creative writing');
      expect(instruction).toContain(
        'I can only help with questions about your group\'s expenses, balances, and settlements.'
      );
    });

    it('online mode (with client): immediately refuses off-topic queries with zero API token cost', async () => {
      const mockGenerateContent = vi.fn();
      const customClient = new GeminiAIClient();
      (customClient as unknown as { client: unknown }).client = {
        models: {
          generateContent: mockGenerateContent,
        },
      };

      const result = await customClient.answerGroupQuery(
        'Write a python script to calculate debts',
        contextSummary
      );

      expect(result).toBe(
        "I can only help with questions about your group's expenses, balances, and settlements."
      );
      // Ensure generateContent was NEVER invoked
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });
});
