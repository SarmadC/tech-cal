import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { BreadcrumbJsonLd, ItemListJsonLd } from '@/components/seo';
import { formatDate } from '@/utils/dateUtils';
import {
    categoryNameToSlug,
    findCityBySlug,
    findCitiesBySlug,
    groupCitiesBySlug,
    slugToCityName,
} from '@/utils/categorySlugUtils';
import { SITE_URL } from '@/config/site';
import { CSP_NONCE_HEADER } from '@/lib/security/csp';

export const revalidate = 3600;
export const dynamicParams = true;

interface CityPageProps {
    params: Promise<{ city: string }>;
}

interface CityEvent {
    id: string;
    slug: string | null;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    location: string | null;
    event_format: string | null;
    event_type: { name: string } | null;
    organizer: { name: string } | null;
}

async function getPublicReadClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
        return createServiceClient(supabaseUrl, serviceKey);
    }

    return await createClient();
}

const getUpcomingCityNames = unstable_cache(
    async () => {
        const supabase = await getPublicReadClient();
        const now = new Date().toISOString();

        const { data: cityRows } = await supabase
            .from('events')
            .select('location_city')
            .eq('status', 'confirmed')
            .not('location_city', 'is', null)
            .gte('start_time', now);

        if (!cityRows) return [];

        return Array.from(
            new Set(
                cityRows
                    .map((r) => (r as { location_city: string | null }).location_city)
                    .filter((c): c is string => c !== null && c.trim() !== '')
            )
        );
    },
    ['seo-upcoming-city-names'],
    { revalidate: 3600 }
);

const getCityData = cache(async (citySlug: string) => {
    const supabase = await getPublicReadClient();
    const now = new Date().toISOString();

    const uniqueCities = await getUpcomingCityNames();
    const matchedCities = findCitiesBySlug(uniqueCities, citySlug);
    const matchedCity = findCityBySlug(matchedCities, citySlug);

    if (!matchedCity || matchedCities.length === 0) return null;

    // Fetch events and count in parallel across all DB city variants that collapse to this slug.
    const [{ data: events }, { count }] = await Promise.all([
        supabase
            .from('events')
            .select(
                'id, slug, title, description, start_time, end_time, location, event_format, event_type:event_type_id(name), organizer:organizer_id(name)'
            )
            .eq('status', 'confirmed')
            .in('location_city', matchedCities)
            .gte('start_time', now)
            .order('start_time', { ascending: true })
            .limit(50),
        supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'confirmed')
            .in('location_city', matchedCities)
            .gte('start_time', now),
    ]);

    return {
        cityName: matchedCity,
        events: (events as unknown as CityEvent[]) || [],
        totalCount: count || 0,
    };
});

