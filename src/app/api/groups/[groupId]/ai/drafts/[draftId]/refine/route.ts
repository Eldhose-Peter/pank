import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DraftService } from '@/modules/ai/draft-service';
import { GroupError, ValidationError } from '@/modules/groups/errors';

/**
 * POST /api/groups/[groupId]/ai/drafts/[draftId]/refine
 *
 * Refines an existing draft (such as an itemized bill) with additional
 * natural language instructions provided after the user reviews the parsed items.
 */
export async function POST(
  request: Request,
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

    const body = await request.json();
    const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';

    if (!instructions) {
      return NextResponse.json(
        { error: 'Instructions are required to refine the draft' },
        { status: 400 }
      );
    }

    const draftService = new DraftService(supabase);
    const updatedDraft = await draftService.refineDraft(user.id, groupId, draftId, instructions);

    return NextResponse.json({ draft: updatedDraft });
  } catch (error: any) {
    if (error instanceof GroupError || error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as any).statusCode || 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
