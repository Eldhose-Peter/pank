import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GroupService } from '@/modules/groups/service';
import { GroupError } from '@/modules/groups/errors';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupService = new GroupService(supabase);
    const groups = await groupService.getUserGroups(user.id);

    return NextResponse.json({ groups });
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const groupService = new GroupService(supabase);
    const group = await groupService.createGroup(user.id, body);

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
