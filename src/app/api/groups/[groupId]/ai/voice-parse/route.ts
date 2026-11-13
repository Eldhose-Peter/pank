import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DraftService } from '@/modules/ai/draft-service';
import { GeminiAIClient } from '@/modules/ai/gemini-client';
import { GroupError } from '@/modules/groups/errors';

/**
 * POST /api/groups/[groupId]/ai/voice-parse
 *
 * Accepts an audio recording (as FormData with an 'audio' file) and uses Gemini's
 * multimodal capabilities to transcribe + parse the expense in a single API call.
 * Falls back to transcription-only if structured extraction fails.
 */
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

    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const sessionId = formData.get('sessionId') as string | null;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Audio recording is required' },
        { status: 400 }
      );
    }

    // Limit audio size to 10MB
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large. Please record a shorter message.' },
        { status: 400 }
      );
    }

    // 1. Fetch group members for context
    const { data: memberRows, error: membersError } = await supabase
      .from('group_members')
      .select('id, user_id, display_name, is_placeholder')
      .eq('group_id', groupId);

    if (membersError || !memberRows) {
      throw new GroupError('Failed to fetch group members');
    }

    // Verify the caller is a member
    const currentMember = memberRows.find((m) => m.user_id === user.id);
    if (!currentMember) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // 2. Fetch group currency
    const { data: group } = await supabase
      .from('groups')
      .select('currency')
      .eq('id', groupId)
      .single();

    const defaultCurrency = group?.currency || 'INR';

    // 3. Transcribe the audio using Gemini multimodal
    const gemini = new GeminiAIClient();
    const transcript = await gemini.transcribeAudio(audioFile);

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not understand the audio. Please speak clearly and try again.' },
        { status: 422 }
      );
    }

    // 4. Feed the transcribed text into the draft pipeline (or refine existing draft if draftId provided)
    const draftId = (formData.get('draftId') as string | null) || undefined;
    const draftService = new DraftService(supabase);

    let draftPreview;
    if (draftId) {
      draftPreview = await draftService.refineDraft(
        user.id,
        groupId,
        draftId,
        transcript.trim()
      );
    } else {
      draftPreview = await draftService.parseExpenseInput(
        user.id,
        groupId,
        transcript.trim(),
        sessionId || undefined
      );
    }

    return NextResponse.json(
      {
        draft: draftPreview,
        transcript: transcript.trim(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Voice parse error:', error);
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
