import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';
import {
    buildEventIdentityKeys,
    type EventIdentityKey,
} from '../utils/eventIdentity';

type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];
type EventAgendaInsert = Database['public']['Tables']['event_agenda']['Insert'];

interface EventIdentity {
    eventId?: string;
    externalId?: string | null;
    normalizedUrl?: string | null;
    normalizedRegistrationUrl?: string | null;
    sourceDomain?: string | null;
}

class EventIdentityConflictError extends Error {
    constructor(
        message: string,
        readonly existingEventId: string
    ) {
        super(message);
        this.name = 'EventIdentityConflictError';
    }
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
    private static isMissingIdentityTableError(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const candidate = error as { message?: string; code?: string };
        return candidate.code === 'PGRST205'
            || candidate.message?.includes('event_identity_keys') === true;
    }

    private static buildIdentityKeys(
        payload: EventInsert,
        identity: EventIdentity
    ): EventIdentityKey[] {
        return buildEventIdentityKeys({
            startTime: payload.start_time,
            sourceUrl: identity.normalizedUrl ?? payload.source_url ?? null,
            registrationUrl: identity.normalizedRegistrationUrl ?? payload.registration_url ?? null,
            externalId: identity.externalId ?? payload.external_id ?? null,
        });
    }

    private static getEventYearBounds(
        startTime: string | null | undefined
    ): { start: string; end: string } | null {
        if (!startTime) {
            return null;
        }

        const parsed = new Date(startTime);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        const year = parsed.getUTCFullYear();
        return {
            start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)).toISOString(),
            end: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)).toISOString(),
        };
    }

    private static async resolveEventIdByIdentityKeys(
        supabaseClient: SupabaseClientType,
        identityKeys: EventIdentityKey[]
    ): Promise<string | null> {
        for (const identityKey of identityKeys) {
            const { data, error } = await supabaseClient
                .from('event_identity_keys')
                .select('event_id')
                .eq('key_type', identityKey.keyType)
                .eq('key_hash', identityKey.keyHash)
                .eq('event_year', identityKey.eventYear)
                .limit(1)
                .maybeSingle();

            if (error) {
                if (this.isMissingIdentityTableError(error)) {
                    return null;
                }
                throw error;
            }

            if (data?.event_id) {
                return data.event_id;
            }
        }

        return null;
    }

    private static async syncEventIdentityKeys(
        supabaseClient: SupabaseClientType,
        eventId: string,
        identityKeys: EventIdentityKey[]
    ): Promise<void> {
        if (identityKeys.length === 0) {
            return;
        }

        for (const identityKey of identityKeys) {
            const { data, error } = await supabaseClient
                .from('event_identity_keys')
                .select('event_id')
                .eq('key_type', identityKey.keyType)
                .eq('key_hash', identityKey.keyHash)
                .eq('event_year', identityKey.eventYear)
                .limit(1)
                .maybeSingle();

            if (error) {
                if (this.isMissingIdentityTableError(error)) {
                    return;
                }
                throw error;
            }

            if (data?.event_id && data.event_id !== eventId) {
                throw new EventIdentityConflictError(
                    `Identity key ${identityKey.keyType}:${identityKey.keyHash}:${identityKey.eventYear} is already assigned to ${data.event_id}`,
                    data.event_id
                );
            }
        }

        const managedKeyTypes = ['source_url', 'registration_url', 'external_id'];
        const { error: deleteError } = await supabaseClient
            .from('event_identity_keys')
            .delete()
            .eq('event_id', eventId)
            .in('key_type', managedKeyTypes);

        if (deleteError) {
            if (this.isMissingIdentityTableError(deleteError)) {
                return;
            }
            throw deleteError;
        }

        const { error: insertError } = await supabaseClient
            .from('event_identity_keys')
            .insert(identityKeys.map((identityKey) => ({
                event_id: eventId,
                key_type: identityKey.keyType,
                key_hash: identityKey.keyHash,
                event_year: identityKey.eventYear,
            })));

        if (insertError) {
            if (this.isMissingIdentityTableError(insertError)) {
                return;
            }
            throw insertError;
        }
    }

    private static async ensureUniqueSlug(
        supabaseClient: SupabaseClientType,
        baseSlug: string,
        excludeId?: string | null
    ): Promise<string> {
        if (!baseSlug) {
            return baseSlug;
        }

        let candidate = baseSlug;
        let counter = 1;

        while (true) {
            let query = supabaseClient
                .from('events')
                .select('id')
                .eq('slug', candidate)
                .limit(1);

            if (excludeId) {
                query = query.neq('id', excludeId);
            }

            const { data: existing } = await query.maybeSingle();
            if (!existing) {
                return candidate;
            }

            candidate = `${baseSlug}-${counter}`;
            counter += 1;
        }
    }

    static async upsertEvent(
        supabaseClient: SupabaseClientType,
        payload: EventInsert,
        identity: EventIdentity
    ): Promise<{ eventId: string; created: boolean }> {
        let targetEventId: string | null = identity.eventId ?? null;
        const identityKeys = this.buildIdentityKeys(payload, identity);
        const canonicalEventId = await this.resolveEventIdByIdentityKeys(
            supabaseClient,
            identityKeys
        );

        if (canonicalEventId) {
            targetEventId = canonicalEventId;
        }

        if (!targetEventId) {
            const eventYearBounds = this.getEventYearBounds(payload.start_time);

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
                let query = supabaseClient
                    .from('events')
                    .select('id')
                    .eq('source_url', identity.normalizedUrl);

                if (eventYearBounds) {
                    query = query
                        .gte('start_time', eventYearBounds.start)
                        .lt('start_time', eventYearBounds.end);
                }

                const { data: existingByUrl } = await query
                    .limit(1)
                    .maybeSingle();
                targetEventId = existingByUrl?.id ?? null;
            }
        }

        if (targetEventId) {
            const updatePayload: EventUpdate = { ...payload };
            delete (updatePayload as { id?: string }).id;
            if (updatePayload.slug) {
                updatePayload.slug = await this.ensureUniqueSlug(
                    supabaseClient,
                    updatePayload.slug,
                    targetEventId
                );
            }
            const { error } = await supabaseClient
                .from('events')
                .update(updatePayload)
                .eq('id', targetEventId);
            if (error) {
                throw error;
            }
            await this.syncEventIdentityKeys(supabaseClient, targetEventId, identityKeys);
            return { eventId: targetEventId, created: false };
        }

        const baseSlug = payload.slug ?? '';
        let attempt = 0;
        let insertPayload: EventInsert = { ...payload };

        while (attempt < 5) {
            if (insertPayload.slug) {
                insertPayload.slug = await this.ensureUniqueSlug(supabaseClient, baseSlug);
            }

            const { data: inserted, error: insertError } = await supabaseClient
                .from('events')
                .insert(insertPayload)
                .select('id')
                .single();

            if (!insertError && inserted) {
                try {
                    await this.syncEventIdentityKeys(supabaseClient, inserted.id, identityKeys);
                    return { eventId: inserted.id, created: true };
                } catch (error) {
                    if (error instanceof EventIdentityConflictError) {
                        await supabaseClient
                            .from('events')
                            .delete()
                            .eq('id', inserted.id);
                        return { eventId: error.existingEventId, created: false };
                    }
                    throw error;
                }
            }

            const isSlugConflict =
                insertError?.code === '23505' &&
                (insertError.message?.includes('events_slug_unique_idx') ||
                    insertError.details?.includes('slug'));

            if (isSlugConflict) {
                attempt += 1;
                insertPayload = { ...insertPayload, slug: `${baseSlug}-${attempt}` };
                continue;
            }

            throw insertError || new Error('Failed to insert event');
        }

        throw new Error('Failed to insert event after resolving slug conflicts');
    }

    static async replaceAgendaItems(
        supabaseClient: SupabaseClientType,
        eventId: string,
        items: EventAgendaInsert[]
    ): Promise<string[]> {
        const { data, error } = await (supabaseClient as unknown as {
            rpc: (
                fn: string,
                params: Record<string, unknown>
            ) => Promise<{ data: string[] | null; error: Error | null }>;
        }).rpc('replace_event_agenda', {
            p_event_id: eventId,
            p_items: items,
        });

        if (error) {
            throw error;
        }

        return data ?? [];
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
        const speakerNames = Array.from(
            new Set(
                speakers
                    .map((speaker) => speaker.name.trim())
                    .filter(Boolean)
            )
        );

        const existingSpeakersMap = new Map<string, string>(); // linkedInUrl -> speakerId
        const existingSpeakersByName = new Map<string, { id: string; linkedinUrl?: string | null }>(); // normalized name -> speaker metadata
        const existingSpeakerMetadataById = new Map<string, { linkedinUrl?: string | null }>();

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
                    existingSpeakerMetadataById.set(speaker.id, {
                        linkedinUrl: speaker.linkedin_url,
                    });
                }
            }
        }

        if (speakerNames.length > 0) {
            const { data: existingByName } = await supabaseClient
                .from('speakers')
                .select('id, name, linkedin_url')
                .in('name', speakerNames);

            if (existingByName) {
                for (const speaker of existingByName) {
                    if (speaker.name) {
                        existingSpeakersByName.set(speaker.name.trim().toLowerCase(), {
                            id: speaker.id,
                            linkedinUrl: speaker.linkedin_url,
                        });
                        existingSpeakerMetadataById.set(speaker.id, {
                            linkedinUrl: speaker.linkedin_url,
                        });
                    }
                }
            }
        }

        // Step 2: Separate speakers into update vs insert groups
        const speakersToUpdate: Array<{ id: string; input: SpeakerUpsertInput }> = [];
        const speakersToInsert: SpeakerUpsertInput[] = [];
        const resultOrder: Array<{ existingId?: string; insertIndex?: number }> = [];

        let insertIndex = 0;
        for (const speaker of speakers) {
            if (speaker.linkedinUrl && existingSpeakersMap.has(speaker.linkedinUrl)) {
                const existingId = existingSpeakersMap.get(speaker.linkedinUrl)!;
                speakersToUpdate.push({ id: existingId, input: speaker });
                resultOrder.push({ existingId });
                continue;
            }

            const normalizedName = speaker.name.trim().toLowerCase();
            const existingByName = existingSpeakersByName.get(normalizedName);
            if (existingByName) {
                speakersToUpdate.push({ id: existingByName.id, input: speaker });
                resultOrder.push({ existingId: existingByName.id });
                continue;
            }

            speakersToInsert.push(speaker);
            resultOrder.push({ insertIndex });
            insertIndex++;
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
                    if (input.linkedinUrl !== undefined) {
                        const existingSpeaker = existingSpeakerMetadataById.get(id);
                        if (!existingSpeaker?.linkedinUrl && input.linkedinUrl) {
                            updateData.linkedin_url = input.linkedinUrl;
                        }
                    }

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
            if (item.existingId) {
                return item.existingId;
            } else if (item.insertIndex !== undefined) {
                return insertedSpeakerIds[item.insertIndex];
            }
            throw new Error('Invalid result order item');
        });
    }
}
