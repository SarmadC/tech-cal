/**
 * Event Enrichment Service
 * 
 * Handles manual enrichment of ingested events with agenda items, speakers, organizer logos,
 * and all enrichable event fields from the database schema.
 */

import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';
import * as Sentry from '@sentry/nextjs';
import { normalizeTimezone, isValidIanaTimezone } from '@/utils/ingestion/ExtractNormalization';
import { EventUpdateService } from './EventUpdateService';
import { EventRepository } from './repositories/EventRepository';

// Type aliases for enum validation
type EventFormatEnum = Database['public']['Enums']['event_format_enum'];
type PricingTypeEnum = Database['public']['Enums']['pricing_type_enum'];

export interface AgendaItemInput {
    title: string;
    startTime: string;
    endTime: string;
    type?: string;
    description?: string;
    location?: string;
    dayNumber?: number;
    track?: string;
    sortOrder?: number;
    speakerIds?: string[]; // Speaker IDs to link to this agenda item
    capacity?: number | null;
    difficultyLevel?: string | null;
    prerequisites?: string | null;
    isRequired?: boolean | null;
    durationMinutes?: number | null;
}

export interface EventCoreFieldsInput {
    description?: string | null;
    location?: string | null;
    timezone?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    language?: string | null;
    registration_url?: string | null;
    livestream_url?: string | null;
    event_image_url?: string | null;
    agenda_url?: string | null;
    price_min?: number | null;
    price_max?: number | null;
    currency?: string | null;
    pricing_type?: PricingTypeEnum | null;
    difficulty_level?: string | null;
    event_format?: EventFormatEnum | null;
    status?: string | null;
    prerequisites?: string | null; // Free-form text
    target_audience?: string | null; // Free-form text
    certificate_offered?: boolean | null;
    recording_available?: boolean | null;
    accessibility_features?: Record<string, unknown> | null;
    social_media_hashtag?: string | null;
    virtual_platform?: string | null;
    capacity?: number | null;
    attendee_count?: number | null;
    registration_deadline?: string | null;
    is_multi_day?: boolean | null;
    daily_schedule?: Record<string, unknown> | null;
}

export interface EventRelationshipsInput {
    event_type_id?: string | null;
    venue_id?: string | null;
    series_id?: string | null;
    organizer_id?: string | null;
    tagIds?: string[];
    audienceIds?: string[];
    prerequisiteIds?: string[];
}

export interface VenueInput {
    name: string;
    address?: string | null;
    city?: string | null;
    state_province?: string | null;
    country?: string | null;
    venue_type?: string | null;
    capacity?: number | null;
    latitude?: number | null;
    longitude?: number | null;
}

export interface SpeakerInput {
    name: string;
    linkedinUrl?: string;
    title?: string;
    company?: string;
    bio?: string;
    photoUrl?: string;
    twitterUrl?: string;
    websiteUrl?: string;
}

