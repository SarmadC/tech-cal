/**
 * Submit Event Page
 *
 * Allows authenticated users to submit a tech event, hackathon, or meetup
 * for admin review and potential publication on Tech-Cal.
 */

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SubmitEventForm from './SubmitEventForm';

export default async function SubmitEventPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            <div className="max-w-2xl mx-auto px-4 py-12">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-white">Submit an event</h1>
                    <p className="mt-2 text-white/50 text-sm leading-relaxed">
                        Share a tech event, hackathon, or meetup with the community. Our team will
                        review your submission and publish it if it meets our guidelines.
                    </p>
                </div>
                <SubmitEventForm />
            </div>
        </div>
    );
}
