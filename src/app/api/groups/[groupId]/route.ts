import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GroupService } from '@/modules/groups/service';
import { GroupError } from '@/modules/groups/errors';

export async function GET(
  _request: Request,
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

    const groupService = new GroupService(supabase);
    const result = await groupService.getGroupWithMembers(user.id, groupId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
