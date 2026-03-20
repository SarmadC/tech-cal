import { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { EventJsonLd, BreadcrumbJsonLd } from '@/components/seo';
import { formatDate, formatMonthYear } from '@/utils/dateUtils';
import { transformAgendaItemsToApp } from '@/utils/transformers';
import { EventAgendaSection } from '@/components/events/EventAgendaSection';
import type { AgendaItem } from '@/types';
import {
    ArrowSquareOut
} from '@phosphor-icons/react/dist/ssr';
import BookmarkEventButton from '@/components/events/BookmarkEventButton';
import AttendanceEventButton from '@/components/events/AttendanceEventButton';
import { ShareButtons } from '@/components/social/ShareButtons';
import WhosGoingSection from '@/components/events/WhosGoingSection';
import { SITE_URL } from '@/config/site';
import PublicEventMoreActions from '@/components/events/PublicEventMoreActions';
import PublicEventShortcuts from '@/components/events/PublicEventShortcuts';
import { CSP_NONCE_HEADER } from '@/lib/security/csp';

// ISR: Revalidate every hour for fresh event data
export const revalidate = 3600;

interface EventPageProps {
    params: Promise<{ slug: string }>;
}

// Minimal interface for the DB agenda item (snake_case from database)
interface DbAgendaItem {
    id: string;
    start_time: string;
    end_time: string | null;
    title: string;
    description: string | null;
    location: string | null;
    agenda_type: string | null;
    track: string | null;
    topics: string[] | null;
}

// Explicit type for public event data
interface PublicEvent {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    location: string | null;
    source_url: string | null;
    registration_url: string | null;
    livestream_url: string | null;
    event_image_url: string | null;
    price_range: string | null;
    price_min: number | null;
    price_max: number | null;
    currency: string | null;
    event_format: string | null;
    difficulty: string | null;
    target_audience: string | null;
    status: string;
    event_type: { id: string; name: string; color: string } | null;
    organizer: { id: string; name: string; logo_url?: string } | null;
    agenda: DbAgendaItem[];
    series: { id: string; name: string; description: string | null; website_url: string | null } | null;
    series_id: string | null;
}

// Explicit type for other events in the series
interface SeriesEvent {
    id: string;
    slug: string;
    title: string;
    start_time: string;
    end_time: string | null;
    location: string | null;
}

// UUID v4 regex pattern for legacy link detection
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Base select query for public event data
const EVENT_SELECT_QUERY = `
    id,
    slug,
    title,
    description,
    start_time,
    end_time,
    location,
    source_url,
    registration_url,
    livestream_url,
    event_image_url,
    price_min,
    price_max,
    currency,
    event_format,
    difficulty:difficulty_level,
    target_audience,
    status,
    series_id,
    series:event_series(id, name, description, website_url),
    event_type:event_type_id(id, name, color),
    organizer:organizer_id(id, name, logo_url),
    agenda:event_agenda(*)
`;

async function getPublicReadClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
        return createServiceClient(supabaseUrl, serviceKey);
    }

    return await createClient();
}

import { extractIdFromSlug } from '@/utils/slugUtils';

