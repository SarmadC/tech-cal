export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

import DashboardSummaryView from '@/app/dashboard/DashboardSummaryView';
import { buildMobileDashboardSummaryForUser } from '@/services/dashboard/dashboardSummaryService';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const readClient =
    supabaseUrl && serviceRoleKey
      ? createServiceClient(supabaseUrl, serviceRoleKey)
      : supabase;

  const { summary } = await buildMobileDashboardSummaryForUser({
    userId: user.id,
    supabase,
    readClient,
  });

  return <DashboardSummaryView summary={summary} />;
}
