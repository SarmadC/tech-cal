import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { BreadcrumbJsonLd } from '@/components/seo';
import { cityNameToSlug } from '@/utils/categorySlugUtils';
import { SITE_URL } from '@/config/site';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr';
import { AnimatedHero } from './AnimatedHero';
import { InteractiveGlobeSection } from './InteractiveGlobeSection';
import { CategoryBarChart } from './category-bar-chart';
import { PriceHistogram } from './PriceHistogram';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'The Complete Tech Events Calendar for 2026 | Kure-Cal',
    description:
        'Browse every tech conference, developer meetup, hackathon, and workshop happening in 2026. The definitive resource for planning your tech events calendar — updated daily.',
    openGraph: {
        title: 'The Complete Tech Events Calendar for 2026',
        description:
            'Browse every tech conference, developer meetup, hackathon, and workshop happening in 2026. Updated daily.',
        type: 'website',
        url: `${SITE_URL}/resources/tech-events-calendar-2026`,
        images: [{ url: `${SITE_URL}/og-image.png` }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'The Complete Tech Events Calendar for 2026',
        description:
            'Browse every tech conference, developer meetup, hackathon, and workshop happening in 2026.',
        images: [`${SITE_URL}/og-image.png`],
    },
    alternates: {
        canonical: `${SITE_URL}/resources/tech-events-calendar-2026`,
    },
};

interface CategoryEventRow {
    event_type_id: string | null;
    event_type: { name: string | null } | null;
    pricing_type?: string | null;
    price_min?: number | null;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
    'San Francisco': { lat: 37.7749, lng: -122.4194 },
    'New York': { lat: 40.7128, lng: -74.0060 },
    'London': { lat: 51.5074, lng: -0.1278 },
    'Berlin': { lat: 52.5200, lng: 13.4050 },
    'Singapore': { lat: 1.3521, lng: 103.8198 },
    'Austin': { lat: 30.2672, lng: -97.7431 },
    'Seattle': { lat: 47.6062, lng: -122.3321 },
    'Toronto': { lat: 43.65107, lng: -79.347015 },
    'Bengaluru': { lat: 12.9716, lng: 77.5946 },
    'Paris': { lat: 48.8566, lng: 2.3522 },
    'Amsterdam': { lat: 52.3676, lng: 4.9041 },
    'Dubai': { lat: 25.2048, lng: 55.2708 },
};

