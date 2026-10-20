import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SettlementService } from '@/modules/settlements/service';
import { GroupError } from '@/modules/groups/errors';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; settlementId: string }> }
) {
  try {
    const { groupId, settlementId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settlementService = new SettlementService(supabase);
    await settlementService.deleteSettlement(user.id, groupId, settlementId);

    return NextResponse.json({ success: true, message: 'Settlement deleted' });
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
