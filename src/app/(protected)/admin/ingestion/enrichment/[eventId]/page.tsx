/**
 * Event Enrichment Editor
 * 
 * Admin-only route for manually enriching a single event with agenda items,
 * speakers, and organizer logos.
 */

export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import { redirect, notFound } from 'next/navigation';
import EnrichmentEditorClient, { type EventWithRelationships, type AgendaItemWithSpeakers } from './EnrichmentEditorClient';

export default async function EnrichmentEditorPage({
    params,
    searchParams,
}: {
    params: Promise<{ eventId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { eventId } = await params;
    const resolvedSearchParams = await searchParams;
    const from = resolvedSearchParams.from === 'events' ? 'events' : 'enrichment';
    const returnToParam = typeof resolvedSearchParams.returnTo === 'string' ? resolvedSearchParams.returnTo : null;
    const allowedReturnPrefixes = [
        '/admin/ingestion/enrichment',
        '/admin/events',
    ];
    const backUrl = returnToParam && allowedReturnPrefixes.some((prefix) => returnToParam.startsWith(prefix))
        ? returnToParam
        : from === 'events'
            ? '/admin/events'
            : '/admin/ingestion/enrichment';
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check admin access
    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        redirect('/dashboard');
    }

    // Fetch event details with all relationships
    const { data: event, error } = await supabase
        .from('events')
        .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            location,
            timezone,
            language,
            source_url,
            registration_url,
            livestream_url,
            event_image_url,
            agenda_url,
            price_min,
            price_max,
            currency,
            pricing_type,
            difficulty_level,
            event_format,
            status,
            prerequisites,
            target_audience,
            certificate_offered,
            recording_available,
            accessibility_features,
            social_media_hashtag,
            virtual_platform,
            capacity,
            attendee_count,
            registration_deadline,
            is_multi_day,
            daily_schedule,
            organizer:organizers(id, name, logo_url, description, website_url, social_media),
            event_type:event_type(id, name, color, icon),
            venue:venues(id, name, address, city, state_province, country, venue_type, capacity, latitude, longitude),
            series:event_series(id, name, description, logo_url, website_url),
            event_tag_relations(
                tag_id,
                event_tags(id, event_tag, category)
            ),
            event_target_audiences(
                audience_id,
                target_audiences(id, name, description)
            ),
            event_prerequisites(
                prerequisite_id,
                prerequisites(id, name, description)
            ),
            speaker_lineup,
            event_agenda(id, title, start_time, end_time, agenda_type, description, location, day_number, track, topics, sort_order, capacity, difficulty_level, prerequisites, is_required)
        `)
        .eq('id', eventId)
        .single();

    if (error) {
        console.error('Error fetching event:', error);
        console.error('Event ID:', eventId);
        console.error('Error details:', JSON.stringify(error, null, 2));
        notFound();
    }

    if (!event) {
        console.error('Event not found for ID:', eventId);
        notFound();
    }

    // Fetch existing agenda items with speakers
    const { data: agendaItems } = await supabase
        .from('event_agenda')
        .select(`
            *,
            agenda_speakers(
                speaker_id,
                speakers(*)
            )
        `)
        .eq('event_id', eventId)
        .order('day_number', { ascending: true })
        .order('sort_order', { ascending: true });

    // Fetch all speakers linked to this event (via agenda_speakers)
    const { data: linkedSpeakers } = await supabase
        .from('agenda_speakers')
        .select('speaker_id, speakers(*)')
        .eq('event_id', eventId);

    // Extract speakers from agenda_speakers
    type SpeakerFromDB = {
        id: string;
        name: string;
        title?: string | null;
        company?: string | null;
        linkedin_url?: string | null;
        twitter_url?: string | null;
        website_url?: string | null;
        photo_url?: string | null;
        bio?: string | null;
    };
    
    const speakersFromAgenda = (linkedSpeakers || [])
        .map((ls: { speakers: unknown }) => ls.speakers)
        .filter((s): s is SpeakerFromDB => Boolean(s) && typeof s === 'object' && s !== null && 'id' in s && 'name' in s)
        .map((s) => ({
            id: s.id,
            name: s.name,
            title: s.title || undefined,
            company: s.company || undefined,
            linkedinUrl: s.linkedin_url || undefined,
            twitterUrl: s.twitter_url || undefined,
            websiteUrl: s.website_url || undefined,
            photoUrl: s.photo_url || undefined,
            bio: s.bio || undefined,
        }));

    // Also fetch speakers from speaker_lineup and match with speakers table
    const speakerLineup = event.speaker_lineup as Array<{ name: string; linkedinUrl?: string; title?: string; company?: string }> | null;
    const speakersFromLineup: Array<{ id: string; name: string; title?: string; company?: string; linkedinUrl?: string; twitterUrl?: string; websiteUrl?: string; photoUrl?: string; bio?: string }> = [];

    if (speakerLineup && Array.isArray(speakerLineup) && speakerLineup.length > 0) {
        // Extract LinkedIn URLs from speaker_lineup
        const linkedInUrls = speakerLineup
            .map(s => s.linkedinUrl)
            .filter((url): url is string => !!url);

        if (linkedInUrls.length > 0) {
            // Fetch speakers from speakers table by LinkedIn URL
            const { data: speakersFromDb } = await supabase
                .from('speakers')
                .select('*')
                .in('linkedin_url', linkedInUrls);

            if (speakersFromDb) {
                speakersFromLineup.push(...speakersFromDb.map((s) => ({
                    id: s.id,
                    name: s.name,
                    title: s.title || undefined,
                    company: s.company || undefined,
                    linkedinUrl: s.linkedin_url || undefined,
                    twitterUrl: s.twitter_url || undefined,
                    websiteUrl: s.website_url || undefined,
                    photoUrl: s.photo_url || undefined,
                    bio: s.bio || undefined,
                })));
            }
        }
    }

    // Combine both sources and remove duplicates by ID
    const allSpeakers = [...speakersFromAgenda, ...speakersFromLineup];
    const uniqueSpeakers = Array.from(
        new Map(allSpeakers.map(s => [s.id, s])).values()
    );

    // Fetch all lookup data in parallel
    const { EventEnrichmentService } = await import('@/services/ingestion/EventEnrichmentService');
    const lookupData = await EventEnrichmentService.getEnrichmentLookupData(supabase);

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Enrich Event</h1>
                <p className="text-muted-foreground">
                    Add agenda items, speakers, and organizer logo for: {event.title}
                </p>
            </div>

            <EnrichmentEditorClient
                event={event as EventWithRelationships}
                initialAgendaItems={(agendaItems || []) as AgendaItemWithSpeakers[]}
                initialAvailableSpeakers={uniqueSpeakers}
                lookupData={lookupData}
                backUrl={backUrl}
            />
        </div>
    );
}