export default async function TechEventsCalendar2026Page() {
    const supabase = await createClient();

    const year2026Start = '2026-01-01T00:00:00.000Z';
    const year2026End = '2026-12-31T23:59:59.999Z';

    // Parallel data fetching
    const [{ data: categoryRows }, { count: totalCount }, { data: cityRows }, { data: monthlyRows }] =
        await Promise.all([
            supabase
                .from('events')
                .select('event_type_id, event_type:event_type_id(name), pricing_type, price_min')
                .eq('status', 'confirmed')
                .gte('start_time', year2026Start)
                .lte('start_time', year2026End),
            supabase
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'confirmed')
                .gte('start_time', year2026Start)
                .lte('start_time', year2026End),
            supabase
                .from('events')
                .select('location_city, location_latitude, location_longitude, title, slug, start_time')
                .eq('status', 'confirmed')
                .not('location_city', 'is', null)
                .gte('start_time', year2026Start)
                .lte('start_time', year2026End),
            supabase
                .from('events')
                .select('start_time')
                .eq('status', 'confirmed')
                .gte('start_time', year2026Start)
                .lte('start_time', year2026End)
                .order('start_time', { ascending: true }),
        ]);

    // Group cities and take top 15. Counts include all events with a city.
    // Coordinates are only required for map marker rendering.
    const cityMap = new Map<
        string,
        {
            count: number;
            lat: number | null;
            lng: number | null;
            events: { title: string; slug: string; date: string }[];
        }
    >();
    if (cityRows) {
        for (const row of cityRows) {
            const city = row.location_city;
            let lat = row.location_latitude;
            let lng = row.location_longitude;
            const eventData = {
                title: row.title,
                slug: row.slug,
                date: row.start_time,
            };

            if (city && city.trim()) {
                const cityName = city.trim();

                // Use fallback if coordinates are missing
                if (lat == null || lng == null) {
                    const fallback = CITY_COORDINATES[cityName];
                    if (fallback) {
                        lat = fallback.lat;
                        lng = fallback.lng;
                    }
                }

                const existing = cityMap.get(cityName) || { count: 0, lat: null, lng: null, events: [] };
                existing.events.push(eventData);
                cityMap.set(cityName, {
                    count: existing.count + 1,
                    lat: existing.lat ?? lat ?? null,
                    lng: existing.lng ?? lng ?? null,
                    events: existing.events,
                });
            }
        }
    }
    const allCitiesSorted = Array.from(cityMap.entries())
        .map(([name, data]) => ({
            city: name,
            slug: cityNameToSlug(name),
            count: data.count,
            lat: data.lat,
            lng: data.lng,
            events: data.events
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 24),
        }))
        .sort((a, b) => b.count - a.count);

    // The globe should always display top mapped hubs (up to 10).
    const topCities = allCitiesSorted
        .filter((city) => city.lat != null && city.lng != null)
        .slice(0, 10);

    // Group by month for timeline
    const monthCounts = new Array(12).fill(0);
    const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ];
    if (monthlyRows) {
        for (const row of monthlyRows) {
            const date = new Date((row as { start_time: string }).start_time);
            if (date.getFullYear() === 2026) {
                monthCounts[date.getMonth()]++;
            }
        }
    }
    const maxMonthCount = Math.max(...monthCounts, 1);

    const categoryMap = new Map<
        string,
        {
            id: string;
            name: string;
            eventCount: number;
            totalPrice: number;
            countWithPrice: number;
        }
    >();
    if (categoryRows) {
        for (const row of categoryRows as CategoryEventRow[]) {
            const categoryId = row.event_type_id || 'uncategorized';
            const categoryName = row.event_type?.name || 'Uncategorized';
            const existing = categoryMap.get(categoryId);

            // Only count price if it exists and is not 0 (unless we want to include free events as 0? 
            // The user asked for "paid amount breakdown", implies excluding free? 
            // "just show the paid amount breakdown, not free, the avg price by breakdown"
            // Interpreting as: Average price of PAID events.

            const price = row.price_min ?? null;
            const paidPrice = typeof price === 'number' && price > 0 ? price : null;

            if (existing) {
                existing.eventCount += 1;
                if (paidPrice !== null) {
                    existing.totalPrice += paidPrice;
                    existing.countWithPrice += 1;
                }
            } else {
                categoryMap.set(categoryId, {
                    id: categoryId,
                    name: categoryName,
                    eventCount: 1,
                    totalPrice: paidPrice ?? 0,
                    countWithPrice: paidPrice !== null ? 1 : 0,
                });
            }
        }
    }
    const categoryBreakdown = Array.from(categoryMap.values())
        .filter((category) => category.eventCount > 0)
        .sort((a, b) => b.eventCount - a.eventCount);

    // Transform for component
    const categories = categoryBreakdown.map(c => ({
        ...c,
        avgPrice: c.countWithPrice > 0 ? Math.round(c.totalPrice / c.countWithPrice) : 0
    }));



    // Price Histogram Logic
    const priceBins = [
        { label: 'Free', count: 0, range: 'Free' },
        { label: '<$100', count: 0, range: '<$100' },
        { label: '$100-$500', count: 0, range: '$100-$500' },
        { label: '$500-$1k', count: 0, range: '$500-$1k' },
        { label: '$1k+', count: 0, range: '$1k+' },
        { label: 'Unknown', count: 0, range: 'No price data' },
    ];

    if (categoryRows) {
        for (const row of categoryRows as CategoryEventRow[]) {
            const price = row.price_min ?? null;
            const pricingType = (row.pricing_type || '').toLowerCase();
            const isFree = pricingType.includes('free') || price === 0;

            if (isFree) {
                priceBins[0].count++;
            } else if (price !== null && price > 0) {
                if (price < 100) priceBins[1].count++;
                else if (price < 500) priceBins[2].count++;
                else if (price < 1000) priceBins[3].count++;
                else priceBins[4].count++;
            } else {
                priceBins[5].count++;
            }
        }
    }



    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: 'Home', url: SITE_URL },
                    { name: 'Resources', url: `${SITE_URL}/resources/tech-events-calendar-2026` },
                    { name: 'Tech Events Calendar 2026' },
                ]}
            />

            <div className="min-h-screen bg-background-main pb-32">
                {/* Enhanced Hero Section - Extracted to Client Component */}
                <AnimatedHero totalCount={totalCount} />



                <main className="max-w-[1600px] mx-auto px-6 sm:px-8 -mt-8 relative z-10 space-y-16 sm:space-y-20">


                    {/* Bento Grid Layout */}
                    {/* Bento Grid Layout - Dashboard Lines Style */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border rounded-2xl overflow-hidden shadow-sm">
                        {/* 1. Monthly Distribution (Full Width) */}
                        <section className="relative col-span-1 lg:col-span-12 bg-background p-6 sm:p-8">
                            <div className="flex items-end justify-between mb-8">
                                <h2 className="text-sm font-semibold text-foreground-primary">Event Distribution</h2>

                            </div>
                            <div
                                role="list"
                                aria-label="Confirmed events by month in 2026"
                                className="relative z-10 grid grid-cols-6 sm:grid-cols-12 gap-4 h-80 items-end"
                            >
                                {monthCounts.map((count, i) => {
                                    const barHeight = Math.max((count / maxMonthCount) * 100, 4);

                                    return (
                                        <div key={monthNames[i]} role="listitem" className="relative flex flex-col items-center gap-3 h-full justify-end">
                                            <button
                                                type="button"
                                                aria-label={`${monthNames[i]}: ${count} confirmed events`}
                                                className="group relative w-full flex items-end justify-center h-full rounded-md cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background-secondary"
                                            >
                                                <div
                                                    className="absolute left-1/2 -translate-x-1/2 text-xs text-foreground-primary font-semibold whitespace-nowrap"
                                                    style={{ bottom: `calc(${barHeight}% + 0.45rem)` }}
                                                >
                                                    {count}
                                                </div>
                                                <div
                                                    className="w-full rounded-md bg-gradient-to-t from-primary/85 to-primary/55 group-hover:from-primary group-hover:to-primary/70 group-focus-visible:from-primary group-focus-visible:to-primary/70 transition-all duration-300 relative overflow-hidden"
                                                    style={{ height: `${barHeight}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                </div>
                                                {/* Tooltip */}
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-foreground-primary text-background-main text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-lg z-20">
                                                    {count} events
                                                </div>
                                            </button>
                                            <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider">
                                                {monthNames[i]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div aria-hidden className="pointer-events-none absolute inset-x-8 sm:inset-x-10 top-20 sm:top-[5.5rem] bottom-14 sm:bottom-[3.6rem] z-0 grid grid-rows-4">
                                <div className="border-t border-border-subtle opacity-70" />
                                <div className="border-t border-border-subtle opacity-50" />
                                <div className="border-t border-border-subtle opacity-40" />
                                <div className="border-t border-border-subtle opacity-70" />
                            </div>
                        </section>

                        {/* 2. Top Hubs Map (Col Span 7) */}
                        {topCities.length > 0 && (
                            <InteractiveGlobeSection topCities={topCities} className="col-span-1 lg:col-span-7 bg-background border-none rounded-none shadow-none" />
                        )}

                        {/* 3. Category Donut (Col Span 5) */}
                        {categories.length > 0 && (
                            <section className="col-span-1 lg:col-span-5 bg-background p-6 flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-sm font-semibold text-foreground-primary">Event Category</h2>
                                    <Link href="/events" className="text-xs text-foreground-tertiary hover:text-foreground-primary transition-colors flex items-center gap-1">
                                        View all <ArrowRightIcon />
                                    </Link>
                                </div>
                                <div className="flex-grow flex flex-col justify-start">
                                    <div className="w-full relative">
                                        <CategoryBarChart categories={categories} />
                                    </div>
                                    <PriceHistogram bins={priceBins} />
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Navigation Footer */}
                    <section className="border-t border-border-subtle pt-12 pb-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="text-sm font-medium text-foreground-secondary mb-1">Looking for something else?</h3>
                                <p className="text-sm text-foreground-tertiary">Check out our other resources.</p>
                            </div>
                            <div className="flex gap-3">
                                <Link
                                    href="/resources/cfp-calendar"
                                    className="px-4 py-2 rounded-md bg-background-secondary border border-border-subtle text-sm font-medium text-foreground-secondary hover:text-foreground-primary hover:border-border-strong transition-all"
                                >
                                    CFP Deadlines
                                </Link>
                                <Link
                                    href="/blog"
                                    className="px-4 py-2 rounded-md bg-background-secondary border border-border-subtle text-sm font-medium text-foreground-secondary hover:text-foreground-primary hover:border-border-strong transition-all"
                                >
                                    Read Blog
                                </Link>
                            </div>
                        </div>
                    </section>
                </main>
            </div >
        </>
    );
}
