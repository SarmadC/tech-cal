import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { EventTypeService } from '@/services/eventTypeService';
import { BreadcrumbJsonLd, FAQPageJsonLd } from '@/components/seo';
import { categoryNameToSlug, cityNameToSlug } from '@/utils/categorySlugUtils';
import { SITE_URL } from '@/config/site';

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

const FAQS = [
    {
        question: 'How many tech events are happening in 2026?',
        answer: 'Kure-Cal tracks hundreds of tech events across conferences, meetups, hackathons, and workshops happening worldwide in 2026. Our calendar is updated daily as new events are announced.',
    },
    {
        question: 'What types of tech events does Kure-Cal cover?',
        answer: 'We cover conferences, hackathons, meetups, workshops, webinars, summits, and product launches across all technology domains including software engineering, AI/ML, cloud, DevOps, and more.',
    },
    {
        question: 'How do I stay updated on new tech events in 2026?',
        answer: 'Create a free Kure-Cal account to bookmark events, get deadline reminders, and receive personalized event recommendations based on your interests and location.',
    },
    {
        question: 'Can I submit a tech event to be listed on Kure-Cal?',
        answer: 'Yes! Organizers can submit their tech events through our platform. All submissions are reviewed for quality before being added to the calendar.',
    },
];

interface CityCount {
    name: string;
    slug: string;
    count: number;
}

export default async function TechEventsCalendar2026Page() {
    const supabase = await createClient();

    const year2026Start = '2026-01-01T00:00:00.000Z';
    const year2026End = '2026-12-31T23:59:59.999Z';

    // Parallel data fetching
    const [categories, { count: totalCount }, { data: cityRows }, { data: monthlyRows }] =
        await Promise.all([
            EventTypeService.getEventTypesWithCounts(supabase),
            supabase
                .from('events')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'confirmed')
                .gte('start_time', year2026Start)
                .lte('start_time', year2026End),
            supabase
                .from('events')
                .select('location_city')
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

    // Group cities and take top 15
    const cityMap = new Map<string, number>();
    if (cityRows) {
        for (const row of cityRows) {
            const city = (row as { location_city: string | null }).location_city;
            if (city && city.trim()) {
                cityMap.set(city, (cityMap.get(city) || 0) + 1);
            }
        }
    }
    const topCities: CityCount[] = Array.from(cityMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, count]) => ({
            name,
            slug: cityNameToSlug(name),
            count,
        }));

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

    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: 'Home', url: SITE_URL },
                    { name: 'Resources', url: `${SITE_URL}/resources/tech-events-calendar-2026` },
                    { name: 'Tech Events Calendar 2026' },
                ]}
            />
            <FAQPageJsonLd faqs={FAQS} />

            <div className="min-h-screen bg-background-main pb-24">
                {/* Hero */}
                <header className="border-b border-border-subtle">
                    <div className="max-w-5xl mx-auto px-6 sm:px-8 py-16">
                        <p className="text-[11px] font-medium text-foreground-tertiary/70 uppercase tracking-[0.08em] mb-4">
                            Resource
                        </p>
                        <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.03em] text-foreground-primary leading-tight mb-5">
                            {totalCount || 0} Tech Events in 2026
                        </h1>
                        <p className="text-[16px] text-foreground-secondary leading-relaxed max-w-2xl">
                            The complete directory of tech conferences, developer
                            meetups, hackathons, and workshops happening in 2026.
                            Updated daily so you never miss a deadline.
                        </p>
                        <div className="mt-6">
                            <Link
                                href="/events"
                                className="inline-flex items-center h-10 px-5 rounded-lg bg-foreground-primary text-background-main text-[14px] font-medium hover:opacity-90 transition-opacity"
                            >
                                Browse All Events
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="max-w-5xl mx-auto px-6 sm:px-8 py-12 space-y-16">
                    {/* Category Breakdown */}
                    {categories.length > 0 && (
                        <section>
                            <h2 className="text-[11px] font-medium text-foreground-tertiary/70 uppercase tracking-[0.08em] mb-6">
                                Events by Category
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {categories.map((cat) => (
                                    <Link
                                        key={cat.id}
                                        href={`/events/category/${categoryNameToSlug(cat.name)}`}
                                        className="group p-4 rounded-lg border border-border-subtle hover:border-border-default transition-colors"
                                    >
                                        <span className="text-[15px] font-medium text-foreground-primary group-hover:text-accent-primary transition-colors block">
                                            {cat.name}s
                                        </span>
                                        <span className="text-[13px] text-foreground-tertiary mt-1 block">
                                            {cat.eventCount || 0} events
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Monthly Timeline */}
                    <section>
                        <h2 className="text-[11px] font-medium text-foreground-tertiary/70 uppercase tracking-[0.08em] mb-6">
                            Events by Month
                        </h2>
                        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                            {monthCounts.map((count, i) => (
                                <div key={i} className="text-center">
                                    <div className="relative h-24 flex items-end justify-center mb-1">
                                        <div
                                            className="w-full rounded-sm bg-accent-primary/20"
                                            style={{
                                                height: `${Math.max((count / maxMonthCount) * 100, 4)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-foreground-tertiary">
                                        {monthNames[i]}
                                    </span>
                                    <span className="text-[10px] text-foreground-tertiary/50 block">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Top Cities */}
                    {topCities.length > 0 && (
                        <section>
                            <h2 className="text-[11px] font-medium text-foreground-tertiary/70 uppercase tracking-[0.08em] mb-6">
                                Top Cities
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                {topCities.map((city) => (
                                    <Link
                                        key={city.slug}
                                        href={`/events/cities/${city.slug}`}
                                        className="group p-3 rounded-lg border border-border-subtle hover:border-border-default transition-colors"
                                    >
                                        <span className="text-[13px] font-medium text-foreground-primary group-hover:text-accent-primary transition-colors block truncate">
                                            {city.name}
                                        </span>
                                        <span className="text-[11px] text-foreground-tertiary mt-0.5 block">
                                            {city.count} events
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* FAQ Section */}
                    <section>
                        <h2 className="text-[11px] font-medium text-foreground-tertiary/70 uppercase tracking-[0.08em] mb-6">
                            Frequently Asked Questions
                        </h2>
                        <dl className="divide-y divide-border-subtle">
                            {FAQS.map((faq, i) => (
                                <div key={i} className="py-5">
                                    <dt className="text-[15px] font-medium text-foreground-primary mb-2">
                                        {faq.question}
                                    </dt>
                                    <dd className="text-[14px] text-foreground-secondary leading-relaxed">
                                        {faq.answer}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    {/* Cross-links */}
                    <section className="pt-6 border-t border-border-subtle">
                        <h2 className="text-[11px] font-medium text-foreground-tertiary/70 uppercase tracking-[0.08em] mb-4">
                            More Resources
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/resources/cfp-calendar"
                                className="px-4 py-2 rounded-md border border-border-subtle text-[13px] text-foreground-secondary hover:text-foreground-primary hover:border-border-default transition-colors"
                            >
                                CFP Deadlines Calendar
                            </Link>
                            <Link
                                href="/events"
                                className="px-4 py-2 rounded-md border border-border-subtle text-[13px] text-foreground-secondary hover:text-foreground-primary hover:border-border-default transition-colors"
                            >
                                Browse All Events
                            </Link>
                            <Link
                                href="/blog"
                                className="px-4 py-2 rounded-md border border-border-subtle text-[13px] text-foreground-secondary hover:text-foreground-primary hover:border-border-default transition-colors"
                            >
                                Blog
                            </Link>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
