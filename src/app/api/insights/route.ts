import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InsightsService } from '@/modules/insights/service';
import { GroupError } from '@/modules/groups/errors';

export async function GET(_request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const insightsService = new InsightsService(supabase);
    const insights = await insightsService.getOverallUserInsights(user.id);

    return NextResponse.json(insights);
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