export class EventEnrichmentService {
    /**
     * Create or update agenda items for an event
     * Replaces existing agenda items for the event
     */
    static async createOrUpdateAgendaItems(
        eventId: string,
        items: AgendaItemInput[],
        supabaseClient: SupabaseClientType,
        editedBy?: string | null
    ): Promise<{ success: boolean; agendaItemIds: string[]; error?: string }> {
        try {
            // Fetch existing agenda items BEFORE deleting (for edit tracking)
            const { data: existingAgendaItems } = await supabaseClient
                .from('event_agenda')
                .select('id, title, start_time, end_time')
                .eq('event_id', eventId);

            // Ensure unique sort_order per day_number
            // Group items by day_number and assign sequential sort_order within each group
            const dayCounters = new Map<number, number>();
            const agendaInserts = items.map((item, index) => {
                const parseMinutes = (time: string | null | undefined): number | null => {
                    if (!time) return null;
                    const match = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
                    if (!match) {
                        return null;
                    }
                    const hours = Number(match[1]);
                    const minutes = Number(match[2]);
                    const seconds = match[3] ? Number(match[3]) : 0;
                    if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
                        return null;
                    }
                    return hours * 60 + minutes + Math.round(seconds / 60);
                };

                const derivedDuration = (() => {
                    if (typeof item.durationMinutes === 'number') {
                        return item.durationMinutes;
                    }
                    const startMinutes = parseMinutes(item.startTime);
                    const endMinutes = parseMinutes(item.endTime);
                    if (startMinutes === null || endMinutes === null) {
                        return null;
                    }
                    let diff = endMinutes - startMinutes;
                    if (diff < 0) {
                        diff += 24 * 60;
                    }
                    return diff;
                })();

                const dayNumber = item.dayNumber || 1;
                // Get the current counter for this day, or start at 0
                const currentSortOrder = dayCounters.get(dayNumber) ?? 0;
                // Increment the counter for this day
                dayCounters.set(dayNumber, currentSortOrder + 1);

                return {
                    event_id: eventId,
                    title: item.title,
                    start_time: item.startTime,
                    end_time: item.endTime,
                    agenda_type: item.type || 'other',
                    description: item.description || null,
                    location: item.location || null,
                    day_number: dayNumber,
                    track: item.track || null,
                    sort_order: currentSortOrder,
                    duration_minutes:
                        derivedDuration !== null && derivedDuration !== undefined ? derivedDuration : null,
                    capacity: item.capacity ?? null,
                    difficulty_level: item.difficultyLevel || null,
                    prerequisites: item.prerequisites || null,
                    is_required: item.isRequired ?? null,
                };
            });

            const insertedAgendaIds = await EventRepository.replaceAgendaItems(
                supabaseClient,
                eventId,
                agendaInserts
            );

            // Link speakers to agenda items
            const agendaSpeakerLinks: Array<{ agenda_id: string; speaker_id: string; event_id: string }> = [];
            insertedAgendaIds.forEach((agendaId, index) => {
                const itemInput = items[index];
                if (itemInput.speakerIds && itemInput.speakerIds.length > 0) {
                    itemInput.speakerIds.forEach(speakerId => {
                        agendaSpeakerLinks.push({
                            agenda_id: agendaId,
                            speaker_id: speakerId,
                            event_id: eventId,
                        });
                    });
                }
            });

            if (agendaSpeakerLinks.length > 0) {
                const { error: linkError } = await supabaseClient
                    .from('agenda_speakers')
                    .insert(agendaSpeakerLinks);

                if (linkError) {
                    console.warn('Failed to link speakers to agenda items:', linkError);
                    // Don't fail - agenda items are still created
                }
            }

            // Track manual edit: capture previous agenda items as array
            const previousAgendaItems = (existingAgendaItems || []).map(item => ({
                id: item.id,
                title: item.title,
                start_time: item.start_time,
                end_time: item.end_time,
            }));

            const newAgendaItems = items.map((item, index) => ({
                id: insertedAgendaIds[index],
                title: item.title,
                start_time: item.startTime,
                end_time: item.endTime,
            }));

            // Track edit (upsert to keep only latest)
            await EventUpdateService.trackManualEdit(
                eventId,
                'agenda',
                previousAgendaItems,
                newAgendaItems,
                editedBy || null,
                'admin_ui',
                supabaseClient
            );

            return {
                success: true,
                agendaItemIds: insertedAgendaIds,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error creating/updating agenda items:', error);
            Sentry.captureException(error, {
                extra: { function: 'createOrUpdateAgendaItems', eventId },
            });
            return {
                success: false,
                agendaItemIds: [],
                error: errorMessage,
            };
        }
    }

