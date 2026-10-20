import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GroupService } from '@/modules/groups/service';
import { LandingHero } from '@/components/home/LandingHero';
import { UserDashboard } from '@/components/home/UserDashboard';

async function HomeContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingHero />;
  }

  const groupService = new GroupService(supabase);
  let groups: any[] = [];
  try {
    groups = await groupService.getUserGroups(user.id);
  } catch (err) {
    console.error('Error fetching groups on page render:', err);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <UserDashboard
      user={{
        id: user.id,
        email: user.email || '',
        fullName:
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Friend',
      }}
      initialGroups={groups}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LandingHero />}>
      <HomeContent />
    </Suspense>
  );
}
