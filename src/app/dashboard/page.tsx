// src/app/dashboard/page.tsx

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClientView from './DashboardClientView';

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login?redirect=/dashboard');
    }

    // Simplified - let the client handle all data fetching
    return (
        <DashboardClientView
            initialEventTypes={[]}
            initialUpcomingEvents={[]}
        />
    );
}