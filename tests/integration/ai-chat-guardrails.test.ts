import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/groups/[groupId]/ai/chat/route';
import { createClient } from '@/lib/supabase/server';
import { OFF_TOPIC_REFUSAL_MESSAGE } from '@/modules/ai/guardrails';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const askAssistantMock = vi.fn();
const createSessionMock = vi.fn();

vi.mock('@/modules/ai/conversation-service', () => {
  class MockConversationService {
    askAssistant = askAssistantMock;
    createSession = createSessionMock;
  }
  return {
    ConversationService: MockConversationService,
  };
});

describe('Integration: AI Chat Guardrails Route (/api/groups/[groupId]/ai/chat)', () => {
  const groupId = 'test-group-123';
  const authenticatedUser = { id: 'user-abc', email: 'test@example.com' };
  let mockSupabase: {
    auth: {
      getUser: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    createSessionMock.mockResolvedValue({ id: 'session-123' });
    askAssistantMock.mockResolvedValue({
      answer: 'Total spending is ₹5,000.',
      messageId: 'msg-456',
    });

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: authenticatedUser },
          error: null,
        }),
      },
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  const createRequest = (body: Record<string, unknown>) => {
    return new Request(`http://localhost:3000/api/groups/${groupId}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('rejects unauthenticated requests with 401', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = createRequest({ query: 'Who owes what?' });
    const res = await POST(req, { params: Promise.resolve({ groupId }) });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
    expect(askAssistantMock).not.toHaveBeenCalled();
  });

  it('rejects empty or whitespace query with 400', async () => {
    const req = createRequest({ query: '   ' });
    const res = await POST(req, { params: Promise.resolve({ groupId }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Query is required');
    expect(askAssistantMock).not.toHaveBeenCalled();
  });

  it('rejects queries exceeding 300 characters with 400 Bad Request', async () => {
    const longQuery = 'How much did we spend on the party? '.repeat(20); // > 300 chars
    expect(longQuery.length).toBeGreaterThan(300);

    const req = createRequest({ query: longQuery });
    const res = await POST(req, { params: Promise.resolve({ groupId }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Query exceeds maximum length of 300 characters');
    expect(askAssistantMock).not.toHaveBeenCalled();
  });

  it('rejects Python coding query with zero API token cost (400 Bad Request)', async () => {
    const req = createRequest({
      query: 'Write a python script to calculate debts and print them',
    });
    const res = await POST(req, { params: Promise.resolve({ groupId }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(OFF_TOPIC_REFUSAL_MESSAGE);
    expect(data.error).toBe(
      "I can only help with questions about your group's expenses, balances, and settlements."
    );

    // Verify AI was NEVER called (zero API token cost)
    expect(askAssistantMock).not.toHaveBeenCalled();
  });

  it('rejects creative writing, poetry, and stories with zero API token cost', async () => {
    const req = createRequest({
      query: 'Write a poem about our weekend trip expenses',
    });
    const res = await POST(req, { params: Promise.resolve({ groupId }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(OFF_TOPIC_REFUSAL_MESSAGE);
    expect(askAssistantMock).not.toHaveBeenCalled();
  });

  it('rejects roleplay and persona adoption with zero API token cost', async () => {
    const req = createRequest({
      query: 'Act as a pirate and tell me a story about treasure',
    });
    const res = await POST(req, { params: Promise.resolve({ groupId }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(OFF_TOPIC_REFUSAL_MESSAGE);
    expect(askAssistantMock).not.toHaveBeenCalled();
  });

  it('rejects general trivia queries with zero API token cost', async () => {
    const req = createRequest({
      query: 'What is the capital of France?',
    });
    const res = await POST(req, { params: Promise.resolve({ groupId }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(OFF_TOPIC_REFUSAL_MESSAGE);
    expect(askAssistantMock).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON body with 400 Bad Request', async () => {
    const req = new Request(`http://localhost:3000/api/groups/${groupId}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json-{',
    });
    const res = await POST(req, { params: Promise.resolve({ groupId }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid JSON body');
    expect(askAssistantMock).not.toHaveBeenCalled();
  });

  it('processes legitimate group financial query successfully with 200 OK', async () => {
    const req = createRequest({
      query: 'Who owes the most in this group?',
      sessionId: 'existing-session-456',
    });
    const res = await POST(req, { params: Promise.resolve({ groupId }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.answer).toBe('Total spending is ₹5,000.');
    expect(data.sessionId).toBe('existing-session-456');
    expect(data.messageId).toBe('msg-456');

    expect(askAssistantMock).toHaveBeenCalledTimes(1);
    expect(askAssistantMock).toHaveBeenCalledWith(
      authenticatedUser.id,
      groupId,
      'existing-session-456',
      'Who owes the most in this group?'
    );
  });

  it('allows valid queries containing words like import fees or settlements with 200 OK', async () => {
    const queries = [
      'Who paid the import fees for our order?',
      'How to implement settlements between us?',
      'How much did we spend on the function (party)?',
      'What is the capital of our group fund?',
    ];

    for (const q of queries) {
      askAssistantMock.mockClear();
      const req = createRequest({ query: q });
      const res = await POST(req, { params: Promise.resolve({ groupId }) });

      expect(res.status).toBe(200);
      expect(askAssistantMock).toHaveBeenCalledTimes(1);
    }
  });
});
