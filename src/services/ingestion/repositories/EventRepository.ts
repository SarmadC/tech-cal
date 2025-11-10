import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';

type EventRow = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];
type EventAgendaInsert = Database['public']['Tables']['event_agenda']['Insert'];

interface EventIdentity {
    eventId?: string;
    externalId?: string | null;
    normalizedUrl?: string | null;
    sourceDomain?: string | null;
}

export interface SpeakerUpsertInput {
    name: string;
    linkedinUrl?: string;
    title?: string;
    company?: string;
    bio?: string;
    photoUrl?: string;
    twitterUrl?: string;
    websiteUrl?: string;
}

export class EventRepository {
    static async upsertEvent(
        supabaseClient: SupabaseClientType,
        payload: EventInsert,
        identity: EventIdentity
    ): Promise<{ eventId: string; created: boolean }> {
        let targetEventId: string | null = identity.eventId ?? null;

        if (!targetEventId) {
            if (identity.externalId && identity.sourceDomain) {
                const { data: existingByExternal } = await supabaseClient
                    .from('events')
                    .select('id')
                    .eq('external_id', identity.externalId)
                    .eq('source_domain', identity.sourceDomain)
                    .limit(1)
                    .maybeSingle();
                targetEventId = existingByExternal?.id ?? null;
            } else if (identity.normalizedUrl) {
                const { data: existingByUrl } = await supabaseClient
                    .from('events')
                    .select('id')
                    .eq('source_url', identity.normalizedUrl)
                    .limit(1)
                    .maybeSingle();
                targetEventId = existingByUrl?.id ?? null;
            }
        }

        if (targetEventId) {
            const updatePayload: EventUpdate = { ...payload };
            delete (updatePayload as { id?: string }).id;
            const { error } = await supabaseClient
                .from('events')
                .update(updatePayload)
                .eq('id', targetEventId);
            if (error) {
                throw error;
            }
            return { eventId: targetEventId, created: false };
        }

        const { data: inserted, error: insertError } = await supabaseClient
            .from('events')
            .insert(payload)
            .select('id')
            .single();

        if (insertError || !inserted) {
            throw insertError || new Error('Failed to insert event');
        }

        return { eventId: inserted.id, created: true };
    }

    static async replaceAgendaItems(
        supabaseClient: SupabaseClientType,
        eventId: string,
        items: EventAgendaInsert[]
    ): Promise<string[]> {
        const { data: existingAgenda } = await supabaseClient
            .from('event_agenda')
            .select('id')
            .eq('event_id', eventId);

        if (existingAgenda && existingAgenda.length > 0) {
            const agendaIds = existingAgenda.map((item) => item.id);
            await supabaseClient.from('agenda_speakers').delete().in('agenda_id', agendaIds);
            await supabaseClient.from('event_agenda').delete().in('id', agendaIds);
        }

        if (items.length === 0) {
            return [];
        }

        const { data: insertedAgenda, error } = await supabaseClient
            .from('event_agenda')
            .insert(items)
            .select('id');

        if (error || !insertedAgenda) {
            throw error || new Error('Failed to insert agenda items');
        }

        return insertedAgenda.map((agenda) => agenda.id);
    }

    static async upsertSpeakers(
        supabaseClient: SupabaseClientType,
        speakers: SpeakerUpsertInput[]
    ): Promise<string[]> {
        const speakerIds: string[] = [];

        for (const speaker of speakers) {
            let speakerId: string | null = null;

            if (speaker.linkedinUrl) {
                const { data: existingLinkedIn } = await supabaseClient
                    .from('speakers')
                    .select('id')
                    .eq('linkedin_url', speaker.linkedinUrl)
                    .maybeSingle();

                if (existingLinkedIn) {
                    speakerId = existingLinkedIn.id;
                    const updateData: Record<string, unknown> = {
                        name: speaker.name,
                    };

                    if (speaker.title !== undefined) updateData.title = speaker.title || null;
                    if (speaker.company !== undefined) updateData.company = speaker.company || null;
                    if (speaker.bio !== undefined) updateData.bio = speaker.bio || null;
                    if (speaker.photoUrl !== undefined) updateData.photo_url = speaker.photoUrl || null;
                    if (speaker.twitterUrl !== undefined) updateData.twitter_url = speaker.twitterUrl || null;
                    if (speaker.websiteUrl !== undefined) updateData.website_url = speaker.websiteUrl || null;

                    const { error: updateError } = await supabaseClient
                        .from('speakers')
                        .update(updateData)
                        .eq('id', speakerId);

                    if (updateError) {
                        throw updateError;
                    }
                }
            }

            if (!speakerId) {
                const { data: newSpeaker, error: insertError } = await supabaseClient
                    .from('speakers')
                    .insert({
                        name: speaker.name,
                        linkedin_url: speaker.linkedinUrl || null,
                        title: speaker.title || null,
                        company: speaker.company || null,
                        bio: speaker.bio || null,
                        photo_url: speaker.photoUrl || null,
                        twitter_url: speaker.twitterUrl || null,
                        website_url: speaker.websiteUrl || null,
                    })
                    .select('id')
                    .single();

                if (insertError || !newSpeaker) {
                    throw insertError || new Error(`Failed to insert speaker ${speaker.name}`);
                }

                speakerId = newSpeaker.id;
            }

            speakerIds.push(speakerId);
        }

        return speakerIds;
    }
}

