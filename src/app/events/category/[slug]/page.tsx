import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { BreadcrumbJsonLd, ItemListJsonLd } from '@/components/seo';
import { formatDate } from '@/utils/dateUtils';
import { cache } from 'react';
import {
    categoryNameToSlug,
    findCategoryBySlug,
} from '@/utils/categorySlugUtils';
import { SITE_URL } from '@/config/site';
import { CSP_NONCE_HEADER } from '@/lib/security/csp';

export const revalidate = 3600;
export const dynamicParams = true;

interface CategoryPageProps {
    params: Promise<{ slug: string }>;
}

interface CategoryEvent {
    id: string;
    slug: string | null;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    location: string | null;
    event_format: string | null;
    organizer: { name: string } | null;
}

interface EventTypeRow {
    id: string;
    name: string;
    color: string | null;
}

interface EventTypeQueryRow {
    id: string;
    name: string | null;
    color: string | null;
}

const getCategoryData = cache(async (slug: string) => {
    const supabase = await createClient();

    // Resolve category by deterministic slug mapping to avoid wildcard false-negatives.
    const { data: typeRows } = await supabase
        .from('event_type')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name', { ascending: true });

    const resolvedType = findCategoryBySlug<EventTypeQueryRow>(
        typeRows || [],
        slug
    );

    if (!resolvedType || !resolvedType.name) return null;
    const eventType: EventTypeRow = {
        id: resolvedType.id,
        name: resolvedType.name,
        color: resolvedType.color,
    };
    const now = new Date().toISOString();

    // Fetch events and count in parallel
    const [{ data: events }, { count }] = await Promise.all([
        supabase
            .from('events')
            .select(
                'id, slug, title, description, start_time, end_time, location, event_format, organizer:organizer_id(name)'
            )
            .eq('status', 'confirmed')
            .eq('event_type_id', eventType.id)
            .gte('start_time', now)
            .order('start_time', { ascending: true })
            .limit(50),
        supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'confirmed')
            .eq('event_type_id', eventType.id)
            .gte('start_time', now),
    ]);

    return {
        eventType,
        events: (events as unknown as CategoryEvent[]) || [],
        totalCount: count || 0,
    };
});

export async function generateMetadata({
    params,
}: CategoryPageProps): Promise<Metadata> {
    const { slug } = await params;
    const data = await getCategoryData(slug);

    if (!data) {
        return { title: 'Category Not Found' };
    }

    const { eventType, totalCount } = data;
    const title = `${eventType.name} Tech Events 2026 — Upcoming ${eventType.name}s | Kure-Cal`;
    const description = `Browse ${totalCount} upcoming ${eventType.name.toLowerCase()} tech events. Find the best ${eventType.name.toLowerCase()}s for developers and engineers in 2026.`;

    return {
        title,
        description,
        openGraph: {
            title: `${eventType.name} Tech Events 2026 — Upcoming ${eventType.name}s`,
            description,
            type: 'website',
            url: `${SITE_URL}/events/category/${slug}`,
            images: [{ url: `${SITE_URL}/og-image.png` }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${eventType.name} Tech Events 2026`,
            description,
            images: [`${SITE_URL}/og-image.png`],
        },
        alternates: {
            canonical: `${SITE_URL}/events/category/${slug}`,
        },
    };
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) return [];

    const supabase = createServiceClient(supabaseUrl, serviceKey);
    const { data: types } = await supabase
        .from('event_type')
        .select('name')
        .eq('is_active', true);

    if (!types) return [];

    return types
        .filter((t): t is { name: string } => t.name !== null)
        .map((t) => ({ slug: categoryNameToSlug(t.name) }));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { slug } = await params;
    const nonce = (await headers()).get(CSP_NONCE_HEADER) ?? '';
    const data = await getCategoryData(slug);

    if (!data) notFound();

    const { eventType, events, totalCount } = data;

    // Fetch other categories for cross-links
    const supabase = await createClient();
    const { data: allTypes } = await supabase
        .from('event_type')
        .select('name')
        .eq('is_active', true)
        .order('name');

    const otherCategories = (allTypes || [])
        .filter(
            (t): t is { name: string } =>
                t.name !== null && t.name !== eventType.name
        )
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
                    { name: `${eventType.name}s` },
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

            <div className="min-h-screen bg-background-main pb-24">
                <header className="border-b border-border-subtle">
                    <div className="max-w-5xl mx-auto px-6 sm:px-8 py-12">
                        <nav className="flex items-center gap-1.5 text-[11px] text-foreground-tertiary/60 mb-6">
                            <Link
                                href="/events"
                                className="hover:text-foreground-tertiary transition-colors"
                            >
                                Events
                            </Link>
                            <span className="text-foreground-tertiary/30">
                                /
                            </span>
                            <span className="text-foreground-tertiary">
                                {eventType.name}s
                            </span>
                        </nav>

                        <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-foreground-primary leading-tight mb-4">
                            Upcoming {eventType.name} Events
                        </h1>
                        <p className="text-[15px] text-foreground-secondary leading-relaxed max-w-2xl">
                            {totalCount > 0
                                ? `Browse ${totalCount} upcoming ${eventType.name.toLowerCase()} events for developers and engineers. Find the right ${eventType.name.toLowerCase()} to advance your career in 2026.`
                                : `No upcoming ${eventType.name.toLowerCase()} events right now. Check back soon or browse other categories.`}
                        </p>
                    </div>
                </header>

                <main className="max-w-5xl mx-auto px-6 sm:px-8 py-10">
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
                                                {event.event_format && (
                                                    <span className="text-[11px] text-foreground-tertiary/70 shrink-0">
                                                        {event.event_format}
                                                    </span>
                                                )}
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
                        <p className="text-[15px] text-foreground-tertiary/60 italic py-12 text-center">
                            No upcoming events in this category.
                        </p>
                    )}

                    {/* Cross-links to other categories */}
                    {otherCategories.length > 0 && (
                        <section className="mt-16 pt-10 border-t border-border-subtle">
                            <h2 className="text-[11px] font-medium text-foreground-tertiary/70 uppercase tracking-[0.08em] mb-4">
                                Browse Other Categories
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {otherCategories.map((cat) => (
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
