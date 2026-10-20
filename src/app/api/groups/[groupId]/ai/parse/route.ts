import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DraftService } from '@/modules/ai/draft-service';
import { GroupError } from '@/modules/groups/errors';

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
    const { input, sessionId } = body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 });
    }

    const draftService = new DraftService(supabase);
    const draftPreview = await draftService.parseExpenseInput(user.id, groupId, input.trim(), sessionId);

    return NextResponse.json({ draft: draftPreview }, { status: 201 });
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