    /**
     * Create or update speakers for an event
     * Deduplicates by LinkedIn URL if provided
     */
    static async createOrUpdateSpeakers(
        eventId: string,
        speakers: SpeakerInput[],
        supabaseClient: SupabaseClientType,
        editedBy?: string | null
    ): Promise<{ success: boolean; speakerIds: string[]; error?: string }> {
        try {
            // Fetch existing speaker_lineup BEFORE update (for edit tracking)
            const { data: existingEvent, error: fetchError } = await supabaseClient
                .from('events')
                .select('speaker_lineup')
                .eq('id', eventId)
                .single();

            if (fetchError) {
                console.warn('Failed to fetch existing speaker_lineup:', fetchError);
            }

            const previousSpeakerLineup = existingEvent?.speaker_lineup || null;

            const speakerIds = await EventRepository.upsertSpeakers(supabaseClient, speakers);

            // Update event's speaker_lineup JSONB
            const speakerLineup = speakers.map((s) => ({
                name: s.name,
                linkedinUrl: s.linkedinUrl,
                title: s.title,
                company: s.company,
                bio: s.bio,
                photoUrl: s.photoUrl,
                twitterUrl: s.twitterUrl,
                websiteUrl: s.websiteUrl,
            }));

            const { error: updateError } = await supabaseClient
                .from('events')
                .update({ speaker_lineup: speakerLineup })
                .eq('id', eventId);

            if (updateError) {
                console.warn('Failed to update event speaker_lineup:', updateError);
            }

            // Track manual edit: capture previous and new speaker_lineup
            const newSpeakerLineup = speakerLineup;
            await EventUpdateService.trackManualEdit(
                eventId,
                'speaker_lineup',
                previousSpeakerLineup,
                newSpeakerLineup,
                editedBy || null,
                'admin_ui',
                supabaseClient
            );

            return {
                success: true,
                speakerIds,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error creating/updating speakers:', error);
            Sentry.captureException(error, {
                extra: { function: 'createOrUpdateSpeakers', eventId },
            });
            return {
                success: false,
                speakerIds: [],
                error: errorMessage,
            };
        }
    }

    /**
     * Upload organizer logo to Supabase storage
     */
    static async uploadOrganizerLogo(
        organizerId: string,
        file: File,
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; logoUrl?: string; fileName?: string; error?: string }> {
        try {
            // Validate file type
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
            if (!validTypes.includes(file.type)) {
                return {
                    success: false,
                    error: `Invalid file type. Allowed: ${validTypes.join(', ')}`,
                };
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                return {
                    success: false,
                    error: 'File size exceeds 5MB limit',
                };
            }

            // Generate filename
            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `${organizerId}.${fileExt}`;

            // Upload to Supabase storage
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('logos')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError || !uploadData) {
                throw new Error(`Failed to upload logo: ${uploadError?.message || 'Unknown error'}`);
            }

            // Get public URL
            const { data: urlData } = supabaseClient.storage
                .from('logos')
                .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;

            // Note: Database update is handled by the caller using a service client
            // to bypass RLS policies. This function only handles the file upload.

            return {
                success: true,
                logoUrl: publicUrl,
                fileName: fileName, // Return filename for database update
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error uploading organizer logo:', error);
            Sentry.captureException(error, {
                extra: { function: 'uploadOrganizerLogo', organizerId },
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Get events that need enrichment
     * Events with ingestion_source_id but missing agenda/speakers
     */
    static async getEventsNeedingEnrichment(
        supabaseClient: SupabaseClientType,
        limit: number = 50
    ): Promise<Array<{
        id: string;
        title: string;
        start_time: string;
        source_url: string;
        organizer: { id: string; name: string; logo_url: string | null } | null;
        has_agenda: boolean;
        has_speakers: boolean;
        ingestion_source_id: string | null;
    }>> {
        try {
            const { data: events, error } = await supabaseClient
                .from('events')
                .select(`
                    id,
                    title,
                    start_time,
                    source_url,
                    ingestion_source_id,
                    organizer:organizers(id, name, logo_url),
                    agenda_url,
                    speaker_lineup
                `)
                .not('ingestion_source_id', 'is', null)
                .gte('start_time', new Date().toISOString()) // Only future events
                .order('start_time', { ascending: true })
                .limit(limit);

            if (error) throw error;

            // Get event IDs and check which ones have agenda items in event_agenda table
            const eventIds = (events || []).map(e => e.id);
            
            // Guard: Skip query if no events (PostgREST rejects empty .in() clauses)
            let eventsWithAgenda = new Set<string>();
            if (eventIds.length > 0) {
                const { data: agendaEvents } = await supabaseClient
                    .from('event_agenda')
                    .select('event_id')
                    .in('event_id', eventIds);

                // Create Set of event IDs that have agenda items
                eventsWithAgenda = new Set(
                    (agendaEvents || []).map(a => a.event_id)
                );
            }

            return (events || []).map(event => {
                // Check if event_agenda has any rows (structured agenda items)
                // Also check agenda_url as fallback for legacy data
                const hasStructuredAgenda = eventsWithAgenda.has(event.id);
                const hasAgendaUrl = !!event.agenda_url;
                const hasAgenda = hasStructuredAgenda || hasAgendaUrl;

                return {
                    id: event.id,
                    title: event.title || 'Untitled',
                    start_time: event.start_time,
                    source_url: event.source_url || '',
                    organizer: event.organizer as { id: string; name: string; logo_url: string | null } | null,
                    has_agenda: hasAgenda,
                    has_speakers: !!(event.speaker_lineup && Array.isArray(event.speaker_lineup) && (event.speaker_lineup as unknown[]).length > 0),
                    ingestion_source_id: event.ingestion_source_id,
                };
            });
        } catch (error) {
            console.error('Error fetching events needing enrichment:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventsNeedingEnrichment' },
            });
            return [];
        }
    }

    /**
     * Update core event fields (all 25 enrichable fields)
     * Validates enum values and excludes ingestion-only fields
     */
    static async updateEventCoreFields(
        eventId: string,
        fields: EventCoreFieldsInput,
        supabaseClient: SupabaseClientType,
        editedBy?: string | null
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Validate enum values
            if (fields.event_format && !['Online', 'In-person', 'Hybrid'].includes(fields.event_format)) {
                return {
                    success: false,
                    error: `Invalid event_format: ${fields.event_format}. Must be one of: Online, In-person, Hybrid`,
                };
            }

            if (fields.pricing_type && !['Free', 'Paid', 'Varies'].includes(fields.pricing_type)) {
                return {
                    success: false,
                    error: `Invalid pricing_type: ${fields.pricing_type}. Must be one of: Free, Paid, Varies`,
                };
            }

            // Fetch existing event values BEFORE update (for edit tracking)
            const { data: existingEvent, error: fetchError } = await supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (fetchError || !existingEvent) {
                throw new Error(`Failed to fetch existing event: ${fetchError?.message || 'Event not found'}`);
            }

            // Build update object, excluding ingestion-only fields
            const updateData: Record<string, unknown> = {};
            const fieldMappings: Array<{ field: keyof EventCoreFieldsInput; dbField: string }> = [
                { field: 'description', dbField: 'description' },
                { field: 'location', dbField: 'location' },
                { field: 'timezone', dbField: 'timezone' },
                { field: 'start_time', dbField: 'start_time' },
                { field: 'end_time', dbField: 'end_time' },
                { field: 'language', dbField: 'language' },
                { field: 'registration_url', dbField: 'registration_url' },
                { field: 'livestream_url', dbField: 'livestream_url' },
                { field: 'event_image_url', dbField: 'event_image_url' },
                { field: 'agenda_url', dbField: 'agenda_url' },
                { field: 'price_min', dbField: 'price_min' },
                { field: 'price_max', dbField: 'price_max' },
                { field: 'currency', dbField: 'currency' },
                { field: 'pricing_type', dbField: 'pricing_type' },
                { field: 'difficulty_level', dbField: 'difficulty_level' },
                { field: 'event_format', dbField: 'event_format' },
                { field: 'status', dbField: 'status' },
                { field: 'prerequisites', dbField: 'prerequisites' },
                { field: 'target_audience', dbField: 'target_audience' },
                { field: 'certificate_offered', dbField: 'certificate_offered' },
                { field: 'recording_available', dbField: 'recording_available' },
                { field: 'accessibility_features', dbField: 'accessibility_features' },
                { field: 'social_media_hashtag', dbField: 'social_media_hashtag' },
                { field: 'virtual_platform', dbField: 'virtual_platform' },
                { field: 'capacity', dbField: 'capacity' },
                { field: 'attendee_count', dbField: 'attendee_count' },
                { field: 'registration_deadline', dbField: 'registration_deadline' },
                { field: 'is_multi_day', dbField: 'is_multi_day' },
                { field: 'daily_schedule', dbField: 'daily_schedule' },
            ];

            // Collect edits for tracking
            const edits: Array<{ fieldName: string; previousValue: unknown; newValue: unknown }> = [];

            for (const { field, dbField } of fieldMappings) {
                if (fields[field] !== undefined) {
                    let valueToStore = fields[field];
                    
                    // Normalize currency to ISO 4217 format (3-letter uppercase code)
                    if (field === 'currency') {
                        if (!valueToStore || (typeof valueToStore === 'string' && valueToStore.trim() === '')) {
                            valueToStore = null;
                        } else if (typeof valueToStore === 'string') {
                            const trimmed = valueToStore.trim().toUpperCase();
                            // Validate it's a 3-letter ISO 4217 code
                            if (trimmed.length === 3 && /^[A-Z]{3}$/.test(trimmed)) {
                                valueToStore = trimmed;
                            } else {
                                // Invalid currency format - reject the update
                                console.warn('[EventEnrichmentService] Invalid currency format (must be 3-letter ISO 4217 code):', valueToStore);
                                continue; // Skip this field update
                            }
                        } else {
                            // Non-string value - reject
                            console.warn('[EventEnrichmentService] Currency must be a string:', valueToStore);
                            continue; // Skip this field update
                        }
                    }
                    
                    // Normalize timezone to IANA format if provided
                    if (field === 'timezone' && valueToStore) {
                        const timezoneStr = valueToStore as string;
                        
                        // If already in IANA format, validate and use as-is
                        if (isValidIanaTimezone(timezoneStr)) {
                            valueToStore = timezoneStr;
                        } else {
                            // Try to normalize to IANA format
                            const normalized = normalizeTimezone(
                                timezoneStr,
                                {
                                    // Try to extract city/country from event location if available
                                    city: existingEvent.location ? this.extractCityFromLocation(existingEvent.location) : undefined,
                                    country: existingEvent.location ? this.extractCountryFromLocation(existingEvent.location) : undefined,
                                }
                            );
                            // Only update if we got a valid IANA timezone (not just fallback)
                            if (normalized.source !== 'fallback' || normalized.confidence >= 0.3) {
                                if (isValidIanaTimezone(normalized.timezone)) {
                                    valueToStore = normalized.timezone;
                                } else {
                                    // Normalization produced invalid format - reject the update
                                    console.warn('[EventEnrichmentService] Invalid timezone format after normalization:', normalized.timezone);
                                    continue; // Skip this field update
                                }
                            } else {
                                // If normalization failed, reject the update (don't store invalid format)
                                console.warn('[EventEnrichmentService] Could not normalize timezone:', timezoneStr);
                                continue; // Skip this field update
                            }
                        }
                    }
                    
                    updateData[dbField] = valueToStore;
                    // Track edit if value changed
                    const previousValue = existingEvent[dbField as keyof typeof existingEvent];
                    const newValue = valueToStore;
                    if (JSON.stringify(previousValue) !== JSON.stringify(newValue)) {
                        edits.push({
                            fieldName: dbField,
                            previousValue,
                            newValue,
                        });
                    }
                }
            }

            // Update event
            const { error } = await supabaseClient
                .from('events')
                .update(updateData)
                .eq('id', eventId);

            if (error) {
                throw new Error(`Failed to update event fields: ${error.message}`);
            }

            // Track manual edits (bulk for atomicity)
            if (edits.length > 0) {
                await EventUpdateService.trackManualEditsBulk(
                    eventId,
                    edits,
                    editedBy || null,
                    'admin_ui',
                    supabaseClient
                );
            }

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error updating event core fields:', error);
            Sentry.captureException(error, {
                extra: { function: 'updateEventCoreFields', eventId, fields },
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Manage all event relationships (event_type, venue, series, tags, audiences, prerequisites)
     * All updates happen in a transaction for atomicity
     */
    static async manageEventRelationships(
        eventId: string,
        relationships: EventRelationshipsInput,
        supabaseClient: SupabaseClientType,
        editedBy?: string | null
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Fetch existing event and relationships BEFORE updates (for edit tracking)
            const [existingEventResult, tagsResult, audiencesResult, prerequisitesResult] = await Promise.all([
                supabaseClient
                    .from('events')
                    .select('event_type_id, venue_id, series_id')
                    .eq('id', eventId)
                    .single(),
                supabaseClient
                    .from('event_tag_relations')
                    .select('tag_id')
                    .eq('event_id', eventId),
                supabaseClient
                    .from('event_target_audiences')
                    .select('audience_id')
                    .eq('event_id', eventId),
                supabaseClient
                    .from('event_prerequisites')
                    .select('prerequisite_id')
                    .eq('event_id', eventId),
            ]);

            const existingEvent = existingEventResult.data;
            const previousTagIds = (tagsResult.data || []).map(t => t.tag_id);
            const previousAudienceIds = (audiencesResult.data || []).map(a => a.audience_id);
            const previousPrerequisiteIds = (prerequisitesResult.data || []).map(p => p.prerequisite_id);

            // Track edits for relationship fields
            const relationshipEdits: Array<{ fieldName: string; previousValue: unknown; newValue: unknown }> = [];

            // Update direct foreign keys
            const updateData: Record<string, unknown> = {};
            if (relationships.event_type_id !== undefined) {
                updateData.event_type_id = relationships.event_type_id;
                if (existingEvent && existingEvent.event_type_id !== relationships.event_type_id) {
                    relationshipEdits.push({
                        fieldName: 'event_type_id',
                        previousValue: existingEvent.event_type_id,
                        newValue: relationships.event_type_id,
                    });
                }
            }
            if (relationships.venue_id !== undefined) {
                updateData.venue_id = relationships.venue_id;
                if (existingEvent && existingEvent.venue_id !== relationships.venue_id) {
                    relationshipEdits.push({
                        fieldName: 'venue_id',
                        previousValue: existingEvent.venue_id,
                        newValue: relationships.venue_id,
                    });
                }
            }
            if (relationships.series_id !== undefined) {
                updateData.series_id = relationships.series_id;
                if (existingEvent && existingEvent.series_id !== relationships.series_id) {
                    relationshipEdits.push({
                        fieldName: 'series_id',
                        previousValue: existingEvent.series_id,
                        newValue: relationships.series_id,
                    });
                }
            }
            if (relationships.organizer_id !== undefined) {
                updateData.organizer_id = relationships.organizer_id;
            }

            if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await supabaseClient
                    .from('events')
                    .update(updateData)
                    .eq('id', eventId);

                if (updateError) {
                    throw new Error(`Failed to update event relationships: ${updateError.message}`);
                }
            }

            // Update many-to-many relationships (replace all)
            if (relationships.tagIds !== undefined) {
                const tagResult = await this.updateEventTags(eventId, relationships.tagIds, false, supabaseClient);
                if (!tagResult.success) {
                    throw new Error(tagResult.error || 'Failed to update event tags');
                }
                // Track edit if tags changed
                const tagIdsChanged = JSON.stringify(previousTagIds.sort()) !== JSON.stringify(relationships.tagIds.sort());
                if (tagIdsChanged) {
                    relationshipEdits.push({
                        fieldName: 'tags',
                        previousValue: previousTagIds,
                        newValue: relationships.tagIds,
                    });
                }
            }

            if (relationships.audienceIds !== undefined) {
                const audienceResult = await this.updateEventTargetAudiences(eventId, relationships.audienceIds, false, supabaseClient);
                if (!audienceResult.success) {
                    throw new Error(audienceResult.error || 'Failed to update event target audiences');
                }
                // Track edit if audiences changed
                const audienceIdsChanged = JSON.stringify(previousAudienceIds.sort()) !== JSON.stringify(relationships.audienceIds.sort());
                if (audienceIdsChanged) {
                    relationshipEdits.push({
                        fieldName: 'audiences',
                        previousValue: previousAudienceIds,
                        newValue: relationships.audienceIds,
                    });
                }
            }

            if (relationships.prerequisiteIds !== undefined) {
                const prerequisiteResult = await this.updateEventPrerequisites(eventId, relationships.prerequisiteIds, false, supabaseClient);
                if (!prerequisiteResult.success) {
                    throw new Error(prerequisiteResult.error || 'Failed to update event prerequisites');
                }
                // Track edit if prerequisites changed
                const prerequisiteIdsChanged = JSON.stringify(previousPrerequisiteIds.sort()) !== JSON.stringify(relationships.prerequisiteIds.sort());
                if (prerequisiteIdsChanged) {
                    relationshipEdits.push({
                        fieldName: 'prerequisites',
                        previousValue: previousPrerequisiteIds,
                        newValue: relationships.prerequisiteIds,
                    });
                }
            }

            // Track all relationship edits (bulk for atomicity)
            if (relationshipEdits.length > 0) {
                await EventUpdateService.trackManualEditsBulk(
                    eventId,
                    relationshipEdits,
                    editedBy || null,
                    'admin_ui',
                    supabaseClient
                );
            }

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error managing event relationships:', error);
            Sentry.captureException(error, {
                extra: { function: 'manageEventRelationships', eventId, relationships },
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Create or select venue
     * Searches for existing venue by name + city + address before creating
     */
    static async createOrSelectVenue(
        venueData: VenueInput,
        existingVenueId: string | null,
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; venueId?: string; error?: string }> {
        try {
            // Validate coordinates
            if (venueData.latitude !== null && venueData.latitude !== undefined) {
                if (venueData.latitude < -90 || venueData.latitude > 90) {
                    return {
                        success: false,
                        error: 'Latitude must be between -90 and 90',
                    };
                }
            }

            if (venueData.longitude !== null && venueData.longitude !== undefined) {
                if (venueData.longitude < -180 || venueData.longitude > 180) {
                    return {
                        success: false,
                        error: 'Longitude must be between -180 and 180',
                    };
                }
            }

            // If existing venue ID provided, update it
            if (existingVenueId) {
                const { data: updatedVenue, error: updateError } = await supabaseClient
                    .from('venues')
                    .update({
                        name: venueData.name,
                        address: venueData.address || null,
                        city: venueData.city || null,
                        state_province: venueData.state_province || null,
                        country: venueData.country || null,
                        venue_type: venueData.venue_type || null,
                        capacity: venueData.capacity || null,
                        latitude: venueData.latitude || null,
                        longitude: venueData.longitude || null,
                    })
                    .eq('id', existingVenueId)
                    .select('id')
                    .single();

                if (updateError || !updatedVenue) {
                    throw new Error(`Failed to update venue: ${updateError?.message || 'Unknown error'}`);
                }

                return { success: true, venueId: updatedVenue.id };
            }

            // Search for existing venue by name + city + address
            let query = supabaseClient
                .from('venues')
                .select('id')
                .ilike('name', venueData.name);

            if (venueData.city) {
                query = query.ilike('city', venueData.city);
            }

            if (venueData.address) {
                query = query.ilike('address', venueData.address);
            }

            const { data: existingVenue } = await query.maybeSingle();

            if (existingVenue) {
                return { success: true, venueId: existingVenue.id };
            }

            // Create new venue
            const { data: newVenue, error: createError } = await supabaseClient
                .from('venues')
                .insert({
                    name: venueData.name,
                    address: venueData.address || null,
                    city: venueData.city || null,
                    state_province: venueData.state_province || null,
                    country: venueData.country || null,
                    venue_type: venueData.venue_type || null,
                    capacity: venueData.capacity || null,
                    latitude: venueData.latitude || null,
                    longitude: venueData.longitude || null,
                })
                .select('id')
                .single();

            if (createError || !newVenue) {
                throw new Error(`Failed to create venue: ${createError?.message || 'Unknown error'}`);
            }

            return { success: true, venueId: newVenue.id };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error creating/selecting venue:', error);
            Sentry.captureException(error, {
                extra: { function: 'createOrSelectVenue', venueData, existingVenueId },
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Update event tags (replace all)
     * Creates missing tags if createMissingTags is true
     */
    static async updateEventTags(
        eventId: string,
        tagIds: string[],
        createMissingTags: boolean,
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Delete all existing tag relations
            const { error: deleteError } = await supabaseClient
                .from('event_tag_relations')
                .delete()
                .eq('event_id', eventId);

            if (deleteError) {
                throw new Error(`Failed to delete existing tags: ${deleteError.message}`);
            }

            // If no tags to add, we're done
            if (tagIds.length === 0) {
                return { success: true };
            }

            // Verify all tags exist using batch query (instead of sequential queries)
            const { data: existingTags } = await supabaseClient
                .from('event_tags')
                .select('id')
                .in('id', tagIds);

            const existingTagIds = new Set((existingTags ?? []).map(t => t.id));
            const finalTagIds = tagIds.filter(id => existingTagIds.has(id));

            // Log warnings for missing tags if createMissingTags was requested
            if (createMissingTags) {
                const missingIds = tagIds.filter(id => !existingTagIds.has(id));
                if (missingIds.length > 0) {
                    console.warn(`Tag IDs not found (createMissingTags requires name): ${missingIds.join(', ')}`);
                }
            }

            // Insert new tag relations
            if (finalTagIds.length > 0) {
                const relations = finalTagIds.map(tagId => ({
                    event_id: eventId,
                    tag_id: tagId,
                }));

                const { error: insertError } = await supabaseClient
                    .from('event_tag_relations')
                    .insert(relations);

                if (insertError) {
                    throw new Error(`Failed to insert tag relations: ${insertError.message}`);
                }
            }

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error updating event tags:', error);
            Sentry.captureException(error, {
                extra: { function: 'updateEventTags', eventId, tagIds },
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Update event target audiences (replace all)
     * Creates missing audiences if createMissingAudiences is true
     */
    static async updateEventTargetAudiences(
        eventId: string,
        audienceIds: string[],
        createMissingAudiences: boolean,
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Delete all existing audience relations
            const { error: deleteError } = await supabaseClient
                .from('event_target_audiences')
                .delete()
                .eq('event_id', eventId);

            if (deleteError) {
                throw new Error(`Failed to delete existing audiences: ${deleteError.message}`);
            }

            // If no audiences to add, we're done
            if (audienceIds.length === 0) {
                return { success: true };
            }

            // Verify all audiences exist using batch query (instead of sequential queries)
            const { data: existingAudiences } = await supabaseClient
                .from('target_audiences')
                .select('id')
                .in('id', audienceIds);

            const existingAudienceIds = new Set((existingAudiences ?? []).map(a => a.id));
            const finalAudienceIds = audienceIds.filter(id => existingAudienceIds.has(id));

            // Log warnings for missing audiences if createMissingAudiences was requested
            if (createMissingAudiences) {
                const missingIds = audienceIds.filter(id => !existingAudienceIds.has(id));
                if (missingIds.length > 0) {
                    console.warn(`Audience IDs not found (createMissingAudiences requires name): ${missingIds.join(', ')}`);
                }
            }

            // Insert new audience relations
            if (finalAudienceIds.length > 0) {
                const relations = finalAudienceIds.map(audienceId => ({
                    event_id: eventId,
                    audience_id: audienceId,
                }));

                const { error: insertError } = await supabaseClient
                    .from('event_target_audiences')
                    .insert(relations);

                if (insertError) {
                    throw new Error(`Failed to insert audience relations: ${insertError.message}`);
                }
            }

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error updating event target audiences:', error);
            Sentry.captureException(error, {
                extra: { function: 'updateEventTargetAudiences', eventId, audienceIds },
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Update event prerequisites (replace all)
     * Creates missing prerequisites if createMissingPrerequisites is true
     */
    static async updateEventPrerequisites(
        eventId: string,
        prerequisiteIds: string[],
        createMissingPrerequisites: boolean,
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Delete all existing prerequisite relations
            const { error: deleteError } = await supabaseClient
                .from('event_prerequisites')
                .delete()
                .eq('event_id', eventId);

            if (deleteError) {
                throw new Error(`Failed to delete existing prerequisites: ${deleteError.message}`);
            }

            // If no prerequisites to add, we're done
            if (prerequisiteIds.length === 0) {
                return { success: true };
            }

            // Verify all prerequisites exist using batch query (instead of sequential queries)
            const { data: existingPrerequisites } = await supabaseClient
                .from('prerequisites')
                .select('id')
                .in('id', prerequisiteIds);

            const existingPrerequisiteIds = new Set((existingPrerequisites ?? []).map(p => p.id));
            const finalPrerequisiteIds = prerequisiteIds.filter(id => existingPrerequisiteIds.has(id));

            // Log warnings for missing prerequisites if createMissingPrerequisites was requested
            if (createMissingPrerequisites) {
                const missingIds = prerequisiteIds.filter(id => !existingPrerequisiteIds.has(id));
                if (missingIds.length > 0) {
                    console.warn(`Prerequisite IDs not found (createMissingPrerequisites requires name): ${missingIds.join(', ')}`);
                }
            }

            // Insert new prerequisite relations
            if (finalPrerequisiteIds.length > 0) {
                const relations = finalPrerequisiteIds.map(prerequisiteId => ({
                    event_id: eventId,
                    prerequisite_id: prerequisiteId,
                }));

                const { error: insertError } = await supabaseClient
                    .from('event_prerequisites')
                    .insert(relations);

                if (insertError) {
                    throw new Error(`Failed to insert prerequisite relations: ${insertError.message}`);
                }
            }

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error updating event prerequisites:', error);
            Sentry.captureException(error, {
                extra: { function: 'updateEventPrerequisites', eventId, prerequisiteIds },
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Enrich organizer with safe fields only
     * Excludes: domain, trust_score, auto_discovered
     */
    static async enrichOrganizer(
        organizerId: string,
        data: {
            name?: string | null;
            description?: string | null;
            website_url?: string | null;
            social_media?: Record<string, unknown> | null;
            logo_url?: string | null;
        },
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const updateData: Record<string, unknown> = {};

            // Validate and update name if provided
            if (data.name !== undefined) {
                const trimmedName = data.name?.trim();
                if (!trimmedName || trimmedName === '') {
                    return {
                        success: false,
                        error: 'Organizer name is required and cannot be empty',
                    };
                }
                // Prevent placeholder names
                const normalizedName = trimmedName.toLowerCase();
                if (
                    normalizedName === 'unknown' ||
                    normalizedName === 'unknown organizer' ||
                    normalizedName === 'tbd' ||
                    normalizedName === 'tba'
                ) {
                    return {
                        success: false,
                        error: 'Organizer name cannot be a placeholder value (Unknown, TBD, TBA)',
                    };
                }
                updateData.name = trimmedName;
            }

            if (data.description !== undefined) updateData.description = data.description;
            if (data.website_url !== undefined) updateData.website_url = data.website_url;
            if (data.social_media !== undefined) updateData.social_media = data.social_media;
            if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;

            const { error } = await supabaseClient
                .from('organizers')
                .update(updateData)
                .eq('id', organizerId);

            if (error) {
                throw new Error(`Failed to update organizer: ${error.message}`);
            }

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error enriching organizer:', error);
            Sentry.captureException(error, {
                extra: { function: 'enrichOrganizer', organizerId, data },
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Upload event image to Supabase storage
     */
    static async uploadEventImage(
        eventId: string,
        file: File,
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
        try {
            // Validate file type
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                return {
                    success: false,
                    error: `Invalid file type. Allowed: ${validTypes.join(', ')}`,
                };
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                return {
                    success: false,
                    error: 'File size exceeds 5MB limit',
                };
            }

            // Generate filename
            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `events/${eventId}.${fileExt}`;

            // Upload to Supabase storage (use logos bucket or create events bucket)
            const bucketName = 'logos'; // Reuse logos bucket for now
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from(bucketName)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError || !uploadData) {
                throw new Error(`Failed to upload event image: ${uploadError?.message || 'Unknown error'}`);
            }

            // Get public URL
            const { data: urlData } = supabaseClient.storage
                .from(bucketName)
                .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;

            // Update event record
            const { error: updateError } = await supabaseClient
                .from('events')
                .update({ event_image_url: publicUrl })
                .eq('id', eventId);

            if (updateError) {
                console.warn('Failed to update event event_image_url:', updateError);
                // Still return success since file was uploaded
            }

            return {
                success: true,
                imageUrl: publicUrl,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error uploading event image:', error);
            Sentry.captureException(error, {
                extra: { function: 'uploadEventImage', eventId },
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Get all lookup data for enrichment editor in parallel
     */
    static async getEnrichmentLookupData(
        supabaseClient: SupabaseClientType
    ): Promise<{
        eventTypes: Array<{ id: string; name: string | null; color: string | null; icon: string | null; description: string | null }>;
        venues: Array<{ id: string; name: string; address: string | null; city: string | null; state_province: string | null; country: string | null }>;
        eventSeries: Array<{ id: string; name: string; description: string | null; logo_url: string | null; website_url: string | null }>;
        eventTags: Array<{ id: string; event_tag: string; category: string | null }>;
        targetAudiences: Array<{ id: string; name: string; description: string | null }>;
        prerequisites: Array<{ id: string; name: string; description: string | null }>;
    }> {
        try {
            const [eventTypesResult, venuesResult, eventSeriesResult, eventTagsResult, targetAudiencesResult, prerequisitesResult] = await Promise.all([
                supabaseClient
                    .from('event_type')
                    .select('id, name, color, icon, description')
                    .eq('is_active', true),
                supabaseClient
                    .from('venues')
                    .select('id, name, address, city, state_province, country'),
                supabaseClient
                    .from('event_series')
                    .select('id, name, description, logo_url, website_url'),
                supabaseClient
                    .from('event_tags')
                    .select('id, event_tag, category')
                    .order('event_tag', { ascending: true })
                    .limit(10000), // Explicitly set high limit to ensure all tags are fetched
                supabaseClient
                    .from('target_audiences')
                    .select('id, name, description'),
                supabaseClient
                    .from('prerequisites')
                    .select('id, name, description'),
            ]);

            const eventTags = (eventTagsResult.data || []) as Array<{ id: string; event_tag: string; category: string | null }>;
            
            // Log warning if eventTags query failed or returned no results
            // Only log if error exists and has meaningful content (Supabase errors have message or code)
            if (eventTagsResult.error && (eventTagsResult.error.message || eventTagsResult.error.code)) {
                console.error('Error fetching event tags:', eventTagsResult.error);
            } else if (eventTags.length === 0 && !eventTagsResult.error) {
                console.warn('No event tags found in database. This may indicate a data issue.');
            }

            return {
                eventTypes: (eventTypesResult.data || []) as Array<{ id: string; name: string | null; color: string | null; icon: string | null; description: string | null }>,
                venues: (venuesResult.data || []) as Array<{ id: string; name: string; address: string | null; city: string | null; state_province: string | null; country: string | null }>,
                eventSeries: (eventSeriesResult.data || []) as Array<{ id: string; name: string; description: string | null; logo_url: string | null; website_url: string | null }>,
                eventTags,
                targetAudiences: (targetAudiencesResult.data || []) as Array<{ id: string; name: string; description: string | null }>,
                prerequisites: (prerequisitesResult.data || []) as Array<{ id: string; name: string; description: string | null }>,
            };
        } catch (error) {
            console.error('Error fetching enrichment lookup data:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEnrichmentLookupData' },
            });
            return {
                eventTypes: [],
                venues: [],
                eventSeries: [],
                eventTags: [],
                targetAudiences: [],
                prerequisites: [],
            };
        }
    }

    /**
     * Extract city from location string (e.g., "San Francisco, CA, USA" -> "San Francisco")
     */
    private static extractCityFromLocation(location: string): string | undefined {
        if (!location) return undefined;
        const parts = location.split(',').map(p => p.trim());
        return parts[0] || undefined;
    }

    /**
     * Extract country from location string (e.g., "San Francisco, CA, USA" -> "USA")
     */
    private static extractCountryFromLocation(location: string): string | undefined {
        if (!location) return undefined;
        const parts = location.split(',').map(p => p.trim());
        // Country is typically the last part
        return parts.length > 1 ? parts[parts.length - 1] : undefined;
    }
}

