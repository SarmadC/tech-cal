/**
 * Update Queue Dashboard
 * 
 * Admin-only page for reviewing and approving pending event updates
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { isAdminUser } from '@/lib/adminAuth';
import UpdateQueueClient from './UpdateQueueClient';

export const dynamic = 'force-dynamic';

export default async function UpdateQueuePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        redirect('/');
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Update Review Queue</h1>
                <p className="text-gray-600">
                    Review and approve pending event updates from re-ingestion
                </p>
            </div>

            <UpdateQueueClient />
        </div>
    );
}

