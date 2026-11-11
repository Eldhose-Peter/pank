import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DraftService } from '@/modules/ai/draft-service';
import { GeminiAIClient } from '@/modules/ai/gemini-client';
import { GroupError } from '@/modules/groups/errors';

/**
 * POST /api/groups/[groupId]/ai/bill-parse
 *
 * Accepts a multipart form upload containing a receipt / bill image or PDF,
 * uploads it to Supabase Storage ('expense-receipts' bucket), runs Gemini 2.5 Flash
 * Vision OCR to extract merchant, total, date, line items, and creates an expense draft.
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
    const file = formData.get('file') as File | null;
    const instructions = (formData.get('instructions') as string | null) || '';
    const sessionId = (formData.get('sessionId') as string | null) || undefined;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'Receipt image or PDF file is required' },
        { status: 400 }
      );
    }

    // Limit file size to 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 15MB limit. Please upload a smaller image or PDF.' },
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

    // 2. Fetch group default currency
    const { data: group } = await supabase
      .from('groups')
      .select('currency')
      .eq('id', groupId)
      .single();

    const defaultCurrency = group?.currency || 'INR';

    // 3. Upload file to Supabase Storage
    let receiptUrl: string | null = null;
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${groupId}/${Date.now()}_${sanitizedFileName}`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(storagePath, fileBuffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('expense-receipts')
          .getPublicUrl(uploadData.path);
        receiptUrl = publicUrlData?.publicUrl || null;
      } else {
        console.warn('Receipt upload to storage failed, continuing without storage URL:', uploadError);
      }
    } catch (storageErr) {
      console.warn('Storage bucket exception, continuing without storage URL:', storageErr);
    }

    // 4. Extract bill details via Gemini 2.5 Flash Vision
    const gemini = new GeminiAIClient();
    const extracted = await gemini.extractExpenseFromReceipt(
      fileBuffer,
      file.type || 'image/jpeg',
      memberRows.map((m) => ({
        id: m.id,
        displayName: m.display_name,
        isCurrentUser: m.id === currentMember.id,
      })),
      defaultCurrency,
      instructions
    );

    // 5. Create Draft record using DraftService
    const draftService = new DraftService(supabase);
    const rawInputSummary = instructions
      ? `Receipt: ${file.name} (${instructions})`
      : `Receipt: ${file.name}`;

    const draftPreview = await draftService.processExtractedDraft(
      user.id,
      groupId,
      rawInputSummary,
      extracted,
      memberRows,
      currentMember,
      sessionId,
      receiptUrl || undefined
    );

    return NextResponse.json(
      {
        draft: draftPreview,
        receiptUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Bill parse error:', error);
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message = (error as Error).message || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