// Fetch event by slug with fallback to UUID lookup for legacy links or composite slugs
async function getEventBySlug(slug: string): Promise<{ event: PublicEvent; shouldRedirect: boolean; otherEventsInSeries: SeriesEvent[] } | null> {
    const supabase = await getPublicReadClient();

    // 1. Try exact slug match first (fastest, most common)
    const { data: eventData, error } = await supabase
        .from('events')
        .select(EVENT_SELECT_QUERY)
        .eq('slug' as never, slug)
        .eq('status', 'confirmed')
        .single();

    if (!error && eventData) {
        const event = eventData as unknown as PublicEvent;

        // Debug logging
        console.log(`[EventPage] Found event by slug: ${slug}, ID: ${event.id}`);
        console.log(`[EventPage] Agenda items count: ${event.agenda?.length || 0}`);

        // Fallback: If agenda is empty, try explicit fetch
        if (!event.agenda || event.agenda.length === 0) {
            console.log(`[EventPage] Agenda empty, attempting explicit fetch for event ${event.id}`);
            const { data: explicitAgenda } = await supabase
                .from('event_agenda')
                .select('*')
                .eq('event_id', event.id)
                .order('start_time', { ascending: true });

            if (explicitAgenda && explicitAgenda.length > 0) {
                console.log(`[EventPage] Found ${explicitAgenda.length} agenda items via explicit fetch`);
                event.agenda = explicitAgenda;
            }
        }

        // Fetch other events in the same series, if applicable
        let otherEventsInSeries: SeriesEvent[] = [];
        if (event.series_id) {
            const { data: relatedEvents } = await supabase
                .from('events')
                .select('id, slug, title, start_time, end_time, location')
                .eq('series_id', event.series_id)
                .eq('status', 'confirmed')
                .neq('id', event.id)
                .order('start_time', { ascending: true })
                .limit(5);

            if (relatedEvents) {
                otherEventsInSeries = relatedEvents as unknown as SeriesEvent[];
            }
        }

        return { event, shouldRedirect: false, otherEventsInSeries };
    }

    // 2. Try extracting ID from composite slug (title--id) or checking if it's a raw UUID
    const extractedId = extractIdFromSlug(slug);

    // Only proceed if we have a valid UUID (extractIdFromSlug returns the input if extraction fails)
    if (UUID_REGEX.test(extractedId)) {
        const { data: eventById, error: idError } = await supabase
            .from('events')
            .select(EVENT_SELECT_QUERY)
            .eq('id', extractedId)
            .eq('status', 'confirmed')
            .single();

        if (!idError && eventById) {
            const event = eventById as unknown as PublicEvent;

            // Found by ID (either raw UUID or extracted from composite)
            // We should redirect to the canonical slug URL to clean up the browser bar
            return { event, shouldRedirect: true, otherEventsInSeries: [] };
        }
    }

    return null;
}

