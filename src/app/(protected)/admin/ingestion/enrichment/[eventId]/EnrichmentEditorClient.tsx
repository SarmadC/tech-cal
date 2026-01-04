/**
 * Enrichment Editor Client Component
 *
 * Interactive UI for enriching an event with agenda items, speakers, and organizer logo.
 * Refactored to use section components for maintainability.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import ImageExtractorModal from '@/components/admin/ImageExtractorModal';
import { cn } from '@/lib/utils';
import { MaterialIcon } from '@/components/ui/Icon';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { getLogoUrlFromInput } from '@/utils/logoUtils';

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
    initialAvailableSpeakers?: Speaker[];
    lookupData: LookupData;
    backUrl?: string;
}

export default function EnrichmentEditorClient({
    event,
    initialAgendaItems,
    initialAvailableSpeakers = [],
    lookupData,
    backUrl = '/admin/ingestion/enrichment',
}: EnrichmentEditorClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const { showSuccess, showError } = useSnackbar();



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
        name: event.organizer?.name || '',
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

    // Available speakers state (speakers with IDs from database)
    const [availableSpeakers, setAvailableSpeakers] = useState<Speaker[]>(initialAvailableSpeakers);

    // Agenda state (with enhanced metadata)
    const [agendaItems, setAgendaItems] = useState<AgendaItemInput[]>(
        initialAgendaItems.map(item => {
            // Extract speaker IDs from agenda_speakers relation
            const speakerIds: string[] = [];
            if (item.agenda_speakers && Array.isArray(item.agenda_speakers)) {
                for (const agSp of item.agenda_speakers) {
                    if (agSp.speaker_id) {
                        speakerIds.push(agSp.speaker_id);
                    }
                }
            }
            return {
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
                speakerIds: speakerIds.length > 0 ? speakerIds : undefined,
            };
        })
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
        getLogoUrlFromInput(event.organizer?.logo_url || null, event.organizer?.name) || null
    );

    const [eventImageExtractorOpen, setEventImageExtractorOpen] = useState(false);

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

            // Fetch the updated speakers list to get generated IDs and sync state
            const refreshResponse = await fetch(`/api/admin/ingestion/enrichment/speakers?eventId=${event.id}`);
            const refreshData = await refreshResponse.json();

            if (refreshResponse.ok && refreshData.speakers) {
                setAvailableSpeakers(refreshData.speakers);
                setSpeakers(refreshData.speakers);
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

    const handleEventImageFromUrl = useCallback(async (imageUrl: string) => {
        setLoading(true);
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

            // Create File object
            const file = new File([blob], fetchData.filename, {
                type: fetchData.contentType,
                lastModified: Date.now(),
            });

            // Upload to Supabase
            const formData = new FormData();
            formData.append('eventId', event.id);
            formData.append('file', file);

            const uploadResponse = await fetch('/api/admin/ingestion/enrichment/image', {
                method: 'POST',
                body: formData,
            });

            const data = await uploadResponse.json();

            if (!uploadResponse.ok) {
                throw new Error(data.error || 'Failed to upload image');
            }

            if (data.imageUrl) {
                setCoreFields(prev => ({ ...prev, event_image_url: data.imageUrl }));
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            Sentry.captureException(err);
        } finally {
            setLoading(false);
        }
    }, [event.id]);

    const handleSaveCoreFields = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // If creating a new venue, create it first
            let finalRelationships = relationships;
            if (isCreatingVenue && venueData.name) {
                // Validate required field
                if (!venueData.name.trim()) {
                    setError('Venue name is required');
                    setLoading(false);
                    return;
                }

                // Create the venue
                const venueResponse = await fetch('/api/admin/ingestion/enrichment/venue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        venueData: {
                            name: venueData.name.trim(),
                            address: venueData.address?.trim() || null,
                            city: venueData.city?.trim() || null,
                            state_province: venueData.state_province?.trim() || null,
                            country: venueData.country?.trim() || null,
                            venue_type: venueData.venue_type || null,
                            capacity: venueData.capacity || null,
                            latitude: venueData.latitude || null,
                            longitude: venueData.longitude || null,
                        },
                    }),
                });

                const venueData_result = await venueResponse.json();

                if (!venueResponse.ok) {
                    throw new Error(venueData_result.error || 'Failed to create venue');
                }

                if (!venueData_result.venueId) {
                    throw new Error('Venue creation succeeded but no venue ID returned');
                }

                // Update relationships with the new venue ID
                finalRelationships = {
                    ...relationships,
                    venue_id: venueData_result.venueId,
                };
            }

            // Save event fields and relationships
            const response = await fetch('/api/admin/ingestion/enrichment/event', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.id,
                    coreFields,
                    relationships: finalRelationships,
                    // Include organizer data if organizer exists
                    ...(event.organizer?.id && {
                        organizerData: {
                            organizerId: event.organizer.id,
                            name: organizerData.name,
                            description: organizerData.description,
                            website_url: organizerData.website_url,
                            social_media: organizerData.social_media,
                        },
                    }),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save event fields');
            }

            setSuccess(true);
            showSuccess('Event updated successfully');
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            showError(errorMessage);
            Sentry.captureException(err);
        } finally {
            setLoading(false);
        }
    }, [coreFields, relationships, event.id, event.organizer?.id, organizerData, isCreatingVenue, venueData, showSuccess, showError]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Track scroll position to show/hide back to top button
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            setShowBackToTop(scrollY > 300); // Show button after scrolling 300px
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);



    const sections = [
        { id: 'basic-info', label: 'Basic Info', icon: 'info' },
        { id: 'classification', label: 'Classification', icon: 'label' },
        { id: 'timing', label: 'Timing & Capacity', icon: 'time' },
        { id: 'pricing', label: 'Pricing', icon: 'money' },
        { id: 'urls', label: 'URLs & Media', icon: 'arrow-up-right' },
        { id: 'features', label: 'Features', icon: 'star' },
        { id: 'social', label: 'Social & Virtual', icon: 'arrow-up-right' },
        { id: 'agenda', label: 'Agenda', icon: 'calendar' },
        { id: 'speakers', label: 'Speakers', icon: 'people' },
        { id: 'venue', label: 'Venue', icon: 'location' },
        { id: 'organizer', label: 'Organizer', icon: 'building' },
    ];

    return (
        <div className="flex gap-8 items-start">
            {/* Sidebar Navigation */}
            <div className="w-64 shrink-0 sticky top-6 h-[calc(100vh-3rem)] overflow-y-auto pb-6 space-y-6 scrollbar-hide">
                <div className="space-y-1">
                    <div className="px-3 py-2">
                        <h2 className="font-semibold text-foreground-primary">{event.title}</h2>
                        <p className="text-xs text-foreground-muted mt-1">Enrichment Editor</p>
                    </div>
                    <nav className="space-y-0.5">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground-tertiary hover:text-foreground-primary hover:bg-background-tertiary rounded-md transition-colors text-left"
                            >
                                <MaterialIcon name={section.icon as any} size={16} />
                                {section.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="px-3 pt-4 border-t border-white/5 space-y-3">
                    <Button
                        onClick={handleSaveCoreFields}
                        disabled={loading}
                        className="w-full justify-start"
                        variant="secondary"
                    >
                        <MaterialIcon name="check" size={16} className="mr-2" />
                        Save Changes
                    </Button>
                    <Button
                        onClick={() => router.push(backUrl)}
                        variant="ghost"
                        className="w-full justify-start text-foreground-tertiary hover:text-foreground-primary"
                    >
                        <MaterialIcon name="arrow_back" size={16} className="mr-2" />
                        {backUrl === '/admin/events' ? 'Back to All Events' : 'Back to Dashboard'}
                    </Button>

                    <div className="pt-4 border-t border-white/5">
                        <ConfirmationDialog
                            triggerLabel="Delete Event"
                            title="Delete Event?"
                            description="This action cannot be undone. This will permanently delete the event and all associated data."
                            confirmLabel="Delete Forever"
                            variant="destructive"
                            onConfirm={async () => {
                                try {
                                    const response = await fetch(`/api/admin/ingestion/enrichment/event?eventId=${event.id}`, {
                                        method: 'DELETE',
                                    });

                                    if (!response.ok) {
                                        const data = await response.json();
                                        throw new Error(data.error || 'Failed to delete event');
                                    }

                                    showSuccess('Event deleted successfully');
                                    router.push(backUrl);
                                } catch (err) {
                                    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                                    showError(errorMessage);
                                    Sentry.captureException(err);
                                }
                            }}
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="mx-3 p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mx-3 p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                        Saved successfully!
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-12 pb-20">
                {/* Basic Information Section */}
                <div id="basic-info" className="scroll-mt-6">
                    <BasicInfoSection
                        coreFields={coreFields}
                        setCoreFields={setCoreFields}
                        onExpandDescription={() => setIsDescriptionExpanded(true)}
                    />
                </div>

                {/* Event Classification Section */}
                <div id="classification" className="scroll-mt-6">
                    <ClassificationSection
                        coreFields={coreFields}
                        setCoreFields={setCoreFields}
                        relationships={relationships}
                        setRelationships={setRelationships}
                        lookupData={lookupData}
                        eventTagRelations={event.event_tag_relations ?? null}
                    />
                </div>

                {/* Timing & Capacity Section */}
                <div id="timing" className="scroll-mt-6">
                    <TimingCapacitySection
                        coreFields={coreFields}
                        setCoreFields={setCoreFields}
                    />
                </div>

                {/* Pricing Section */}
                <div id="pricing" className="scroll-mt-6">
                    <PricingSection
                        coreFields={coreFields}
                        setCoreFields={setCoreFields}
                    />
                </div>

                {/* URLs & Media Section */}
                <div id="urls" className="scroll-mt-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h3 className="text-lg font-medium text-foreground-primary">URLs & Media</h3>
                    </div>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Source URL</label>
                            <input
                                type="url"
                                placeholder="https://..."
                                value={coreFields.source_url}
                                onChange={(e) => setCoreFields(prev => ({ ...prev, source_url: e.target.value }))}
                                className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Registration URL</label>
                            <input
                                type="url"
                                placeholder="https://..."
                                value={coreFields.registration_url}
                                onChange={(e) => setCoreFields(prev => ({ ...prev, registration_url: e.target.value }))}
                                className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Livestream URL</label>
                            <input
                                type="url"
                                placeholder="https://..."
                                value={coreFields.livestream_url}
                                onChange={(e) => setCoreFields(prev => ({ ...prev, livestream_url: e.target.value }))}
                                className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Agenda URL</label>
                            <input
                                type="url"
                                placeholder="https://..."
                                value={coreFields.agenda_url}
                                onChange={(e) => setCoreFields(prev => ({ ...prev, agenda_url: e.target.value }))}
                                className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                            />
                        </div>
                        <div className="grid gap-2 pt-4">
                            <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Event Image</label>
                            <div className="flex items-start gap-4">
                                {coreFields.event_image_url && (
                                    <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-default bg-background-tertiary">
                                        <Image
                                            src={coreFields.event_image_url}
                                            alt="Event"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEventImageExtractorOpen(true)}
                                            className="text-xs"
                                        >
                                            <MaterialIcon name="image" size={16} className="mr-2" />
                                            Update Image
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-xs text-foreground-muted">
                                        Recommended: 1200x630px or larger. JPG, PNG, WebP.
                                    </p>
                                    <p className="mt-2 text-xs text-foreground-muted">
                                        Recommended: 1200x630px or larger. JPG, PNG, WebP.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div id="features" className="scroll-mt-6">
                    <FeaturesSection
                        coreFields={coreFields}
                        setCoreFields={setCoreFields}
                    />
                </div>

                {/* Social & Virtual Section */}
                <div id="social" className="scroll-mt-6">
                    <SocialVirtualSection
                        coreFields={coreFields}
                        setCoreFields={setCoreFields}
                    />
                </div>

                {/* Agenda Items Section */}
                <div id="agenda" className="scroll-mt-6">
                    <AgendaSection
                        agendaItems={agendaItems}
                        availableSpeakers={availableSpeakers}
                        onAdd={handleAddAgendaItem}
                        onUpdate={handleUpdateAgendaItem}
                        onRemove={handleRemoveAgendaItem}
                        onSave={handleSaveAgenda}
                        loading={loading}
                    />
                </div>

                {/* Speakers Section */}
                <div id="speakers" className="scroll-mt-6">
                    <SpeakersSection
                        speakers={speakers}
                        onAdd={handleAddSpeaker}
                        onUpdate={handleUpdateSpeaker}
                        onRemove={handleRemoveSpeaker}
                        onSave={handleSaveSpeakers}
                        loading={loading}
                    />
                </div>

                {/* Venue Section */}
                <div id="venue" className="scroll-mt-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h3 className="text-lg font-medium text-foreground-primary">Venue</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center space-x-2 mb-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isCreatingVenue}
                                    onChange={(e) => setIsCreatingVenue(e.target.checked)}
                                    className="rounded border-default bg-background-tertiary text-accent-primary focus:ring-0"
                                />
                                <span className="text-sm text-foreground-tertiary">Create New Venue</span>
                            </label>
                            {!isCreatingVenue && (
                                <select
                                    value={relationships.venue_id || ''}
                                    onChange={(e) => setRelationships(prev => ({ ...prev, venue_id: e.target.value || null }))}
                                    className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors"
                                >
                                    <option value="" className="bg-background-main">Select Existing Venue</option>
                                    {lookupData.venues.map(venue => (
                                        <option key={venue.id} value={venue.id} className="bg-background-main">
                                            {venue.name} {venue.city ? `(${venue.city})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        {isCreatingVenue && (
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Venue Name</label>
                                    <input
                                        type="text"
                                        placeholder="Venue Name"
                                        value={venueData.name}
                                        onChange={(e) => setVenueData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Address</label>
                                    <textarea
                                        placeholder="Full Address"
                                        value={venueData.address}
                                        onChange={(e) => setVenueData(prev => ({ ...prev, address: e.target.value }))}
                                        className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted resize-none"
                                        rows={2}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">City</label>
                                        <input
                                            type="text"
                                            placeholder="City"
                                            value={venueData.city}
                                            onChange={(e) => setVenueData(prev => ({ ...prev, city: e.target.value }))}
                                            className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">State/Province</label>
                                        <input
                                            type="text"
                                            placeholder="State"
                                            value={venueData.state_province}
                                            onChange={(e) => setVenueData(prev => ({ ...prev, state_province: e.target.value }))}
                                            className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Country</label>
                                    <input
                                        type="text"
                                        placeholder="Country"
                                        value={venueData.country}
                                        onChange={(e) => setVenueData(prev => ({ ...prev, country: e.target.value }))}
                                        className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Organizer Section */}
                <div id="organizer" className="scroll-mt-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h3 className="text-lg font-medium text-foreground-primary">Organizer</h3>
                    </div>
                    {event.organizer ? (
                        <div className="space-y-6">
                            <div className="flex items-start gap-6">
                                <div className="space-y-3">
                                    <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-default bg-background-tertiary">
                                        {currentLogoUrl ? (
                                            <Image
                                                src={currentLogoUrl}
                                                alt={event.organizer.name}
                                                fill
                                                className="object-contain p-2"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-foreground-muted">
                                                <MaterialIcon name="building" size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setLogoExtractorOpen(true)}
                                        className="w-full text-xs"
                                    >
                                        Update Logo
                                    </Button>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="grid gap-2">
                                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Name</label>
                                        <input
                                            type="text"
                                            value={organizerData.name}
                                            onChange={(e) => setOrganizerData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Website</label>
                                        <input
                                            type="url"
                                            value={organizerData.website_url}
                                            onChange={(e) => setOrganizerData(prev => ({ ...prev, website_url: e.target.value }))}
                                            className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Description</label>
                                <textarea
                                    value={organizerData.description}
                                    onChange={(e) => setOrganizerData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded border border-default bg-background-tertiary text-center text-foreground-tertiary">
                            No organizer associated with this event.
                        </div>
                    )}
                </div>
            </div>

            {/* Image Extractor Modal */}
            <ImageExtractorModal
                isOpen={logoExtractorOpen}
                onClose={() => setLogoExtractorOpen(false)}
                onSelect={handleLogoFromUrl}
                onFileSelected={(file) => {
                    setLogoFile(file);
                    handleUploadLogo();
                }}
                initialUrl={event.organizer?.website_url || ''}
                title="Update Logo"
                description="Upload a file or extract from website"
                contextName={event.organizer?.name || ''}
            />

            <ImageExtractorModal
                isOpen={eventImageExtractorOpen}
                onClose={() => setEventImageExtractorOpen(false)}
                onSelect={handleEventImageFromUrl}
                onFileSelected={async (file) => {
                    const formData = new FormData();
                    formData.append('eventId', event.id);
                    formData.append('file', file);
                    try {
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
                    } catch (err) {
                        setError('Failed to upload image');
                    }
                    setEventImageExtractorOpen(false);
                }}
                initialUrl={coreFields.source_url || coreFields.registration_url || ''}
                title="Update Event Image"
                description="Upload a file or extract from website"
                contextName={event.title}
            />

            {/* Description Editor Modal */}
            {
                isDescriptionExpanded && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-background-main/80 backdrop-blur"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="description-editor-title"
                    >
                        <div className="flex h-[80vh] w-[min(90vw,900px)] flex-col rounded-xl border border-default bg-background-main shadow-2xl">
                            <div className="flex items-center justify-between border-b border-default px-5 py-4">
                                <h2 id="description-editor-title" className="text-base font-semibold text-foreground-primary">
                                    Edit Description
                                </h2>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsDescriptionExpanded(false)}
                                    aria-label="Close description editor"
                                >
                                    <MaterialIcon name="close" size={20} />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-hidden px-5 py-4">
                                <textarea
                                    ref={expandedDescriptionRef}
                                    value={coreFields.description}
                                    onChange={(e) => setCoreFields(prev => ({ ...prev, description: e.target.value }))}
                                    className="h-full w-full resize-none rounded-lg border border-default bg-background-secondary p-4 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-slate-500/40 dark:border-default dark:bg-background-secondary/80 dark:text-foreground-primary"
                                />
                            </div>
                            <div className="flex justify-end gap-2 border-t border-default px-5 py-4">
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
                )
            }

            {/* Floating Back to Top Button */}
            {showBackToTop && (
                <Button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    variant="secondary"
                    size="icon"
                    className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg h-12 w-12"
                    aria-label="Back to top"
                >
                    <MaterialIcon name="arrow-up" size={20} />
                </Button>
            )}
        </div >
    );
}
