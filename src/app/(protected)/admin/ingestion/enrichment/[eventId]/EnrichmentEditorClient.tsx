/**
 * Enrichment Editor Client Component
 * 
 * Interactive UI for enriching an event with agenda items, speakers, and organizer logo.
 */

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import type { Database } from '@/types/supabase';

interface Speaker {
    id?: string;
    name: string;
    linkedinUrl?: string;
    title?: string;
    company?: string;
    bio?: string;
    photoUrl?: string;
}

interface AgendaItemInput {
    title: string;
    startTime: string;
    endTime: string;
    type?: string;
    description?: string;
    location?: string;
    dayNumber?: number;
    track?: string;
    sortOrder?: number;
    speakerIds?: string[]; // TODO: Future enhancement - allow linking speakers to specific agenda items
    capacity?: number | null;
    difficultyLevel?: string | null;
    prerequisites?: string | null;
    isRequired?: boolean | null;
}

interface LookupData {
    eventTypes: Array<{ id: string; name: string | null; color: string | null; icon: string | null; description: string | null }>;
    venues: Array<{ id: string; name: string; address: string | null; city: string | null; state_province: string | null; country: string | null }>;
    eventSeries: Array<{ id: string; name: string; description: string | null; logo_url: string | null; website_url: string | null }>;
    eventTags: Array<{ id: string; event_tag: string; category: string | null; color: string | null }>;
    targetAudiences: Array<{ id: string; name: string; description: string | null }>;
    prerequisites: Array<{ id: string; name: string; description: string | null }>;
}

type EventsRow = Database['public']['Tables']['events']['Row'];
type OrganizerRow = Database['public']['Tables']['organizers']['Row'];
type EventTypeRow = Database['public']['Tables']['event_type']['Row'];
type VenueRow = Database['public']['Tables']['venues']['Row'];
type EventSeriesRow = Database['public']['Tables']['event_series']['Row'];
type EventTagRelationRow = Database['public']['Tables']['event_tag_relations']['Row'] & {
    event_tags: Database['public']['Tables']['event_tags']['Row'] | null;
};
type EventAudienceRelationRow = Database['public']['Tables']['event_target_audiences']['Row'] & {
    target_audiences: Database['public']['Tables']['target_audiences']['Row'] | null;
};
type EventPrerequisiteRelationRow = Database['public']['Tables']['event_prerequisites']['Row'] & {
    prerequisites: Database['public']['Tables']['prerequisites']['Row'] | null;
};
type EventAgendaRow = Database['public']['Tables']['event_agenda']['Row'];
type AgendaSpeakerRelation = Database['public']['Tables']['agenda_speakers']['Row'] & {
    speakers: Database['public']['Tables']['speakers']['Row'] | null;
};
type EventFormatEnum = Database['public']['Enums']['event_format_enum'];
type PricingTypeEnum = Database['public']['Enums']['pricing_type_enum'];

export type EventWithRelationships = EventsRow & {
    organizer?: OrganizerRow | null;
    event_type?: EventTypeRow | null;
    venue?: VenueRow | null;
    series?: EventSeriesRow | null;
    event_tag_relations?: EventTagRelationRow[] | null;
    event_target_audiences?: EventAudienceRelationRow[] | null;
    event_prerequisites?: EventPrerequisiteRelationRow[] | null;
    speaker_lineup?: Speaker[] | null;
    event_agenda?: EventAgendaRow[] | null;
};

export type AgendaItemWithSpeakers = EventAgendaRow & {
    agenda_speakers?: AgendaSpeakerRelation[] | null;
};

interface CoreFieldsState {
    description: string;
    location: string;
    timezone: string;
    end_time: string | null;
    language: string;
    registration_url: string;
    livestream_url: string;
    event_image_url: string;
    agenda_url: string;
    price_min: number | null;
    price_max: number | null;
    currency: string;
    pricing_type: PricingTypeEnum | null;
    difficulty_level: string | null;
    event_format: EventFormatEnum | null;
    status: string;
    prerequisites: string;
    target_audience: string;
    certificate_offered: boolean;
    recording_available: boolean;
    accessibility_features: Record<string, unknown> | null;
    social_media_hashtag: string;
    virtual_platform: string;
    capacity: number | null;
    attendee_count: number | null;
    registration_deadline: string | null;
    is_multi_day: boolean;
    daily_schedule: Record<string, unknown> | null;
}

