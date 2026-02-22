import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { EventTypeService } from '@/services/eventTypeService';
import { ProfileService } from '@/services/profileService';
import EventListView from '@/components/events/EventListView';
import { BreadcrumbJsonLd, ItemListJsonLd } from '@/components/seo';
import { formatDate } from '@/utils/dateUtils';
import { generateEventSlug } from '@/utils/slugUtils';
import { SITE_URL } from '@/config/site';

export const metadata: Metadata = {
    title: 'Tech Events Calendar 2026 — Conferences, Meetups & Hackathons | Kure-Cal',
    description: 'Browse upcoming tech conferences, developer meetups, hackathons, and workshops. Filter by date, location, and category. The curated tech events calendar for serious engineering careers.',
    openGraph: {
        title: 'Tech Events Calendar 2026 — Conferences, Meetups & Hackathons',
        description: 'Browse upcoming tech conferences, developer meetups, hackathons, and workshops. The curated tech events calendar for serious engineering careers.',
        type: 'website',
        url: `${SITE_URL}/events`,
        images: [{ url: `${SITE_URL}/og-image.png` }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Tech Events Calendar 2026 — Conferences, Meetups & Hackathons',
        description: 'Browse upcoming tech conferences, developer meetups, hackathons, and workshops. The curated tech events calendar for serious engineering careers.',
        images: [`${SITE_URL}/og-image.png`],
    },
    alternates: {
        canonical: `${SITE_URL}/events`,
    },
};

// Revalidate every hour
export const revalidate = 3600;

interface SSREvent {
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

async function getLocations() {
    const supabase = await createClient();
    const { data } = await supabase
        .from('events')
        .select('location')
        .eq('status', 'confirmed')
        .not('location', 'is', null)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

    if (!data) return [];

    const locations = Array.from(new Set(data.map(d => d.location).filter(l => l) as string[]));
    return locations.sort();
}

async function getUpcomingEvents(): Promise<SSREvent[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('events')
        .select('id, slug, title, description, start_time, end_time, location, event_format, event_type:event_type_id(name), organizer:organizer_id(name)')
        .eq('status', 'confirmed')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(20);

    return (data as unknown as SSREvent[]) || [];
}

export default async function EventsPage() {
    const supabase = await createClient();

    // Parallel data fetching
    const [
        categories,
        { data: { user } },
        locationOptions,
        ssrEvents,
    ] = await Promise.all([
        EventTypeService.getEventTypesWithCounts(supabase),
        supabase.auth.getUser(),
        getLocations(),
        getUpcomingEvents(),
    ]);

    let profile = null;
    if (user) {
        try {
            profile = await ProfileService.getProfile(user.id, supabase);
        } catch (error) {
            console.error('Failed to fetch profile for events page:', error);
        }
    }

    return (
        <>
            {/* Structured data */}
            <BreadcrumbJsonLd
                items={[
                    { name: 'Home', url: SITE_URL },
                    { name: 'Events' },
                ]}
            />
            <ItemListJsonLd
                items={ssrEvents.map((event) => ({
                    title: event.title,
                    startDate: event.start_time,
                    endDate: event.end_time,
                    location: event.location,
                    isOnline: event.event_format === 'Online',
                    description: event.description,
                    url: `${SITE_URL}/events/${event.slug || event.id}`,
                    organizerName: event.organizer?.name,
                }))}
            />

            {/* SSR event content for crawlers — hidden once client hydrates */}
            {ssrEvents.length > 0 && (
                <section className="sr-only" aria-label="Upcoming tech events">
                    <h2>Upcoming Tech Events</h2>
                    <ul>
                        {ssrEvents.map((event) => {
                            const slug = event.slug || generateEventSlug(event.title, event.id);
                            return (
                                <li key={event.id}>
                                    <Link href={`/events/${slug}`}>
                                        <h3>{event.title}</h3>
                                    </Link>
                                    <time dateTime={event.start_time}>{formatDate(event.start_time)}</time>
                                    {event.location && <span>{event.location}</span>}
                                    {event.event_type && <span>{event.event_type.name}</span>}
                                    {event.organizer && <span>Organized by {event.organizer.name}</span>}
                                    {event.description && <p>{event.description.slice(0, 200)}</p>}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* Interactive client view */}
            <EventListView
                initialCategories={categories}
                profile={profile}
                locationOptions={locationOptions}
            />
        </>
    );
}
