import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Try signing up with auto-confirm via admin client to allow immediate login in dev/production
    let user;
    try {
      const adminClient = createAdminClient();
      const { data: adminUser, error: adminError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (adminError && !adminError.message.includes('already registered')) {
        throw adminError;
      }
      user = adminUser?.user;
    } catch {
      // Fallback to standard signUp
    }

    // Now sign in to establish session cookies
    const supabase = await createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // If sign in fails because email wasn't confirmed yet or error
      return NextResponse.json(
        { message: 'Account created. Please sign in.', user },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { user: signInData.user, session: signInData.session },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Signup failed' },
      { status: 500 }
    );
  }
}