interface EnrichmentEditorClientProps {
    event: EventWithRelationships;
    initialAgendaItems: AgendaItemWithSpeakers[];
    lookupData: LookupData;
}

export default function EnrichmentEditorClient({
    event,
    initialAgendaItems,
    lookupData,
}: EnrichmentEditorClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Section collapse state
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        basicInfo: true,
        classification: false,
        timingCapacity: false,
        pricing: false,
        urlsMedia: false,
        features: false,
        socialVirtual: false,
        venue: false,
        series: false,
        agenda: true,
        speakers: true,
        organizer: false,
    });

    // Core event fields state
    const [coreFields, setCoreFields] = useState<CoreFieldsState>({
        description: event.description ?? '',
        location: event.location ?? '',
        timezone: event.timezone ?? '',
        end_time: event.end_time ?? null,
        language: event.language ?? '',
        registration_url: event.registration_url ?? '',
        livestream_url: event.livestream_url ?? '',
        event_image_url: event.event_image_url ?? '',
        agenda_url: event.agenda_url ?? '',
        price_min: event.price_min ?? null,
        price_max: event.price_max ?? null,
        currency: event.currency ?? '',
        pricing_type: event.pricing_type ?? null,
        difficulty_level: event.difficulty_level ?? null,
        event_format: event.event_format ?? null,
        status: event.status ?? '',
        prerequisites: event.prerequisites ?? '',
        target_audience: event.target_audience ?? '',
        certificate_offered: event.certificate_offered ?? false,
        recording_available: event.recording_available ?? false,
        accessibility_features: (event.accessibility_features as Record<string, unknown> | null) ?? null,
        social_media_hashtag: event.social_media_hashtag ?? '',
        virtual_platform: event.virtual_platform ?? '',
        capacity: event.capacity ?? null,
        attendee_count: event.attendee_count ?? null,
        registration_deadline: event.registration_deadline ?? null,
        is_multi_day: event.is_multi_day ?? false,
        daily_schedule: (event.daily_schedule as Record<string, unknown> | null) ?? null,
    });

    // Relationships state
    const [relationships, setRelationships] = useState({
        event_type_id: event.event_type?.id || null,
        venue_id: event.venue?.id || null,
        series_id: event.series?.id || null,
        tagIds: (event.event_tag_relations ?? []).map((relation) => relation.tag_id),
        audienceIds: (event.event_target_audiences ?? []).map((relation) => relation.audience_id),
        prerequisiteIds: (event.event_prerequisites ?? []).map((relation) => relation.prerequisite_id),
    });

    // Venue state (for creating/editing)
    const [venueData, setVenueData] = useState({
        name: event.venue?.name ?? '',
        address: event.venue?.address ?? '',
        city: event.venue?.city ?? '',
        state_province: event.venue?.state_province ?? '',
        country: event.venue?.country ?? '',
        venue_type: event.venue?.venue_type ?? '',
        capacity: event.venue?.capacity ?? null,
        latitude: event.venue?.latitude ?? null,
        longitude: event.venue?.longitude ?? null,
    });
    const [isCreatingVenue, setIsCreatingVenue] = useState(!event.venue?.id);

    // Organizer state
    const [organizerData, setOrganizerData] = useState({
        description: event.organizer?.description || '',
        website_url: event.organizer?.website_url || '',
        social_media: event.organizer?.social_media || null,
    });

    // Agenda state (with enhanced metadata)
    const [agendaItems, setAgendaItems] = useState<AgendaItemInput[]>(
        initialAgendaItems.map(item => ({
            title: item.title,
            startTime: item.start_time,
            endTime: item.end_time || item.start_time,
            type: item.agenda_type || 'other',
            description: item.description || '',
            location: item.location || '',
            dayNumber: item.day_number,
            track: item.track || '',
            sortOrder: item.sort_order ?? 0,
            capacity: item.capacity ?? null,
            difficultyLevel: item.difficulty_level || null,
            prerequisites: item.prerequisites || null,
            isRequired: item.is_required ?? null,
        }))
    );

    // Speakers state
    const [speakers, setSpeakers] = useState<Speaker[]>(
        Array.isArray(event.speaker_lineup) ? (event.speaker_lineup as Speaker[]) : []
    );

    // Logo upload state
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);

    const handleAddAgendaItem = useCallback(() => {
        setAgendaItems([...agendaItems, {
            title: '',
            startTime: '',
            endTime: '',
            type: 'other',
            description: '',
            location: '',
            dayNumber: 1,
            track: '',
            sortOrder: agendaItems.length,
        }]);
    }, [agendaItems]);

    const handleUpdateAgendaItem = useCallback((index: number, updates: Partial<AgendaItemInput>) => {
        const updated = [...agendaItems];
        updated[index] = { ...updated[index], ...updates };
        setAgendaItems(updated);
    }, [agendaItems]);

    const handleRemoveAgendaItem = useCallback((index: number) => {
        setAgendaItems(agendaItems.filter((_, i) => i !== index));
    }, [agendaItems]);

    const handleAddSpeaker = useCallback(() => {
        setSpeakers([...speakers, {
            name: '',
            linkedinUrl: '',
        }]);
    }, [speakers]);

    const handleUpdateSpeaker = useCallback((index: number, updates: Partial<Speaker>) => {
        const updated = [...speakers];
        updated[index] = { ...updated[index], ...updates };
        setSpeakers(updated);
    }, [speakers]);

    const handleRemoveSpeaker = useCallback((index: number) => {
        setSpeakers(speakers.filter((_, i) => i !== index));
    }, [speakers]);

    const handleSaveAgenda = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Validate agenda items
            const validItems = agendaItems.filter(item => 
                item.title && item.startTime && item.endTime
            );

            if (validItems.length === 0 && agendaItems.length > 0) {
                setError('Please fill in at least one complete agenda item (title, start time, end time)');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/admin/ingestion/enrichment/agenda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.id,
                    items: validItems,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save agenda items');
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            Sentry.captureException(err);
        } finally {
            setLoading(false);
        }
    }, [agendaItems, event.id]);

    const handleSaveSpeakers = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Validate speakers
            const validSpeakers = speakers.filter(s => s.name);

            if (validSpeakers.length === 0 && speakers.length > 0) {
                setError('Please fill in at least one speaker name');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/admin/ingestion/enrichment/speakers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.id,
                    speakers: validSpeakers,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save speakers');
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            Sentry.captureException(err);
        } finally {
            setLoading(false);
        }
    }, [speakers, event.id]);

    const handleUploadLogo = useCallback(async () => {
        if (!logoFile || !event.organizer) {
            setError('Please select a logo file');
            return;
        }

        setLogoUploading(true);
        setError(null);
        setSuccess(false);

        try {
            const formData = new FormData();
            formData.append('organizerId', event.organizer.id);
            formData.append('file', logoFile);

            const response = await fetch('/api/admin/ingestion/enrichment/logo', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload logo');
            }

            setSuccess(true);
            setLogoFile(null);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            Sentry.captureException(err);
        } finally {
            setLogoUploading(false);
        }
    }, [logoFile, event.organizer]);

    const handleSaveCoreFields = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch('/api/admin/ingestion/enrichment/event', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.id,
                    coreFields,
                    relationships,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save event fields');
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            Sentry.captureException(err);
        } finally {
            setLoading(false);
        }
    }, [coreFields, relationships, event.id]);

    const toggleSection = useCallback((section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    }, []);

    return (
        <div className="space-y-6">
            {/* Event Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Event Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <p><strong>Title:</strong> {event.title}</p>
                        {event.source_url && (
                            <p>
                                <strong>Source URL:</strong>{' '}
                                <a
                                    href={event.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    {event.source_url}
                                </a>
                            </p>
                        )}
                        {event.organizer && (
                            <p><strong>Organizer:</strong> {event.organizer.name}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Error/Success Messages */}
            {error && (
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error}</p>
                    </CardContent>
                </Card>
            )}
            {success && (
                <Card className="border-green-500">
                    <CardContent className="pt-6">
                        <p className="text-green-600">Saved successfully!</p>
                    </CardContent>
                </Card>
            )}

            {/* Basic Information Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Basic Information</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('basicInfo')}
                        >
                            {expandedSections.basicInfo ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </CardHeader>
                {expandedSections.basicInfo && (
                    <CardContent className="space-y-4">
                        <textarea
                            placeholder="Description"
                            value={coreFields.description}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                            rows={4}
                        />
                        <input
                            type="text"
                            placeholder="Location"
                            value={coreFields.location}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <input
                            type="text"
                            placeholder="Timezone (e.g., America/New_York)"
                            value={coreFields.timezone}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, timezone: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <input
                            type="datetime-local"
                            placeholder="End Time"
                            value={coreFields.end_time ? new Date(coreFields.end_time).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, end_time: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <input
                            type="text"
                            placeholder="Language"
                            value={coreFields.language}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, language: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </CardContent>
                )}
            </Card>

            {/* Event Classification Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Event Classification</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('classification')}
                        >
                            {expandedSections.classification ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </CardHeader>
                {expandedSections.classification && (
                    <CardContent className="space-y-4">
                        <select
                            value={relationships.event_type_id || ''}
                            onChange={(e) => setRelationships(prev => ({ ...prev, event_type_id: e.target.value || null }))}
                            className="w-full px-3 py-2 border rounded"
                        >
                            <option value="">Select Event Type</option>
                            {lookupData.eventTypes.map(type => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                        <select
                            value={coreFields.event_format || ''}
                            onChange={(e) => {
                                const value = e.target.value as EventFormatEnum | '';
                                setCoreFields(prev => ({
                                    ...prev,
                                    event_format: value ? (value as EventFormatEnum) : null,
                                }));
                            }}
                            className="w-full px-3 py-2 border rounded"
                        >
                            <option value="">Select Format</option>
                            <option value="Online">Online</option>
                            <option value="In-person">In-person</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Status (free-form)"
                            value={coreFields.status}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <select
                            value={coreFields.difficulty_level || ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, difficulty_level: e.target.value || null }))}
                            className="w-full px-3 py-2 border rounded"
                        >
                            <option value="">Select Difficulty</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                        <div>
                            <label className="block text-sm font-medium mb-2">Tags (multi-select)</label>
                            <select
                                multiple
                                value={relationships.tagIds}
                                onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    setRelationships(prev => ({ ...prev, tagIds: selected }));
                                }}
                                className="w-full px-3 py-2 border rounded min-h-[100px]"
                            >
                                {lookupData.eventTags.map(tag => (
                                    <option key={tag.id} value={tag.id}>{tag.event_tag}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Target Audiences (multi-select + free-form)</label>
                            <select
                                multiple
                                value={relationships.audienceIds}
                                onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    setRelationships(prev => ({ ...prev, audienceIds: selected }));
                                }}
                                className="w-full px-3 py-2 border rounded mb-2 min-h-[80px]"
                            >
                                {lookupData.targetAudiences.map(audience => (
                                    <option key={audience.id} value={audience.id}>{audience.name}</option>
                                ))}
                            </select>
                            <textarea
                                placeholder="Target Audience (free-form text - can be used alongside selections above)"
                                value={coreFields.target_audience}
                                onChange={(e) => setCoreFields(prev => ({ ...prev, target_audience: e.target.value }))}
                                className="w-full px-3 py-2 border rounded"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Prerequisites (multi-select + free-form)</label>
                            <select
                                multiple
                                value={relationships.prerequisiteIds}
                                onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    setRelationships(prev => ({ ...prev, prerequisiteIds: selected }));
                                }}
                                className="w-full px-3 py-2 border rounded mb-2 min-h-[80px]"
                            >
                                {lookupData.prerequisites.map(prereq => (
                                    <option key={prereq.id} value={prereq.id}>{prereq.name}</option>
                                ))}
                            </select>
                            <textarea
                                placeholder="Prerequisites (free-form text - can be used alongside selections above)"
                                value={coreFields.prerequisites}
                                onChange={(e) => setCoreFields(prev => ({ ...prev, prerequisites: e.target.value }))}
                                className="w-full px-3 py-2 border rounded"
                                rows={2}
                            />
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Timing & Capacity Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Timing & Capacity</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('timingCapacity')}
                        >
                            {expandedSections.timingCapacity ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </CardHeader>
                {expandedSections.timingCapacity && (
                    <CardContent className="space-y-4">
                        <input
                            type="datetime-local"
                            placeholder="Registration Deadline"
                            value={coreFields.registration_deadline ? new Date(coreFields.registration_deadline).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, registration_deadline: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <input
                            type="number"
                            placeholder="Capacity"
                            value={coreFields.capacity ?? ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, capacity: e.target.value ? parseInt(e.target.value) : null }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <input
                            type="number"
                            placeholder="Attendee Count (read-only)"
                            value={coreFields.attendee_count ?? ''}
                            disabled
                            className="w-full px-3 py-2 border rounded bg-gray-100"
                        />
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={coreFields.is_multi_day}
                                onChange={(e) => setCoreFields(prev => ({ ...prev, is_multi_day: e.target.checked }))}
                            />
                            <span>Is Multi-day Event</span>
                        </label>
                    </CardContent>
                )}
            </Card>

            {/* Pricing Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Pricing</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('pricing')}
                        >
                            {expandedSections.pricing ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </CardHeader>
                {expandedSections.pricing && (
                    <CardContent className="space-y-4">
                        <select
                            value={coreFields.pricing_type || ''}
                            onChange={(e) => {
                                const value = e.target.value as PricingTypeEnum | '';
                                setCoreFields(prev => ({
                                    ...prev,
                                    pricing_type: value ? (value as PricingTypeEnum) : null,
                                }));
                            }}
                            className="w-full px-3 py-2 border rounded"
                        >
                            <option value="">Select Pricing Type</option>
                            <option value="Free">Free</option>
                            <option value="Paid">Paid</option>
                            <option value="Varies">Varies</option>
                        </select>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Price Min"
                            value={coreFields.price_min ?? ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, price_min: e.target.value ? parseFloat(e.target.value) : null }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Price Max"
                            value={coreFields.price_max ?? ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, price_max: e.target.value ? parseFloat(e.target.value) : null }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <input
                            type="text"
                            placeholder="Currency (ISO 4217, e.g., USD)"
                            value={coreFields.currency}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, currency: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </CardContent>
                )}
            </Card>

            {/* URLs & Media Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>URLs & Media</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('urlsMedia')}
                        >
                            {expandedSections.urlsMedia ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </CardHeader>
                {expandedSections.urlsMedia && (
                    <CardContent className="space-y-4">
                        <input
                            type="url"
                            placeholder="Registration URL"
                            value={coreFields.registration_url}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, registration_url: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <input
                            type="url"
                            placeholder="Livestream URL"
                            value={coreFields.livestream_url}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, livestream_url: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <input
                            type="url"
                            placeholder="Agenda URL"
                            value={coreFields.agenda_url}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, agenda_url: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <div>
                            <label className="block text-sm font-medium mb-2">Event Image</label>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const formData = new FormData();
                                        formData.append('eventId', event.id);
                                        formData.append('file', file);
                                        const response = await fetch('/api/admin/ingestion/enrichment/image', {
                                            method: 'POST',
                                            body: formData,
                                        });
                                        const data = await response.json();
                                        if (response.ok && data.imageUrl) {
                                            setCoreFields(prev => ({ ...prev, event_image_url: data.imageUrl }));
                                            setSuccess(true);
                                            setTimeout(() => setSuccess(false), 3000);
                                        } else {
                                            setError(data.error || 'Failed to upload image');
                                        }
                                    }
                                }}
                                className="w-full"
                            />
                            {coreFields.event_image_url && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Current: <a href={coreFields.event_image_url} target="_blank" rel="noopener noreferrer" className="text-primary">{coreFields.event_image_url}</a>
                                </p>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Features Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Features</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('features')}
                        >
                            {expandedSections.features ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </CardHeader>
                {expandedSections.features && (
                    <CardContent className="space-y-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={coreFields.certificate_offered}
                                onChange={(e) => setCoreFields(prev => ({ ...prev, certificate_offered: e.target.checked }))}
                            />
                            <span>Certificate Offered</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={coreFields.recording_available}
                                onChange={(e) => setCoreFields(prev => ({ ...prev, recording_available: e.target.checked }))}
                            />
                            <span>Recording Available</span>
                        </label>
                        <div>
                            <label className="block text-sm font-medium mb-2">Accessibility Features (JSON)</label>
                            <textarea
                                placeholder='{"wheelchair_accessible": true, "sign_language": false}'
                                value={coreFields.accessibility_features ? JSON.stringify(coreFields.accessibility_features, null, 2) : ''}
                                onChange={(e) => {
                                    try {
                                        const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                                        setCoreFields(prev => ({ ...prev, accessibility_features: parsed }));
                                    } catch {
                                        // Invalid JSON, keep as is
                                    }
                                }}
                                className="w-full px-3 py-2 border rounded font-mono text-sm"
                                rows={4}
                            />
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Social & Virtual Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Social & Virtual</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('socialVirtual')}
                        >
                            {expandedSections.socialVirtual ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </CardHeader>
                {expandedSections.socialVirtual && (
                    <CardContent className="space-y-4">
                        <input
                            type="text"
                            placeholder="Social Media Hashtag"
                            value={coreFields.social_media_hashtag}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, social_media_hashtag: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                        <input
                            type="text"
                            placeholder="Virtual Platform"
                            value={coreFields.virtual_platform}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, virtual_platform: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </CardContent>
                )}
            </Card>

            {/* Save All Button */}
            <Card>
                <CardContent className="pt-6">
                    <Button
                        onClick={handleSaveCoreFields}
                        disabled={loading}
                        className="w-full"
                        size="lg"
                    >
                        {loading ? 'Saving...' : 'Save All Event Fields'}
                    </Button>
                </CardContent>
            </Card>

            {/* Agenda Items Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Agenda Items</CardTitle>
                            <CardDescription>
                                Add agenda items with times, descriptions, and speakers
                            </CardDescription>
                        </div>
                        <Button onClick={handleAddAgendaItem} size="sm">
                            Add Item
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {agendaItems.map((item, index) => (
                            <div key={index} className="border rounded-lg p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Title"
                                        value={item.title}
                                        onChange={(e) => handleUpdateAgendaItem(index, { title: e.target.value })}
                                        className="px-3 py-2 border rounded"
                                    />
                                    <select
                                        value={item.type}
                                        onChange={(e) => handleUpdateAgendaItem(index, { type: e.target.value })}
                                        className="px-3 py-2 border rounded"
                                    >
                                        <option value="keynote">Keynote</option>
                                        <option value="session">Session</option>
                                        <option value="workshop">Workshop</option>
                                        <option value="panel">Panel</option>
                                        <option value="break">Break</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="datetime-local"
                                        placeholder="Start Time"
                                        value={item.startTime ? new Date(item.startTime).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => handleUpdateAgendaItem(index, { startTime: new Date(e.target.value).toISOString() })}
                                        className="px-3 py-2 border rounded"
                                    />
                                    <input
                                        type="datetime-local"
                                        placeholder="End Time"
                                        value={item.endTime ? new Date(item.endTime).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => handleUpdateAgendaItem(index, { endTime: new Date(e.target.value).toISOString() })}
                                        className="px-3 py-2 border rounded"
                                    />
                                </div>
                                <textarea
                                    placeholder="Description (optional)"
                                    value={item.description || ''}
                                    onChange={(e) => handleUpdateAgendaItem(index, { description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    rows={2}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        placeholder="Capacity"
                                        value={item.capacity ?? ''}
                                        onChange={(e) => handleUpdateAgendaItem(index, { capacity: e.target.value ? parseInt(e.target.value) : null })}
                                        className="px-3 py-2 border rounded"
                                    />
                                    <select
                                        value={item.difficultyLevel || ''}
                                        onChange={(e) => handleUpdateAgendaItem(index, { difficultyLevel: e.target.value || null })}
                                        className="px-3 py-2 border rounded"
                                    >
                                        <option value="">Difficulty Level</option>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                                <textarea
                                    placeholder="Prerequisites (optional)"
                                    value={item.prerequisites || ''}
                                    onChange={(e) => handleUpdateAgendaItem(index, { prerequisites: e.target.value || null })}
                                    className="w-full px-3 py-2 border rounded"
                                    rows={2}
                                />
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={item.isRequired || false}
                                        onChange={(e) => handleUpdateAgendaItem(index, { isRequired: e.target.checked })}
                                    />
                                    <span>Is Required</span>
                                </label>
                                <div className="flex justify-end">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleRemoveAgendaItem(index)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {agendaItems.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">
                                No agenda items yet. Add an item to get started.
                            </p>
                        )}
                    </div>
                    <div className="mt-4">
                        <Button
                            onClick={handleSaveAgenda}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? 'Saving...' : 'Save Agenda Items'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Speakers Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Speakers</CardTitle>
                            <CardDescription>
                                Add speakers with LinkedIn URLs and other details
                            </CardDescription>
                        </div>
                        <Button onClick={handleAddSpeaker} size="sm">
                            Add Speaker
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {speakers.map((speaker, index) => (
                            <div key={index} className="border rounded-lg p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Speaker Name *"
                                        value={speaker.name}
                                        onChange={(e) => handleUpdateSpeaker(index, { name: e.target.value })}
                                        className="px-3 py-2 border rounded"
                                        required
                                    />
                                    <input
                                        type="url"
                                        placeholder="LinkedIn URL"
                                        value={speaker.linkedinUrl || ''}
                                        onChange={(e) => handleUpdateSpeaker(index, { linkedinUrl: e.target.value })}
                                        className="px-3 py-2 border rounded"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Title (optional)"
                                        value={speaker.title || ''}
                                        onChange={(e) => handleUpdateSpeaker(index, { title: e.target.value })}
                                        className="px-3 py-2 border rounded"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Company (optional)"
                                        value={speaker.company || ''}
                                        onChange={(e) => handleUpdateSpeaker(index, { company: e.target.value })}
                                        className="px-3 py-2 border rounded"
                                    />
                                </div>
                                <textarea
                                    placeholder="Bio (optional)"
                                    value={speaker.bio || ''}
                                    onChange={(e) => handleUpdateSpeaker(index, { bio: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    rows={2}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleRemoveSpeaker(index)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {speakers.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">
                                No speakers yet. Add a speaker to get started.
                            </p>
                        )}
                    </div>
                    <div className="mt-4">
                        <Button
                            onClick={handleSaveSpeakers}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? 'Saving...' : 'Save Speakers'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Venue Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Venue</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('venue')}
                        >
                            {expandedSections.venue ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </CardHeader>
                {expandedSections.venue && (
                    <CardContent className="space-y-4">
                        <div>
                            <label className="flex items-center space-x-2 mb-2">
                                <input
                                    type="checkbox"
                                    checked={isCreatingVenue}
                                    onChange={(e) => setIsCreatingVenue(e.target.checked)}
                                />
                                <span>Create New Venue</span>
                            </label>
                            {!isCreatingVenue && (
                                <select
                                    value={relationships.venue_id || ''}
                                    onChange={(e) => setRelationships(prev => ({ ...prev, venue_id: e.target.value || null }))}
                                    className="w-full px-3 py-2 border rounded"
                                >
                                    <option value="">Select Existing Venue</option>
                                    {lookupData.venues.map(venue => (
                                        <option key={venue.id} value={venue.id}>
                                            {venue.name} {venue.city ? `(${venue.city})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        {isCreatingVenue && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Venue Name *"
                                    value={venueData.name}
                                    onChange={(e) => setVenueData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                />
                                <textarea
                                    placeholder="Address"
                                    value={venueData.address}
                                    onChange={(e) => setVenueData(prev => ({ ...prev, address: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded"
                                    rows={2}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="City"
                                        value={venueData.city}
                                        onChange={(e) => setVenueData(prev => ({ ...prev, city: e.target.value }))}
                                        className="px-3 py-2 border rounded"
                                    />
                                    <input
                                        type="text"
                                        placeholder="State/Province"
                                        value={venueData.state_province}
                                        onChange={(e) => setVenueData(prev => ({ ...prev, state_province: e.target.value }))}
                                        className="px-3 py-2 border rounded"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Country"
                                        value={venueData.country}
                                        onChange={(e) => setVenueData(prev => ({ ...prev, country: e.target.value }))}
                                        className="px-3 py-2 border rounded"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Venue Type"
                                        value={venueData.venue_type}
                                        onChange={(e) => setVenueData(prev => ({ ...prev, venue_type: e.target.value }))}
                                        className="px-3 py-2 border rounded"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <input
                                        type="number"
                                        placeholder="Capacity"
                                        value={venueData.capacity ?? ''}
                                        onChange={(e) => setVenueData(prev => ({ ...prev, capacity: e.target.value ? parseInt(e.target.value) : null }))}
                                        className="px-3 py-2 border rounded"
                                    />
                                    <input
                                        type="number"
                                        step="0.000001"
                                        placeholder="Latitude"
                                        value={venueData.latitude ?? ''}
                                        onChange={(e) => setVenueData(prev => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : null }))}
                                        className="px-3 py-2 border rounded"
                                    />
                                    <input
                                        type="number"
                                        step="0.000001"
                                        placeholder="Longitude"
                                        value={venueData.longitude ?? ''}
                                        onChange={(e) => setVenueData(prev => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : null }))}
                                        className="px-3 py-2 border rounded"
                                    />
                                </div>
                                <Button
                                    onClick={async () => {
                                        const response = await fetch('/api/admin/ingestion/enrichment/venue', {
                                            method: isCreatingVenue ? 'POST' : 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                venueId: event.venue?.id,
                                                venueData,
                                            }),
                                        });
                                        const data = await response.json();
                                        if (response.ok && data.venueId) {
                                            setRelationships(prev => ({ ...prev, venue_id: data.venueId }));
                                            setSuccess(true);
                                            setTimeout(() => setSuccess(false), 3000);
                                        } else {
                                            setError(data.error || 'Failed to save venue');
                                        }
                                    }}
                                    className="w-full"
                                >
                                    {isCreatingVenue ? 'Create Venue' : 'Update Venue'}
                                </Button>
                            </>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Event Series Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Event Series</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('series')}
                        >
                            {expandedSections.series ? 'Collapse' : 'Expand'}
                        </Button>
                    </div>
                </CardHeader>
                {expandedSections.series && (
                    <CardContent className="space-y-4">
                        <select
                            value={relationships.series_id || ''}
                            onChange={(e) => setRelationships(prev => ({ ...prev, series_id: e.target.value || null }))}
                            className="w-full px-3 py-2 border rounded"
                        >
                            <option value="">Select Event Series</option>
                            {lookupData.eventSeries.map(series => (
                                <option key={series.id} value={series.id}>
                                    {series.name}
                                </option>
                            ))}
                        </select>
                        {event.series && (
                            <div className="text-sm text-muted-foreground">
                                <p><strong>Description:</strong> {event.series.description || 'N/A'}</p>
                                {event.series.website_url && (
                                    <p><strong>Website:</strong> <a href={event.series.website_url} target="_blank" rel="noopener noreferrer" className="text-primary">{event.series.website_url}</a></p>
                                )}
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Organizer Section (Enhanced) */}
            {event.organizer && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Organizer</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleSection('organizer')}
                            >
                                {expandedSections.organizer ? 'Collapse' : 'Expand'}
                            </Button>
                        </div>
                    </CardHeader>
                    {expandedSections.organizer && (
                        <CardContent className="space-y-4">
                            <textarea
                                placeholder="Description"
                                value={organizerData.description}
                                onChange={(e) => setOrganizerData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border rounded"
                                rows={3}
                            />
                            <input
                                type="url"
                                placeholder="Website URL"
                                value={organizerData.website_url}
                                onChange={(e) => setOrganizerData(prev => ({ ...prev, website_url: e.target.value }))}
                                className="w-full px-3 py-2 border rounded"
                            />
                            <div>
                                <label className="block text-sm font-medium mb-2">Social Media (JSON)</label>
                                <textarea
                                    placeholder='{"twitter": "@handle", "linkedin": "company/page"}'
                                    value={organizerData.social_media ? JSON.stringify(organizerData.social_media, null, 2) : ''}
                                    onChange={(e) => {
                                        try {
                                            const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                                            setOrganizerData(prev => ({ ...prev, social_media: parsed }));
                                        } catch {
                                            // Invalid JSON, keep as is
                                        }
                                    }}
                                    className="w-full px-3 py-2 border rounded font-mono text-sm"
                                    rows={4}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Logo</label>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                    className="w-full"
                                />
                                {event.organizer.logo_url && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Current logo: {event.organizer.logo_url}
                                    </p>
                                )}
                                <Button
                                    onClick={handleUploadLogo}
                                    disabled={!logoFile || logoUploading}
                                    className="w-full mt-2"
                                >
                                    {logoUploading ? 'Uploading...' : 'Upload Logo'}
                                </Button>
                            </div>
                            <Button
                                onClick={async () => {
                                    const response = await fetch('/api/admin/ingestion/enrichment/organizer', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            organizerId: event.organizer?.id ?? null,
                                            data: organizerData,
                                        }),
                                    });
                                    const data = await response.json();
                                    if (response.ok) {
                                        setSuccess(true);
                                        setTimeout(() => setSuccess(false), 3000);
                                    } else {
                                        setError(data.error || 'Failed to update organizer');
                                    }
                                }}
                                className="w-full"
                            >
                                Save Organizer
                            </Button>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Back Button */}
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    onClick={() => router.push('/admin/ingestion/enrichment')}
                >
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}

