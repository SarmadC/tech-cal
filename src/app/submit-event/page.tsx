export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import SubmitEventForm from './SubmitEventForm';

function getInitialOrganizerName(user: {
    email?: string | null;
    user_metadata?: Record<string, unknown>;
}, profileName: string | null): string {
    if (profileName?.trim()) return profileName.trim();

    const metadataName = typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === 'string'
            ? user.user_metadata.name
            : null;

    if (metadataName?.trim()) return metadataName.trim();

    if (user.email?.includes('@')) return user.email.split('@')[0];

    return '';
}

export default async function SubmitEventPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    let initialOrganizerName = '';

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        initialOrganizerName = getInitialOrganizerName(user, profile?.full_name ?? null);
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            <div className="mx-auto max-w-3xl px-4 py-12">
                <div className="mb-8 space-y-3">
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/55">
                        Community submissions
                    </span>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-white">Submit an event</h1>
                        <p className="max-w-2xl text-sm leading-relaxed text-white/55">
                            Organize something great? Add it to Kure-Cal even if you do not have a website.
                            We review every submission before it goes live.
                        </p>
                    </div>
                </div>

                {!user ? (
                    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-8">
                        <div className="space-y-3">
                            <h2 className="text-xl font-semibold text-white">Sign in to submit your event</h2>
                            <p className="max-w-xl text-sm leading-relaxed text-white/55">
                                We keep submission tied to your account so organizers can be identified during
                                review. After you sign in, you&apos;ll come straight back here.
                            </p>
                        </div>

                        <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-3">
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                <p className="font-medium text-white">No website required</p>
                                <p className="mt-2 text-white/45">You can publish Kure-Cal-original events directly from the form.</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                <p className="font-medium text-white">Native RSVP support</p>
                                <p className="mt-2 text-white/45">If there is no external registration link, attendees can RSVP on-platform.</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                <p className="font-medium text-white">Moderated before publish</p>
                                <p className="mt-2 text-white/45">Each event is reviewed before it becomes visible in the public calendar.</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/login?redirect=%2Fsubmit-event"
                                className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-white/90"
                            >
                                Sign in to continue
                            </Link>
                            <Link
                                href="/events"
                                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 px-5 text-sm font-medium text-white/75 transition-colors hover:border-white/20 hover:text-white"
                            >
                                Browse events first
                            </Link>
                        </div>
                    </div>
                ) : (
                    <SubmitEventForm initialOrganizerName={initialOrganizerName} />
                )}
            </div>
        </div>
    );
}
