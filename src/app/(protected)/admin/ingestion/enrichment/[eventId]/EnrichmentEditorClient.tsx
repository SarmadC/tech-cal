/**
 * Enrichment Editor Client Component
 *
 * Interactive UI for enriching an event with agenda items, speakers, and organizer logo.
 * Refactored to use section components for maintainability.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import LogoExtractorModal from '@/components/admin/LogoExtractorModal';
import { cn } from '@/lib/utils';

// Import section components
import {
    BasicInfoSection,
    ClassificationSection,
    TimingCapacitySection,
    PricingSection,
    FeaturesSection,
    SocialVirtualSection,
    AgendaSection,
    SpeakersSection,
} from '@/components/admin/enrichment/sections';

// Import types from shared types file
import type {
    EventWithRelationships,
    AgendaItemWithSpeakers,
    LookupData,
    CoreFieldsState,
    RelationshipsState,
    VenueData,
    OrganizerData,
    AgendaItemInput,
    Speaker,
} from '@/components/admin/enrichment/types';

// Re-export types for backward compatibility
export type { EventWithRelationships, AgendaItemWithSpeakers };

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
        start_time: event.start_time ?? null,
        end_time: event.end_time ?? null,
        language: event.language ?? '',
        source_url: event.source_url ?? '',
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
    const [relationships, setRelationships] = useState<RelationshipsState>({
        event_type_id: event.event_type?.id || null,
        venue_id: event.venue?.id || null,
        series_id: event.series?.id || null,
        tagIds: (event.event_tag_relations ?? []).map((relation) => relation.tag_id),
        audienceIds: (event.event_target_audiences ?? []).map((relation) => relation.audience_id),
        prerequisiteIds: (event.event_prerequisites ?? []).map((relation) => relation.prerequisite_id),
    });

    // Venue state (for creating/editing)
    const [venueData, setVenueData] = useState<VenueData>({
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
    const [organizerData, setOrganizerData] = useState<OrganizerData>({
        description: event.organizer?.description || '',
        website_url: event.organizer?.website_url || '',
        social_media: (event.organizer?.social_media as Record<string, unknown>) || null,
    });

    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const expandedDescriptionRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (isDescriptionExpanded) {
            expandedDescriptionRef.current?.focus();
        }
    }, [isDescriptionExpanded]);

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
    const [logoUploadMode, setLogoUploadMode] = useState<'manual' | 'extract'>('manual');
    const [logoExtractorOpen, setLogoExtractorOpen] = useState(false);
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(
        event.organizer?.logo_url || null
    );

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
            // Update the current logo URL display
            if (data.logoUrl) {
                console.log('Setting logo URL:', data.logoUrl);
                // Add cache-busting to force image refresh
                const cleanUrl = data.logoUrl.split('?')[0];
                const urlWithCache = `${cleanUrl}?t=${Date.now()}`;
                setCurrentLogoUrl(urlWithCache);
            } else {
                console.warn('No logoUrl in response:', data);
            }
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            Sentry.captureException(err);
        } finally {
            setLogoUploading(false);
        }
    }, [logoFile, event.organizer]);

    const handleLogoFromUrl = useCallback(async (imageUrl: string) => {
        if (!event.organizer) {
            setError('No organizer to attach logo to');
            return;
        }

        setLogoUploading(true);
        setError(null);
        setSuccess(false);

        try {
            // Fetch the image through server-side proxy to bypass CSP
            const fetchResponse = await fetch('/api/admin/ingestion/enrichment/fetch-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl }),
            });

            const fetchData = await fetchResponse.json();

            if (!fetchResponse.ok) {
                throw new Error(fetchData.error || 'Failed to fetch image from URL');
            }

            // Validate fetch response data
            if (!fetchData.imageData || !fetchData.contentType || !fetchData.filename) {
                throw new Error('Invalid response from image fetch: missing required fields');
            }

            // Convert base64 back to blob
            let binaryString: string;
            try {
                binaryString = atob(fetchData.imageData);
            } catch (err) {
                throw new Error('Failed to decode base64 image data');
            }

            if (binaryString.length === 0) {
                throw new Error('Decoded image data is empty');
            }

            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: fetchData.contentType });
            
            // Validate blob size
            if (blob.size === 0) {
                throw new Error('Blob size is 0 bytes');
            }

            // Create File object with proper properties
            const file = new File([blob], fetchData.filename, { 
                type: fetchData.contentType,
                lastModified: Date.now(),
            });

            // Validate file object
            if (file.size === 0) {
                throw new Error('File size is 0 bytes after creation');
            }

            if (!file.type || !file.type.startsWith('image/')) {
                console.warn('File type may be invalid:', file.type);
            }

            console.log('Created file for upload:', {
                name: file.name,
                size: file.size,
                type: file.type,
            });

            // Upload to Supabase
            const formData = new FormData();
            formData.append('organizerId', event.organizer.id);
            formData.append('file', file);

            const uploadResponse = await fetch('/api/admin/ingestion/enrichment/logo', {
                method: 'POST',
                body: formData,
            });

            let data;
            try {
                data = await uploadResponse.json();
            } catch (parseError) {
                console.error('Failed to parse upload response:', parseError);
                throw new Error(`Failed to upload logo: Invalid response from server (${uploadResponse.status})`);
            }

            if (!uploadResponse.ok) {
                const errorMessage = data?.error || `Failed to upload logo: HTTP ${uploadResponse.status}`;
                console.error('Logo upload failed:', {
                    status: uploadResponse.status,
                    error: errorMessage,
                    data,
                });
                throw new Error(errorMessage);
            }

            setSuccess(true);
            if (data.logoUrl) {
                console.log('Setting logo URL:', data.logoUrl);
                // Add cache-busting to force image refresh
                const cleanUrl = data.logoUrl.split('?')[0];
                const urlWithCache = `${cleanUrl}?t=${Date.now()}`;
                setCurrentLogoUrl(urlWithCache);
            } else {
                console.warn('No logoUrl in response:', data);
            }
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            Sentry.captureException(err);
        } finally {
            setLogoUploading(false);
        }
    }, [event.organizer]);

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
                        <p>
                            <strong>Source URL:</strong>{' '}
                            {coreFields.source_url ? (
                                <a
                                    href={coreFields.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    {coreFields.source_url}
                                </a>
                            ) : (
                                <span className="text-slate-500">Not set</span>
                            )}
                        </p>
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
            <BasicInfoSection
                expanded={expandedSections.basicInfo}
                onToggle={() => toggleSection('basicInfo')}
                coreFields={coreFields}
                setCoreFields={setCoreFields}
                onExpandDescription={() => setIsDescriptionExpanded(true)}
            />

            {/* Event Classification Section */}
            <ClassificationSection
                expanded={expandedSections.classification}
                onToggle={() => toggleSection('classification')}
                coreFields={coreFields}
                setCoreFields={setCoreFields}
                relationships={relationships}
                setRelationships={setRelationships}
                lookupData={lookupData}
                eventTagRelations={event.event_tag_relations ?? null}
            />

            {/* Timing & Capacity Section */}
            <TimingCapacitySection
                expanded={expandedSections.timingCapacity}
                onToggle={() => toggleSection('timingCapacity')}
                coreFields={coreFields}
                setCoreFields={setCoreFields}
            />

            {/* Pricing Section */}
            <PricingSection
                expanded={expandedSections.pricing}
                onToggle={() => toggleSection('pricing')}
                coreFields={coreFields}
                setCoreFields={setCoreFields}
            />

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
                            placeholder="Source URL"
                            value={coreFields.source_url}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, source_url: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                        />
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
            <FeaturesSection
                expanded={expandedSections.features}
                onToggle={() => toggleSection('features')}
                coreFields={coreFields}
                setCoreFields={setCoreFields}
            />

            {/* Social & Virtual Section */}
            <SocialVirtualSection
                expanded={expandedSections.socialVirtual}
                onToggle={() => toggleSection('socialVirtual')}
                coreFields={coreFields}
                setCoreFields={setCoreFields}
            />

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
            <AgendaSection
                agendaItems={agendaItems}
                onAdd={handleAddAgendaItem}
                onUpdate={handleUpdateAgendaItem}
                onRemove={handleRemoveAgendaItem}
                onSave={handleSaveAgenda}
                loading={loading}
            />

            {/* Speakers Section */}
            <SpeakersSection
                speakers={speakers}
                onAdd={handleAddSpeaker}
                onUpdate={handleUpdateSpeaker}
                onRemove={handleRemoveSpeaker}
                onSave={handleSaveSpeakers}
                loading={loading}
            />

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

                            {/* Enhanced Logo Section */}
                            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                                <label className="block text-sm font-semibold text-slate-200 mb-3">
                                    Organizer Logo
                                </label>

                                {/* Current Logo Preview */}
                                {currentLogoUrl && (
                                    <div className="mb-4 flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                                        <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-600 bg-white">
                                            <Image
                                                key={currentLogoUrl}
                                                src={
                                                    currentLogoUrl.startsWith('http') 
                                                        ? currentLogoUrl 
                                                        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${currentLogoUrl}`
                                                }
                                                alt="Current logo"
                                                fill
                                                className="object-contain p-1"
                                                unoptimized
                                                onError={(e) => {
                                                    console.error('Failed to load logo:', currentLogoUrl);
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-200">Current Logo</p>
                                            <p className="max-w-[300px] truncate text-xs text-slate-400">
                                                {currentLogoUrl}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Upload Mode Tabs */}
                                <div className="mb-4 flex gap-1 rounded-lg bg-slate-800 p-1">
                                    <button
                                        type="button"
                                        onClick={() => setLogoUploadMode('manual')}
                                        className={cn(
                                            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                            logoUploadMode === 'manual'
                                                ? 'bg-slate-700 text-slate-100'
                                                : 'text-slate-400 hover:text-slate-200'
                                        )}
                                    >
                                        Manual Upload
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLogoUploadMode('extract')}
                                        className={cn(
                                            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                            logoUploadMode === 'extract'
                                                ? 'bg-slate-700 text-slate-100'
                                                : 'text-slate-400 hover:text-slate-200'
                                        )}
                                    >
                                        Extract from URL
                                    </button>
                                </div>

                                {logoUploadMode === 'manual' ? (
                                    <div className="space-y-3">
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded file:border-0 file:bg-slate-600 file:px-3 file:py-1 file:text-sm file:text-slate-100"
                                        />
                                        <Button
                                            onClick={handleUploadLogo}
                                            disabled={!logoFile || logoUploading}
                                            className="w-full"
                                        >
                                            {logoUploading ? 'Uploading...' : 'Upload Logo'}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-xs text-slate-400">
                                            Extract logos from an event or company website. We&apos;ll scan the page for images and let you pick the best one.
                                        </p>
                                        <Button
                                            onClick={() => setLogoExtractorOpen(true)}
                                            disabled={logoUploading}
                                            variant="secondary"
                                            className="w-full"
                                        >
                                            {logoUploading ? 'Processing...' : 'Open Logo Extractor'}
                                        </Button>
                                    </div>
                                )}
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

            {/* Logo Extractor Modal */}
            <LogoExtractorModal
                isOpen={logoExtractorOpen}
                onClose={() => setLogoExtractorOpen(false)}
                onSelect={handleLogoFromUrl}
                initialUrl={coreFields.source_url}
            />

            {/* Back Button */}
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    onClick={() => router.push('/admin/ingestion/enrichment')}
                >
                    Back to Dashboard
                </Button>
            </div>

            {isDescriptionExpanded && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="description-editor-title"
                >
                    <div className="flex h-[80vh] w-[min(90vw,900px)] flex-col rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                            <h2 id="description-editor-title" className="text-base font-semibold text-slate-100">
                                Edit Description
                            </h2>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsDescriptionExpanded(false)}
                                aria-label="Close description editor"
                            >
                                ×
                            </Button>
                        </div>
                        <div className="flex-1 overflow-hidden px-5 py-4">
                            <textarea
                                ref={expandedDescriptionRef}
                                value={coreFields.description}
                                onChange={(e) => setCoreFields(prev => ({ ...prev, description: e.target.value }))}
                                className="h-full w-full resize-none rounded-lg border border-slate-300 bg-slate-50 p-4 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/40 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100"
                            />
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsDescriptionExpanded(false)}
                            >
                                Close
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setIsDescriptionExpanded(false)}
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

