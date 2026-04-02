export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { isAdminUser } from '@/lib/adminAuth';
import { createClient } from '@/utils/supabase/server';
import CommunityReportsClient from './CommunityReportsClient';

export default async function AdminCommunityReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const isAdmin = await isAdminUser(user.id, supabase);
  if (!isAdmin) {
    redirect('/dashboard');
  }

  return <CommunityReportsClient />;
}
