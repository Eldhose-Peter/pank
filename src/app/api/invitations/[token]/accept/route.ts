import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GroupService } from '@/modules/groups/service';
import { GroupError } from '@/modules/groups/errors';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupService = new GroupService(supabase);
    const result = await groupService.acceptInvitation(user.id, token);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