export async function generateMetadata({
    params,
}: CityPageProps): Promise<Metadata> {
    const { city } = await params;
    const data = await getCityData(city);
    const cityName = data?.cityName || slugToCityName(city);
    const totalCount = data?.totalCount || 0;

    const title = `Tech Events in ${cityName} 2026 — Conferences & Meetups | Kure-Cal`;
    const description = `Discover ${totalCount} upcoming tech events in ${cityName}. Browse conferences, meetups, hackathons, and workshops for developers in ${cityName}.`;

    return {
        title,
        description,
        openGraph: {
            title: `Tech Events in ${cityName} 2026 — Conferences & Meetups`,
            description,
            type: 'website',
            url: `${SITE_URL}/events/cities/${city}`,
            images: [{ url: `${SITE_URL}/og-image.png` }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `Tech Events in ${cityName} 2026`,
            description,
            images: [`${SITE_URL}/og-image.png`],
        },
        alternates: {
            canonical: `${SITE_URL}/events/cities/${city}`,
        },
    };
}

export async function generateStaticParams(): Promise<{ city: string }[]> {
    const uniqueCities = await getUpcomingCityNames();

    return groupCitiesBySlug(uniqueCities).map(({ citySlug }) => ({ city: citySlug }));
}

export default async function CityPage({ params }: CityPageProps) {
    const { city } = await params;
    const nonce = (await headers()).get(CSP_NONCE_HEADER) || undefined;
    const data = await getCityData(city);

    if (!data) notFound();

    const { cityName, events, totalCount } = data;

    // Fetch categories for cross-links
    const supabase = await createClient();
    const { data: types } = await supabase
        .from('event_type')
        .select('name')
        .eq('is_active', true)
        .order('name');

    const categories = (types || [])
        .filter((t): t is { name: string } => t.name !== null)
        .map((t) => ({
            name: t.name,
            slug: categoryNameToSlug(t.name),
        }));

    return (
        <>
            <BreadcrumbJsonLd
                nonce={nonce}
                items={[
                    { name: 'Home', url: SITE_URL },
                    { name: 'Events', url: `${SITE_URL}/events` },
                    { name: 'Cities', url: `${SITE_URL}/events/cities` },
                    { name: cityName },
                ]}
            />
            <ItemListJsonLd
                nonce={nonce}
                items={events.map((e) => ({
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

            <div className="responsive-page-shell min-h-[100dvh] bg-background-main pb-16 lg:pb-24">
                <header className="border-b border-border-subtle">
                    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
                        <nav className="flex items-center gap-1.5 text-[11px] text-foreground-tertiary/60 mb-6">
                            <Link
                                href="/"
                                className="hover:text-foreground-tertiary transition-colors"
                            >
                                Home
                            </Link>
                            <span className="text-foreground-tertiary/30">
                                /
                            </span>
                            <Link
                                href="/events"
                                className="hover:text-foreground-tertiary transition-colors"
                            >
                                Events
                            </Link>
                            <span className="text-foreground-tertiary/30">
                                /
                            </span>
                            <Link
                                href="/events/cities"
                                className="hover:text-foreground-tertiary transition-colors"
                            >
                                Cities
                            </Link>
                            <span className="text-foreground-tertiary/30">
                                /
                            </span>
                            <span className="text-foreground-tertiary">
                                {cityName}
                            </span>
                        </nav>

                        <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-foreground-primary leading-tight mb-4">
                            Tech Events in {cityName}
                        </h1>
                        <p className="text-[15px] text-foreground-secondary leading-relaxed max-w-2xl">
                            {totalCount > 0
                                ? `Discover ${totalCount} upcoming tech events in ${cityName}. From conferences to meetups, find the best developer events happening near you.`
                                : `No upcoming tech events in ${cityName} right now. Check back soon or browse events in other cities.`}
                        </p>
                        <div className="mt-5">
                            <Link
                                href="/events/cities"
                                className="inline-flex items-center rounded-lg border border-border-subtle px-4 py-2 text-sm text-foreground-secondary transition-colors hover:border-border-default hover:text-foreground-primary"
                            >
                                Browse all cities
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                    {events.length > 0 ? (
                        <ul className="divide-y divide-border-subtle">
                            {events.map((event) => {
                                const eventSlug =
                                    event.slug || event.id;
                                return (
                                    <li key={event.id}>
                                        <Link
                                            href={`/events/${eventSlug}`}
                                            className="block py-5 group"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h2 className="text-[15px] font-medium text-foreground-primary group-hover:text-accent-primary transition-colors truncate">
                                                        {event.title}
                                                    </h2>
                                                    <div className="flex items-center gap-2 mt-1 text-[13px] text-foreground-tertiary">
                                                        <time
                                                            dateTime={
                                                                event.start_time
                                                            }
                                                        >
                                                            {formatDate(
                                                                event.start_time
                                                            )}
                                                        </time>
                                                        {event.location && (
                                                            <>
                                                                <span className="text-foreground-tertiary/30">
                                                                    ·
                                                                </span>
                                                                <span>
                                                                    {
                                                                        event.location
                                                                    }
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {event.event_type && (
                                                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-border-subtle text-foreground-tertiary">
                                                            {
                                                                event.event_type
                                                                    .name
                                                            }
                                                        </span>
                                                    )}
                                                    {event.event_format && (
                                                        <span className="text-[11px] text-foreground-tertiary/70">
                                                            {
                                                                event.event_format
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {event.description && (
                                                <p className="mt-2 text-[13px] text-foreground-tertiary line-clamp-2">
                                                    {event.description.slice(
                                                        0,
                                                        200
                                                    )}
                                                </p>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-[15px] text-foreground-tertiary/60 italic">
                                No upcoming events in this city.
                            </p>
                            <Link
                                href="/events/cities"
                                className="mt-4 inline-flex items-center rounded-lg border border-border-subtle px-4 py-2 text-sm text-foreground-secondary transition-colors hover:border-border-default hover:text-foreground-primary"
                            >
                                Browse all cities
                            </Link>
                        </div>
                    )}

                    {/* Cross-links to category pages */}
                    {categories.length > 0 && (
                        <section className="mt-16 pt-10 border-t border-border-subtle">
                            <h2 className="text-[11px] font-medium text-foreground-tertiary/70 uppercase tracking-[0.08em] mb-4">
                                Browse by Category
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {categories.map((cat) => (
                                    <Link
                                        key={cat.slug}
                                        href={`/events/category/${cat.slug}`}
                                        className="px-3 py-1.5 rounded-md border border-border-subtle text-[13px] text-foreground-secondary hover:text-foreground-primary hover:border-border-default transition-colors"
                                    >
                                        {cat.name}s
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </>
    );
}
