// src/app/events/[slug]/page.tsx
// Public SEO-optimized event page with dynamic metadata and JSON-LD

import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { EventJsonLd, BreadcrumbJsonLd } from '@/components/seo';
import { formatDate, formatMonthYear } from '@/utils/dateUtils';

// ISR: Revalidate every hour for fresh event data
export const revalidate = 3600;

interface EventPageProps {
    params: Promise<{ slug: string }>;
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
    price_range,
    price_min,
    price_max,
    currency,
    event_format,
    difficulty,
    target_audience,
    status,
    event_type:event_type_id(id, name, color),
    organizer:organizer_id(id, name, logo_url)
`;

async function getPublicReadClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
        return createServiceClient(supabaseUrl, serviceKey);
    }

    return await createClient();
}

// Fetch event by slug with fallback to UUID lookup for legacy links
async function getEventBySlug(slug: string): Promise<{ event: PublicEvent; shouldRedirect: boolean } | null> {
    const supabase = await getPublicReadClient();

    // First, try to find by slug
    const { data: event, error } = await supabase
        .from('events')
        .select(EVENT_SELECT_QUERY)
        .eq('slug' as never, slug)
        .eq('status', 'confirmed')
        .single();

    if (!error && event) {
        return { event: event as unknown as PublicEvent, shouldRedirect: false };
    }

    // If slug lookup failed, check if the param is a UUID (legacy link)
    if (UUID_REGEX.test(slug)) {
        const { data: eventById, error: idError } = await supabase
            .from('events')
            .select(EVENT_SELECT_QUERY)
            .eq('id', slug)
            .eq('status', 'confirmed')
            .single();

        if (!idError && eventById) {
            // Found by UUID - return with redirect flag for 301 to canonical slug URL
            return { event: eventById as unknown as PublicEvent, shouldRedirect: true };
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
    const description = event.description
        ? event.description.slice(0, 160) + (event.description.length > 160 ? '...' : '')
        : `Join ${event.title} - a tech event happening ${event.start_time ? 'on ' + formatDate(event.start_time) : 'soon'}.`;

    const ogImage = event.event_image_url || 'https://kure-cal.com/og-default.png';

    return {
        title: `${event.title} - ${eventDate} | Kure-Cal`,
        description,
        openGraph: {
            title: `${event.title} - ${eventDate}`,
            description,
            type: 'website',
            url: `https://kure-cal.com/events/${event.slug}`,
            images: [{ url: ogImage }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${event.title} - ${eventDate}`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: `https://kure-cal.com/events/${event.slug}`,
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

export default async function PublicEventPage({ params }: EventPageProps) {
    const { slug } = await params;
    const result = await getEventBySlug(slug);

    if (!result) {
        notFound();
    }

    const { event, shouldRedirect } = result;

    // 301 redirect legacy UUID links to canonical slug URL
    if (shouldRedirect && event.slug) {
        redirect(`/events/${event.slug}`);
    }

    const eventType = event.event_type as { id: string; name: string; color: string } | null;
    const organizer = event.organizer as { id: string; name: string; logo_url?: string } | null;

    const eventUrl = `https://kure-cal.com/events/${event.slug}`;

    return (
        <>
            {/* JSON-LD Structured Data for Google Rich Results */}
            <EventJsonLd
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
                items={[
                    { name: 'Home', url: 'https://kure-cal.com' },
                    { name: 'Events', url: 'https://kure-cal.com/discover' },
                    { name: event.title },
                ]}
            />

            <div className="min-h-screen bg-background-main pt-20">
                {/* Hero Section */}
                <section className="py-12 px-6 bg-background-secondary border-b border-border-color">
                    <div className="max-w-4xl mx-auto">
                        {/* Breadcrumb */}
                        <nav className="mb-6 text-sm text-foreground-tertiary">
                            <Link href="/" className="hover:text-accent-primary">Home</Link>
                            <span className="mx-2">/</span>
                            <Link href="/discover" className="hover:text-accent-primary">Events</Link>
                            <span className="mx-2">/</span>
                            <span className="text-foreground-secondary">{event.title}</span>
                        </nav>

                        {/* Event Type Badge */}
                        {eventType && (
                            <span
                                className="inline-block px-3 py-1 text-xs font-medium rounded-full mb-4"
                                style={{ backgroundColor: eventType.color + '20', color: eventType.color }}
                            >
                                {eventType.name}
                            </span>
                        )}

                        <h1 className="text-3xl md:text-4xl font-bold text-foreground-primary mb-4">
                            {event.title}
                        </h1>

                        {/* Event Meta */}
                        <div className="flex flex-wrap gap-4 text-foreground-secondary mb-6">
                            {event.start_time && (
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{formatDate(event.start_time)}</span>
                                </div>
                            )}
                            {event.location && (
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{event.location}</span>
                                </div>
                            )}
                            {event.event_format && (
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-xs bg-accent-primary/10 text-accent-primary rounded">
                                        {event.event_format}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-3">
                            {event.registration_url && (
                                <a
                                    href={event.registration_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-6 py-3 bg-accent-primary hover:bg-accent-primary-hover text-accent-primary-foreground font-semibold rounded-lg transition-colors"
                                >
                                    Register Now
                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            )}
                            {event.source_url && (
                                <a
                                    href={event.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-6 py-3 border border-border-default hover:border-accent-primary text-foreground-primary font-medium rounded-lg transition-colors"
                                >
                                    Visit Website
                                </a>
                            )}
                            <Link
                                href="/login?redirect=/discover"
                                className="inline-flex items-center px-6 py-3 border border-border-default hover:border-accent-primary text-foreground-primary font-medium rounded-lg transition-colors"
                            >
                                Track This Event
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Event Details */}
                <section className="py-12 px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="md:col-span-2">
                                <h2 className="text-xl font-semibold text-foreground-primary mb-4">About This Event</h2>
                                <div className="prose prose-invert max-w-none text-foreground-secondary">
                                    {event.description ? (
                                        <p className="whitespace-pre-wrap">{event.description}</p>
                                    ) : (
                                        <p>No description available for this event.</p>
                                    )}
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Organizer */}
                                {organizer && (
                                    <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                                        <h3 className="text-sm font-medium text-foreground-tertiary mb-3">Organized by</h3>
                                        <div className="flex items-center gap-3">
                                            {organizer.logo_url && (
                                                <img src={organizer.logo_url} alt={organizer.name} className="w-10 h-10 rounded-full object-cover" />
                                            )}
                                            <span className="font-medium text-foreground-primary">{organizer.name}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Quick Info */}
                                <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
                                    <h3 className="text-sm font-medium text-foreground-tertiary mb-4">Event Details</h3>
                                    <dl className="space-y-3 text-sm">
                                        {event.price_range && (
                                            <div>
                                                <dt className="text-foreground-tertiary">Price</dt>
                                                <dd className="font-medium text-foreground-primary">{event.price_range}</dd>
                                            </div>
                                        )}
                                        {event.difficulty && (
                                            <div>
                                                <dt className="text-foreground-tertiary">Level</dt>
                                                <dd className="font-medium text-foreground-primary capitalize">{event.difficulty}</dd>
                                            </div>
                                        )}
                                        {event.target_audience && (
                                            <div>
                                                <dt className="text-foreground-tertiary">Audience</dt>
                                                <dd className="font-medium text-foreground-primary">{event.target_audience}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>

                                {/* CTA Card */}
                                <div className="bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 rounded-xl p-6 border border-accent-primary/20">
                                    <h3 className="font-semibold text-foreground-primary mb-2">Never miss an event</h3>
                                    <p className="text-sm text-foreground-secondary mb-4">Sign up to track this event and get personalized recommendations.</p>
                                    <Link
                                        href="/signup"
                                        className="block w-full text-center px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-accent-primary-foreground font-medium rounded-lg transition-colors"
                                    >
                                        Get Started Free
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
