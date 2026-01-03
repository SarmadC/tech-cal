import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';

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

    /**
     * Batch upsert speakers - optimized to reduce N+1 queries
     * Uses batch operations instead of individual queries per speaker
     */
    static async upsertSpeakers(
        supabaseClient: SupabaseClientType,
        speakers: SpeakerUpsertInput[]
    ): Promise<string[]> {
        if (speakers.length === 0) {
            return [];
        }

        // Step 1: Batch fetch all existing speakers by LinkedIn URLs
        const linkedInUrls = speakers
            .map(s => s.linkedinUrl)
            .filter((url): url is string => !!url);

        const existingSpeakersMap = new Map<string, string>(); // linkedInUrl -> speakerId

        if (linkedInUrls.length > 0) {
            const { data: existingSpeakers } = await supabaseClient
                .from('speakers')
                .select('id, linkedin_url')
                .in('linkedin_url', linkedInUrls);

            if (existingSpeakers) {
                for (const speaker of existingSpeakers) {
                    if (speaker.linkedin_url) {
                        existingSpeakersMap.set(speaker.linkedin_url, speaker.id);
                    }
                }
            }
        }

        // Step 2: Separate speakers into update vs insert groups
        const speakersToUpdate: Array<{ id: string; input: SpeakerUpsertInput }> = [];
        const speakersToInsert: SpeakerUpsertInput[] = [];
        const resultOrder: Array<{ linkedinUrl?: string; insertIndex?: number }> = [];

        let insertIndex = 0;
        for (const speaker of speakers) {
            if (speaker.linkedinUrl && existingSpeakersMap.has(speaker.linkedinUrl)) {
                const existingId = existingSpeakersMap.get(speaker.linkedinUrl)!;
                speakersToUpdate.push({ id: existingId, input: speaker });
                resultOrder.push({ linkedinUrl: speaker.linkedinUrl });
            } else {
                speakersToInsert.push(speaker);
                resultOrder.push({ insertIndex });
                insertIndex++;
            }
        }

        // Step 3: Batch update existing speakers (parallel updates)
        if (speakersToUpdate.length > 0) {
            await Promise.all(
                speakersToUpdate.map(async ({ id, input }) => {
                    const updateData: Record<string, unknown> = {
                        name: input.name,
                    };
                    if (input.title !== undefined) updateData.title = input.title || null;
                    if (input.company !== undefined) updateData.company = input.company || null;
                    if (input.bio !== undefined) updateData.bio = input.bio || null;
                    if (input.photoUrl !== undefined) updateData.photo_url = input.photoUrl || null;
                    if (input.twitterUrl !== undefined) updateData.twitter_url = input.twitterUrl || null;
                    if (input.websiteUrl !== undefined) updateData.website_url = input.websiteUrl || null;

                    const { error } = await supabaseClient
                        .from('speakers')
                        .update(updateData)
                        .eq('id', id);

                    if (error) throw error;
                })
            );
        }

        // Step 4: Batch insert new speakers (single insert for all)
        const insertedSpeakerIds: string[] = [];
        if (speakersToInsert.length > 0) {
            const insertPayload = speakersToInsert.map(speaker => ({
                name: speaker.name,
                linkedin_url: speaker.linkedinUrl || null,
                title: speaker.title || null,
                company: speaker.company || null,
                bio: speaker.bio || null,
                photo_url: speaker.photoUrl || null,
                twitter_url: speaker.twitterUrl || null,
                website_url: speaker.websiteUrl || null,
            }));

            const { data: insertedSpeakers, error: insertError } = await supabaseClient
                .from('speakers')
                .insert(insertPayload)
                .select('id');

            if (insertError || !insertedSpeakers) {
                throw insertError || new Error('Failed to batch insert speakers');
            }

            insertedSpeakerIds.push(...insertedSpeakers.map(s => s.id));
        }

        // Step 5: Build result array in original order
        return resultOrder.map(item => {
            if (item.linkedinUrl) {
                return existingSpeakersMap.get(item.linkedinUrl)!;
            } else if (item.insertIndex !== undefined) {
                return insertedSpeakerIds[item.insertIndex];
            }
            throw new Error('Invalid result order item');
        });
    }
}

