import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      const response = NextResponse.json({ user: null });
      if (error && (error.code === 'refresh_token_not_found' || error.code === 'refresh_token_already_used')) {
        const cookieStore = await cookies();
        cookieStore.getAll().forEach((c) => {
          if (c.name.includes('-auth-token')) {
            response.cookies.delete(c.name);
          }
        });
      }
      return response;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
        avatarUrl: profile?.avatar_url,
        defaultCurrency: profile?.default_currency || 'INR',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
