/**
 * Enrichment Editor Client Component
 *
 * Interactive UI for enriching an event with agenda items, speakers, and organizer logo.
 * Refactored to use section components for maintainability.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
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
    UrlsMediaSection,
    VenueSection,
    OrganizerSection,
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
        organizer_id: event.organizer?.id || null,
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
    const [isCreatingOrganizer, setIsCreatingOrganizer] = useState(!event.organizer?.id);
    const [createdOrganizerId, setCreatedOrganizerId] = useState<string | null>(null);

    const handleOrganizerCreated = useCallback((organizerId: string) => {
        setIsCreatingOrganizer(false);
        setCreatedOrganizerId(organizerId);
        setRelationships(prev => ({ ...prev, organizer_id: organizerId }));
    }, []);

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
                topics: item.topics || undefined,
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

    // Logo state (needed for OrganizerSection)
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(
        getLogoUrlFromInput(event.organizer?.logo_url || null, event.organizer?.name) || null
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
            topics: undefined,
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

            // If creating a new organizer, create it first
            if (isCreatingOrganizer && organizerData.name.trim()) {
                const orgResponse = await fetch('/api/admin/ingestion/enrichment/organizer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: organizerData.name.trim(),
                        description: organizerData.description?.trim() || null,
                        website_url: organizerData.website_url?.trim() || null,
                    }),
                });

                const orgData = await orgResponse.json();

                if (!orgResponse.ok) {
                    throw new Error(orgData.error || 'Failed to create organizer');
                }

                if (!orgData.organizerId) {
                    throw new Error('Organizer creation succeeded but no organizer ID returned');
                }

                finalRelationships = {
                    ...finalRelationships,
                    organizer_id: orgData.organizerId,
                };
                setCreatedOrganizerId(orgData.organizerId);
                setIsCreatingOrganizer(false);
            }

            // Determine the organizer ID for updating organizer data
            const activeOrganizerId = createdOrganizerId || event.organizer?.id || finalRelationships.organizer_id;

            // Save event fields and relationships
            const response = await fetch('/api/admin/ingestion/enrichment/event', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: event.id,
                    coreFields,
                    relationships: finalRelationships,
                    // Include organizer data if organizer exists
                    ...(activeOrganizerId && !isCreatingOrganizer && {
                        organizerData: {
                            organizerId: activeOrganizerId,
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
    }, [coreFields, relationships, event.id, event.organizer?.id, organizerData, isCreatingVenue, venueData, isCreatingOrganizer, createdOrganizerId, showSuccess, showError]);

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
                <div id="urls" className="scroll-mt-6">
                    <UrlsMediaSection
                        eventId={event.id}
                        coreFields={coreFields}
                        setCoreFields={setCoreFields}
                        onSuccess={() => { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }}
                        onError={(msg) => setError(msg)}
                    />
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
                <div id="venue" className="scroll-mt-6">
                    <VenueSection
                        venueData={venueData}
                        setVenueData={setVenueData}
                        relationships={relationships}
                        setRelationships={setRelationships}
                        lookupData={lookupData}
                        isCreatingVenue={isCreatingVenue}
                        setIsCreatingVenue={setIsCreatingVenue}
                    />
                </div>

                {/* Organizer Section */}
                <div id="organizer" className="scroll-mt-6">
                    <OrganizerSection
                        organizer={event.organizer}
                        organizerData={organizerData}
                        setOrganizerData={setOrganizerData}
                        currentLogoUrl={currentLogoUrl}
                        setCurrentLogoUrl={setCurrentLogoUrl}
                        sourceUrl={organizerData.website_url || event.organizer?.website_url || ''}
                        onSuccess={() => { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }}
                        onError={(msg) => setError(msg)}
                        isCreatingOrganizer={isCreatingOrganizer}
                        setIsCreatingOrganizer={setIsCreatingOrganizer}
                        createdOrganizerId={createdOrganizerId}
                        onOrganizerCreated={handleOrganizerCreated}
                    />
                </div>
            </div>

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
