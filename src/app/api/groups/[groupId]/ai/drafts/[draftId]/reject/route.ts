import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DraftService } from '@/modules/ai/draft-service';
import { GroupError } from '@/modules/groups/errors';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; draftId: string }> }
) {
  try {
    const { groupId, draftId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const draftService = new DraftService(supabase);
    await draftService.rejectDraft(user.id, groupId, draftId);

    return NextResponse.json({ success: true, message: 'Draft rejected' });
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
