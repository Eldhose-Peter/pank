import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo-password-123';
const DEMO_NAME = 'Demo User';

export async function POST() {
  try {
    // 1. Ensure demo user exists
    const admin = createAdminClient();
    const { data: users } = await admin.auth.admin.listUsers();
    let demoUser = users?.users?.find((u) => u.email === DEMO_EMAIL);

    if (!demoUser) {
      const { data, error: createError } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: DEMO_NAME },
      });
      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
      demoUser = data.user;
    }

    // 2. Sign in to issue session cookies
    const supabase = await createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: signInData.user,
      session: signInData.session,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Demo login failed' },
      { status: 500 }
    );
  }
}
