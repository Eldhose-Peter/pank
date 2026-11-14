import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ConversationService } from '@/modules/ai/conversation-service';
import { GroupError } from '@/modules/groups/errors';
import { validateChatQuery } from '@/modules/ai/guardrails';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, sessionId } = body;

    const validation = validateChatQuery(query);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const conversationService = new ConversationService(supabase);

    // If no sessionId provided, create a new session
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const session = await conversationService.createSession(user.id, groupId);
      targetSessionId = session.id;
    }

    const result = await conversationService.askAssistant(
      user.id,
      groupId,
      targetSessionId,
      query.trim()
    );

    return NextResponse.json({
      sessionId: targetSessionId,
      answer: result.answer,
      messageId: result.messageId,
    });
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
