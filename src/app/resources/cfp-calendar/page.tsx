import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { BreadcrumbJsonLd, ItemListJsonLd } from '@/components/seo';
import { formatDate } from '@/utils/dateUtils';
import { SITE_URL } from '@/config/site';
import { CSP_NONCE_HEADER } from '@/lib/security/csp';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Tech Conference CFP Deadlines 2026 — Call for Papers Calendar | Kure-Cal',
    description:
        'Never miss a call for papers deadline. Browse upcoming CFP deadlines for tech conferences, developer summits, and meetups in 2026. Submit your talks on time.',
    openGraph: {
        title: 'Tech Conference CFP Deadlines 2026 — Call for Papers Calendar',
        description:
            'Never miss a call for papers deadline. Browse upcoming CFP deadlines for tech conferences in 2026.',
        type: 'website',
        url: `${SITE_URL}/resources/cfp-calendar`,
        images: [{ url: `${SITE_URL}/og-image.png` }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Tech Conference CFP Deadlines 2026',
        description:
            'Never miss a call for papers deadline. Browse upcoming CFP deadlines for tech conferences in 2026.',
        images: [`${SITE_URL}/og-image.png`],
    },
    alternates: {
        canonical: `${SITE_URL}/resources/cfp-calendar`,
    },
};

interface CfpEvent {
    id: string;
    slug: string | null;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    location: string | null;
    event_format: string | null;
    registration_deadline: string;
    event_type: { name: string } | null;
    organizer: { name: string } | null;
}

export default async function CfpCalendarPage() {
    const nonce = (await headers()).get(CSP_NONCE_HEADER) ?? '';
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data: events, count } = await supabase
        .from('events')
        .select(
            'id, slug, title, description, start_time, end_time, location, event_format, registration_deadline, event_type:event_type_id(name), organizer:organizer_id(name)',
            { count: 'exact' }
        )
        .eq('status', 'confirmed')
        .not('registration_deadline', 'is', null)
        .gte('registration_deadline', now)
        .order('registration_deadline', { ascending: true })
        .limit(100);

    const cfpEvents = (events as unknown as CfpEvent[]) || [];
    const totalCount = count || 0;

    return (
        <>
            <BreadcrumbJsonLd
                nonce={nonce}
                items={[
                    { name: 'Home', url: SITE_URL },
                    { name: 'Resources', url: `${SITE_URL}/resources/tech-events-calendar-2026` },
                    { name: 'CFP Calendar' },
                ]}
            />
            <ItemListJsonLd
                nonce={nonce}
                items={cfpEvents.map((e) => ({
                    title: e.title,
                    startDate: e.start_time,
                    endDate: e.end_time,
                    location: e.location,
                    isOnline: e.event_format === 'Online',
                    description: e.description,
                    url: `${SITE_URL}/events/${e.slug || e.id}`,
                    organizerName: e.organizer?.name,
                }))}
            />

            <div className="responsive-page-shell min-h-[100dvh] bg-background-main pb-16 sm:pb-24">
                <header className="border-b border-border-subtle">
                    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
                        <nav className="flex items-center gap-1.5 text-[11px] text-foreground-tertiary/60 mb-6">
                            <Link
                                href="/resources/tech-events-calendar-2026"
                                className="hover:text-foreground-tertiary transition-colors"
                            >
                                Resources
                            </Link>
                            <span className="text-foreground-tertiary/30">
                                /
                            </span>
                            <span className="text-foreground-tertiary">
                                CFP Calendar
                            </span>
                        </nav>

                        <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-foreground-primary leading-tight mb-4">
                            Call for Papers Deadlines
                        </h1>
                        <p className="text-[15px] text-foreground-secondary leading-relaxed max-w-2xl">
                            {totalCount > 0
                                ? `${totalCount} upcoming CFP deadlines for tech conferences and developer events. Sorted by deadline so you never miss your chance to speak.`
                                : 'No upcoming CFP deadlines right now. Check back soon as new conferences announce their call for papers.'}
                        </p>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                    {cfpEvents.length > 0 ? (
                        <ul className="divide-y divide-border-subtle">
                            {cfpEvents.map((event) => {
                                const eventSlug = event.slug || event.id;
                                const deadlineDate = new Date(event.registration_deadline);
                                const now = new Date();
                                const daysUntilDeadline = Math.ceil(
                                    (deadlineDate.getTime() - now.getTime()) /
                                        (1000 * 60 * 60 * 24)
                                );
                                const isUrgent = daysUntilDeadline <= 7;

                                return (
                                    <li key={event.id}>
                                        <Link
                                            href={`/events/${eventSlug}`}
                                            className="block py-5 group"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                                        <h2 className="text-[15px] font-medium text-foreground-primary transition-colors group-hover:text-accent-primary sm:truncate">
                                                            {event.title}
                                                        </h2>
                                                        {event.event_type && (
                                                            <span className="text-[11px] px-2 py-0.5 rounded-full border border-border-subtle text-foreground-tertiary shrink-0">
                                                                {event.event_type.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[13px] text-foreground-tertiary">
                                                        <span>
                                                            Event:{' '}
                                                            {formatDate(event.start_time)}
                                                        </span>
                                                        {event.location && (
                                                            <>
                                                                <span className="text-foreground-tertiary/30">
                                                                    ·
                                                                </span>
                                                                <span>
                                                                    {event.location}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="shrink-0 text-left sm:text-right">
                                                    <div
                                                        className={`text-[13px] font-medium ${
                                                            isUrgent
                                                                ? 'text-red-400'
                                                                : 'text-foreground-primary'
                                                        }`}
                                                    >
                                                        CFP Deadline:{' '}
                                                        {formatDate(
                                                            event.registration_deadline
                                                        )}
                                                    </div>
                                                    <div
                                                        className={`text-[11px] mt-0.5 ${
                                                            isUrgent
                                                                ? 'text-red-400/70'
                                                                : 'text-foreground-tertiary'
                                                        }`}
                                                    >
                                                        {daysUntilDeadline <= 0
                                                            ? 'Deadline today'
                                                            : `${daysUntilDeadline} day${daysUntilDeadline === 1 ? '' : 's'} left`}
                                                    </div>
                                                </div>
                                            </div>
                                            {event.description && (
                                                <p className="mt-2 text-[13px] text-foreground-tertiary line-clamp-2">
                                                    {event.description.slice(0, 200)}
                                                </p>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-[15px] text-foreground-tertiary/60 italic py-12 text-center">
                            No upcoming CFP deadlines right now.
                        </p>
                    )}

                    {/* Cross-links */}
                    <section className="mt-16 pt-10 border-t border-border-subtle">
                        <h2 className="text-[11px] font-medium text-foreground-tertiary/70 uppercase tracking-[0.08em] mb-4">
                            More Resources
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/resources/tech-events-calendar-2026"
                                className="px-4 py-2 rounded-md border border-border-subtle text-[13px] text-foreground-secondary hover:text-foreground-primary hover:border-border-default transition-colors"
                            >
                                Tech Events Calendar 2026
                            </Link>
                            <Link
                                href="/events"
                                className="px-4 py-2 rounded-md border border-border-subtle text-[13px] text-foreground-secondary hover:text-foreground-primary hover:border-border-default transition-colors"
                            >
                                Browse All Events
                            </Link>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