// Generate metadata dynamically for SEO
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
    const { slug } = await params;
    const result = await getEventBySlug(slug);

    if (!result) {
        return {
            title: 'Event Not Found',
        };
    }

    const { event } = result;
    const eventDate = formatMonthYear(new Date(event.start_time));
    const locationPart = event.location ? ` in ${event.location}` : '';
    const typePart = event.event_type?.name ? ` ${event.event_type.name}` : ' tech event';
    const description = event.description
        ? event.description.slice(0, 160) + (event.description.length > 160 ? '...' : '')
        : `${event.title} is a${typePart} happening ${event.start_time ? 'on ' + formatDate(event.start_time) : 'soon'}${locationPart}. Browse the schedule, register, and add it to your calendar.`;

    const ogImage = event.event_image_url || `${SITE_URL}/og-image.png`;

    return {
        title: `${event.title} - ${eventDate}`,
        description,
        openGraph: {
            title: `${event.title} - ${eventDate}`,
            description,
            type: 'website',
            url: `${SITE_URL}/events/${event.slug}`,
            images: [{ url: ogImage }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${event.title} - ${eventDate}`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: `${SITE_URL}/events/${event.slug}`,
            languages: {
                en: `${SITE_URL}/events/${event.slug}`,
                'x-default': `${SITE_URL}/events/${event.slug}`,
            },
        },
    };
}

// Enable dynamic params with ISR - pages are generated on-demand and cached
// This is more efficient than pre-rendering 300+ event pages at build time
export const dynamicParams = true;

// Pre-render top 50 most recent confirmed events at build time for faster TTFB
export async function generateStaticParams(): Promise<{ slug: string }[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return [];
    }

    const supabase = createServiceClient(supabaseUrl, serviceKey);

    const { data: events } = await supabase
        .from('events')
        .select('slug')
        .eq('status', 'confirmed')
        .not('slug', 'is', null)
        .order('start_time', { ascending: false })
        .limit(50);

    return (events || [])
        .filter((e): e is { slug: string } => e.slug !== null)
        .map((e) => ({ slug: e.slug }));
}

import { getLogoUrlFromInput } from '@/utils/logoUtils';

export default async function PublicEventPage({ params }: EventPageProps) {
    const { slug } = await params;
    const nonce = (await headers()).get(CSP_NONCE_HEADER) ?? '';
    const result = await getEventBySlug(slug);

    if (!result) {
        notFound();
    }

    const { event, shouldRedirect, otherEventsInSeries } = result;

    // 301 redirect legacy UUID links to canonical slug URL
    if (shouldRedirect && event.slug) {
        redirect(`/events/${event.slug}`);
    }

    const eventType = event.event_type as { id: string; name: string; color: string } | null;
    const rawOrganizer = event.organizer as { id: string; name: string; logo_url?: string } | null;
    const organizer = rawOrganizer ? {
        ...rawOrganizer,
        logo_url: getLogoUrlFromInput(rawOrganizer.logo_url, rawOrganizer.name)
    } : null;

    const eventUrl = `${SITE_URL}/events/${event.slug}`;

    return (
        <>
            {/* JSON-LD Structured Data for Google Rich Results */}
            <EventJsonLd
                nonce={nonce}
                name={event.title}
                description={event.description || ''}
                startDate={event.start_time}
                endDate={event.end_time || undefined}
                location={event.location ? { name: event.location } : undefined}
                url={eventUrl}
                imageUrl={event.event_image_url || undefined}
                isOnline={event.event_format === 'Online'}
                organizer={organizer ? { name: organizer.name, logo_url: organizer.logo_url } : undefined}
                offers={{
                    priceMin: event.price_min,
                    priceMax: event.price_max,
                    currency: event.currency,
                }}
            />
            <BreadcrumbJsonLd
                nonce={nonce}
                items={[
                    { name: 'Home', url: SITE_URL },
                    { name: 'Events', url: `${SITE_URL}/events` },
                    { name: event.title },
                ]}
            />

            <div className="responsive-page-shell min-h-[100dvh] bg-background-main pb-[calc(var(--mobile-app-tabbar-offset)+0.5rem)] selection:bg-accent-primary/20 selection:text-accent-primary lg:pb-24">

                {/* Header - Linear-inspired minimal */}
                <header className="sticky top-0 z-40 bg-background-main/95 backdrop-blur-md border-b border-border-subtle pt-5 pb-5">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {/* Minimal Breadcrumb */}
                        <nav className="flex items-center gap-1.5 text-[11px] text-foreground-tertiary/60 mb-5">
                            <Link href="/events" className="hover:text-foreground-tertiary transition-colors">
                                Events
                            </Link>
                            <span className="text-foreground-tertiary/30">/</span>
                            <span className="text-foreground-tertiary truncate max-w-[200px]">{event.title}</span>
                        </nav>

                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                            <div className="flex-1 min-w-0">
                                {/* Clean Title */}
                                <h1 className="text-2xl md:text-[28px] font-semibold tracking-[-0.02em] text-foreground-primary leading-tight mb-3">
                                    {event.title}
                                </h1>

                                {/* Text-only Meta with dot separators */}
                                <div className="flex flex-wrap items-center text-[13px] text-foreground-tertiary">
                                    {event.start_time && (
                                        <span>{formatDate(event.start_time)}</span>
                                    )}
                                    {event.location && (
                                        <>
                                            <span className="mx-3 text-foreground-tertiary/30">·</span>
                                            <span>{event.location}</span>
                                        </>
                                    )}
                                    {event.event_format && (
                                        <>
                                            <span className="mx-3 text-foreground-tertiary/30">·</span>
                                            <span>{event.event_format}</span>
                                        </>
                                    )}
                                </div>
                            </div>


                        </div>
                    </div>
                </header>

                {/* Body Layout - Generous spacing */}
                <main className="mx-auto grid max-w-7xl grid-cols-1 gap-x-6 gap-y-12 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-12 lg:gap-y-16 lg:px-8">

                    {/* Left Column */}
                    <div className="space-y-12 min-w-0 lg:col-span-8">

                        {/* Section: Overview */}
                        <section>
                            <h2 className="text-sm font-semibold text-foreground-secondary mb-6">
                                Overview
                            </h2>
                            <div className="text-[15px] text-foreground-secondary leading-[1.7] max-w-prose">
                                {event.description ? (
                                    <p className="whitespace-pre-wrap">{event.description}</p>
                                ) : (
                                    <p className="text-foreground-tertiary/60 italic">No description available.</p>
                                )}
                            </div>
                        </section>

                        {/* Section: Details */}
                        {(event.price_range || event.target_audience || event.difficulty) && (
                            <section>
                                <h2 className="text-sm font-semibold text-foreground-secondary mb-6">
                                    Details
                                </h2>
                                <dl className="space-y-0">
                                    {event.price_range && (
                                        <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                                            <dt className="text-[13px] text-foreground-tertiary/70">Price</dt>
                                            <dd className="text-[13px] text-foreground-primary">{event.price_range}</dd>
                                        </div>
                                    )}
                                    {event.target_audience && (
                                        <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                                            <dt className="text-[13px] text-foreground-tertiary/70">Audience</dt>
                                            <dd className="text-[13px] text-foreground-primary text-right max-w-[55%] truncate">
                                                {event.target_audience}
                                            </dd>
                                        </div>
                                    )}
                                    {event.difficulty && (
                                        <div className="flex items-center justify-between py-3 border-b border-border-subtle last:border-b-0">
                                            <dt className="text-[13px] text-foreground-tertiary/70">Level</dt>
                                            <dd className="text-[13px] text-foreground-primary capitalize">{event.difficulty}</dd>
                                        </div>
                                    )}
                                </dl>
                            </section>
                        )}
                    </div>

                    {/* Right Rail - Linear-inspired */}
                    <aside className="hidden lg:block lg:col-span-4">
                        <div className="rounded-lg border border-border-subtle bg-background-secondary/80 p-3 shadow-sm space-y-6">
                            {/* Primary & Secondary Actions Combined */}
                            <div className="flex flex-col gap-3">
                                {event.registration_url && (
                                    <a
                                        href={event.registration_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex w-full items-center justify-between h-10 px-3 rounded-md bg-[var(--accent-tertiary)] text-white hover:bg-[var(--accent-tertiary-hover)] text-[13px] font-semibold transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            Register on website
                                            <ArrowSquareOut className="w-3.5 h-3.5 opacity-60" />
                                        </div>
                                        <span className="text-[10px] font-medium rounded-sm border border-white/15 bg-white/10 text-white/90 px-1.5 min-w-[18px] text-center shadow-sm">R</span>
                                    </a>
                                )}

                                <div className="flex items-center gap-2">
                                    <div className="relative group">
                                        <AttendanceEventButton
                                            eventId={event.id}
                                            loginRedirect={`/events/${event.slug}`}
                                        />
                                        <span className="absolute -bottom-1 -right-1 hidden group-hover:flex items-center justify-center text-[8px] rounded w-3 h-3 border border-border-subtle bg-background-main text-foreground-tertiary pointer-events-none">A</span>
                                    </div>
                                    <div className="relative group">
                                        <BookmarkEventButton
                                            eventId={event.id}
                                            event={{
                                                id: event.id,
                                                title: event.title,
                                                startTime: event.start_time,
                                                location: event.location,
                                                eventType: event.event_type?.name || null,
                                                organizer: event.organizer?.name || null
                                            }}
                                            loginRedirect={`/events/${event.slug}`}
                                        />
                                        <span className="absolute -bottom-1 -right-1 hidden group-hover:flex items-center justify-center text-[8px] rounded w-3 h-3 border border-border-subtle bg-background-main text-foreground-tertiary pointer-events-none">B</span>
                                    </div>
                                    <PublicEventShortcuts
                                        eventId={event.id}
                                        slug={event.slug}
                                        registrationUrl={event.registration_url}
                                        eventData={{
                                            id: event.id,
                                            title: event.title,
                                            startTime: event.start_time,
                                            location: event.location,
                                            eventType: event.event_type?.name || null,
                                            organizer: event.organizer?.name || null
                                        }}
                                    />
                                    <PublicEventMoreActions
                                        eventId={event.id} slug={event.slug} title={event.title} />
                                </div>
                            </div>

                            {/* Metadata Section - No dividers, small muted labels */}
                            <div className="space-y-4 px-1">
                                {organizer && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] text-foreground-tertiary">Organizer</span>
                                        <span className="flex items-center gap-2 text-[12px] text-foreground-primary font-medium">
                                            {organizer.logo_url && (
                                                <Image
                                                    src={organizer.logo_url}
                                                    alt={`${organizer.name} logo`}
                                                    width={16}
                                                    height={16}
                                                    className="h-4 w-4 object-contain opacity-90"
                                                />
                                            )}
                                            <span>{organizer.name}</span>
                                        </span>
                                    </div>
                                )}

                                {eventType && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] text-foreground-tertiary">Type</span>
                                        <span className="text-[12px] text-foreground-primary font-medium">{eventType.name}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <span className="text-[12px] text-foreground-tertiary">Share</span>
                                    <ShareButtons url={eventUrl} title={event.title} />
                                </div>
                            </div>

                            <div className="px-1 pt-2">
                                <WhosGoingSection eventId={event.id} />
                            </div>

                            {/* Series Events Section */}
                            {event.series && otherEventsInSeries && otherEventsInSeries.length > 0 && (
                                <div className="mt-8 border-t border-border-subtle pt-6">
                                    <h3 className="text-[13px] font-semibold text-foreground-primary mb-3">
                                        More from {event.series.name}
                                    </h3>
                                    <div className="space-y-3">
                                        {otherEventsInSeries.map((seriesEvent) => (
                                            <Link
                                                key={seriesEvent.id}
                                                href={`/events/${seriesEvent.slug}`}
                                                className="group block p-2.5 -mx-2.5 rounded-md hover:bg-background-main/50 transition-colors border border-transparent hover:border-border-subtle/50"
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[13px] font-medium text-foreground-primary group-hover:text-accent-tertiary transition-colors truncate">
                                                        {seriesEvent.location ? seriesEvent.location : seriesEvent.title}
                                                    </span>
                                                    <div className="flex items-center text-[11px] text-foreground-tertiary">
                                                        <span>{formatDate(seriesEvent.start_time)}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    {event.series.website_url && (
                                        <div className="mt-4 pt-4 border-t border-border-subtle/50 text-center">
                                            <a
                                                href={event.series.website_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[12px] text-accent-tertiary hover:underline inline-flex items-center gap-1"
                                            >
                                                Visit Series Website
                                                <ArrowSquareOut className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Section: Schedule */}
                    <section className="lg:col-span-12">
                        {(() => {
                            // Transform agenda from database format (snake_case) to app format (camelCase)
                            const transformedAgenda: AgendaItem[] = transformAgendaItemsToApp(event.agenda || []);

                            // Create an event object that matches what EventAgendaSection expects
                            const eventWithAgenda = {
                                id: event.id,
                                title: event.title,
                                description: event.description || '',
                                startTime: event.start_time,
                                endTime: event.end_time,
                                timezone: null,
                                organizer: event.organizer?.name || '',
                                location: event.location || '',
                                status: event.status,
                                sourceUrl: event.source_url || '',
                                livestreamUrl: event.livestream_url,
                                eventTypeId: event.event_type?.id || '',
                                createdAt: '',
                                agenda: transformedAgenda,
                            };

                            if (transformedAgenda.length === 0) {
                                return (
                                    <>
                                        <h2 className="text-sm font-semibold text-foreground-secondary mb-6">
                                            Schedule
                                        </h2>
                                        <p className="text-[13px] text-foreground-tertiary/60 italic">No schedule available for this event.</p>
                                    </>
                                );
                            }

                            return (
                                <>
                                    <EventAgendaSection event={eventWithAgenda} timezone={null} title="Schedule" />
                                </>
                            );
                        })()}
                    </section>
                </main>

                {/* Mobile Sticky Bottom Bar */}
                <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle bg-background-main/95 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-md lg:hidden">
                    <div className="mx-auto flex max-w-md gap-2">
                        <AttendanceEventButton
                            eventId={event.id}
                            loginRedirect={`/events/${event.slug}`}
                            variant="mobile"
                        />
                        {event.source_url && (
                            <a
                                href={event.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-11 px-4 flex items-center justify-center border border-border-default rounded-lg text-foreground-secondary text-[14px]"
                            >
                                Website
                            </a>
                        )}
                        <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(eventUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Share on X"
                            className="h-11 w-11 flex items-center justify-center border border-border-default rounded-lg text-foreground-secondary"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zM16.482 19.333h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
