'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { resolveTechmemeUrl } from '@/utils/ingestion/sourceCleanup';

import {
    BasicInfoSection,
    ClassificationSection,
    PricingSection,
    TimingCapacitySection,
    FeaturesSection,
    SocialVirtualSection,
    AgendaSection,
    SpeakersSection,
    UrlsMediaSection,
    VenueSection,
    OrganizerSection,
} from '@/components/admin/enrichment/sections';
import type { CoreFieldsState, RelationshipsState, LookupData, VenueData, OrganizerData, AgendaItemInput, Speaker } from '@/components/admin/enrichment/types';

interface QueueItem {
    id: string;
    source_event_id: string;
    event_id: string | null;
    ingestion_quality_score: number;
    reason_codes: string[];
    recommended_tags: string[] | null;
    status: string;
    created_at: string;
    source_events: {
        raw_payload: {
            record: {
                title: string;
                description?: string;
                startTime: string;
                location: string;
                organizer?: string;
                sourceUrl?: string;
            };
        };
    } | null;
    events: {
        id: string;
        title: string;
        description: string;
        start_time: string;
        location: string;
        organizer: { name: string } | null;
        ingestion_quality_score: number | null;
        ingestion_provenance: {
            quality_components: {
                source_trust: number;
                metadata_completeness: number;
                speaker_verification: number;
                historical_performance: number;
            };
        } | null;
    } | null;
}

interface ModerationPreviewPanelProps {
    item: QueueItem;
    onClose: () => void;
    onApprove: (item: QueueItem) => void;
    onReject: (item: QueueItem) => void;
    onEditAndApprove: (item: QueueItem, eventData: Record<string, unknown>) => void;
    actionLoading: boolean;
}

function scoreColor(score: number): string {
    if (score >= 70) return 'text-emerald-300';
    if (score >= 50) return 'text-amber-300';
    return 'text-rose-300';
}

function scoreBarColor(score: number): string {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
}

function reasonCodeColor(code: string): string {
    const trustCodes = ['low_source_trust', 'unverified_source', 'low_trust', 'source_trust'];
    const qualityCodes = ['low_quality', 'low_score', 'quality_below_threshold'];
    if (trustCodes.some((c) => code.includes(c)) || qualityCodes.some((c) => code.includes(c))) {
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
}

/**
 * Resolve Techmeme redirect URLs to canonical URLs for display.
 */
function cleanSourceUrl(rawUrl: string): string {
    return resolveTechmemeUrl(rawUrl) ?? rawUrl;
}

const DEFAULT_CORE_FIELDS: CoreFieldsState = {
    description: '',
    location: '',
    timezone: '',
    start_time: null,
    end_time: null,
    language: '',
    source_url: '',
    registration_url: '',
    livestream_url: '',
    event_image_url: '',
    agenda_url: '',
    price_min: null,
    price_max: null,
    currency: '',
    pricing_type: null,
    difficulty_level: null,
    event_format: null,
    status: '',
    prerequisites: '',
    target_audience: '',
    certificate_offered: false,
    recording_available: false,
    accessibility_features: null,
    social_media_hashtag: '',
    virtual_platform: '',
    capacity: null,
    attendee_count: null,
    registration_deadline: null,
    is_multi_day: false,
    daily_schedule: null,
};

const DEFAULT_RELATIONSHIPS: RelationshipsState = {
    event_type_id: null,
    venue_id: null,
    series_id: null,
    organizer_id: null,
    tagIds: [],
    audienceIds: [],
    prerequisiteIds: [],
};

const DEFAULT_VENUE_DATA: VenueData = {
    name: '',
    address: '',
    city: '',
    state_province: '',
    country: '',
    venue_type: '',
    capacity: null,
    latitude: null,
    longitude: null,
};

const DEFAULT_ORGANIZER_DATA: OrganizerData = {
    name: '',
    description: '',
    website_url: '',
    social_media: null,
};

export default function ModerationPreviewPanel({
    item,
    onClose,
    onApprove,
    onReject,
    onEditAndApprove,
    actionLoading,
}: ModerationPreviewPanelProps) {
    const [editMode, setEditMode] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);

    // Edit state
    const [editTitle, setEditTitle] = useState('');
    const [coreFields, setCoreFields] = useState<CoreFieldsState>(DEFAULT_CORE_FIELDS);
    const [relationships, setRelationships] = useState<RelationshipsState>(DEFAULT_RELATIONSHIPS);
    const [lookupData, setLookupData] = useState<LookupData | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);

    // Venue state
    const [venueData, setVenueData] = useState<VenueData>(DEFAULT_VENUE_DATA);
    const [isCreatingVenue, setIsCreatingVenue] = useState(true);

    // Organizer state
    const [organizerData, setOrganizerData] = useState<OrganizerData>(DEFAULT_ORGANIZER_DATA);
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
    const [isCreatingOrganizer, setIsCreatingOrganizer] = useState(false);

    // Agenda & speakers state
    const [agendaItems, setAgendaItems] = useState<AgendaItemInput[]>([]);
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [agendaSaving, setAgendaSaving] = useState(false);
    const [speakersSaving, setSpeakersSaving] = useState(false);

    // Description expanded modal
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const expandedDescriptionRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (isDescriptionExpanded) {
            expandedDescriptionRef.current?.focus();
        }
    }, [isDescriptionExpanded]);

    const record = item.source_events?.raw_payload?.record;
    const eventTitle = item.events?.title ?? record?.title ?? 'Untitled Event';
    const organizer = item.events?.organizer?.name ?? record?.organizer ?? 'Unknown organizer';
    const description = item.events?.description ?? record?.description ?? '';
    const location = item.events?.location ?? record?.location ?? '';
    const startTime = item.events?.start_time ?? record?.startTime ?? '';
    const sourceUrl = record?.sourceUrl ? cleanSourceUrl(record.sourceUrl) : undefined;
    const qualityComponents = item.events?.ingestion_provenance?.quality_components;
    const overallScore = item.ingestion_quality_score;

    // Initialize edit state from event data
    useEffect(() => {
        setEditTitle(item.events?.title ?? record?.title ?? '');
        setCoreFields({
            ...DEFAULT_CORE_FIELDS,
            description: item.events?.description ?? record?.description ?? '',
            location: item.events?.location ?? record?.location ?? '',
            start_time: item.events?.start_time ?? record?.startTime ?? null,
            source_url: record?.sourceUrl ? cleanSourceUrl(record.sourceUrl) : '',
        });
        setRelationships(DEFAULT_RELATIONSHIPS);
        setVenueData(DEFAULT_VENUE_DATA);
        setIsCreatingVenue(true);
        setOrganizerData({
            ...DEFAULT_ORGANIZER_DATA,
            name: item.events?.organizer?.name ?? record?.organizer ?? '',
        });
        setCurrentLogoUrl(null);
        setAgendaItems([]);
        setSpeakers([]);
    }, [item]);

    // Fetch lookup data when entering edit mode
    useEffect(() => {
        if (!editMode || lookupData) return;
        setLookupLoading(true);
        fetch('/api/admin/ingestion/enrichment/lookup-data', { credentials: 'include' })
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data) {
                    setLookupData(json.data);
                } else {
                    console.error('Lookup data response missing data:', json);
                }
            })
            .catch((err) => console.error('Failed to fetch lookup data:', err))
            .finally(() => setLookupLoading(false));
    }, [editMode, lookupData]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isDescriptionExpanded) {
                    setIsDescriptionExpanded(false);
                } else if (editMode) {
                    setEditMode(false);
                } else {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, editMode, isDescriptionExpanded]);

    // Agenda handlers
    const handleAddAgendaItem = useCallback(() => {
        setAgendaItems(prev => [...prev, {
            title: '',
            startTime: '',
            endTime: '',
            type: 'other',
            description: '',
            location: '',
        }]);
    }, []);

    const handleUpdateAgendaItem = useCallback((index: number, updates: Partial<AgendaItemInput>) => {
        setAgendaItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
    }, []);

    const handleRemoveAgendaItem = useCallback((index: number) => {
        setAgendaItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSaveAgenda = useCallback(async () => {
        if (!item.event_id) return;
        setAgendaSaving(true);
        try {
            const response = await fetch('/api/admin/ingestion/enrichment/agenda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: item.event_id, agendaItems }),
            });
            if (!response.ok) {
                const data = await response.json();
                console.error('Failed to save agenda:', data.error);
            }
        } catch (err) {
            console.error('Error saving agenda:', err);
        } finally {
            setAgendaSaving(false);
        }
    }, [item.event_id, agendaItems]);

    // Speaker handlers
    const handleAddSpeaker = useCallback(() => {
        setSpeakers(prev => [...prev, { name: '', linkedinUrl: '', title: '', company: '', bio: '', photoUrl: '' }]);
    }, []);

    const handleUpdateSpeaker = useCallback((index: number, updates: Partial<Speaker>) => {
        setSpeakers(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
    }, []);

    const handleRemoveSpeaker = useCallback((index: number) => {
        setSpeakers(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSaveSpeakers = useCallback(async () => {
        if (!item.event_id) return;
        setSpeakersSaving(true);
        try {
            const response = await fetch('/api/admin/ingestion/enrichment/speakers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: item.event_id, speakers }),
            });
            if (!response.ok) {
                const data = await response.json();
                console.error('Failed to save speakers:', data.error);
            }
        } catch (err) {
            console.error('Error saving speakers:', err);
        } finally {
            setSpeakersSaving(false);
        }
    }, [item.event_id, speakers]);

    const handleSaveAndApprove = useCallback(() => {
        const eventData: Record<string, unknown> = {};
        if (editTitle) eventData.title = editTitle;
        if (coreFields.description) eventData.description = coreFields.description;
        if (coreFields.location) eventData.location = coreFields.location;
        if (coreFields.start_time) eventData.start_time = coreFields.start_time;
        if (coreFields.end_time) eventData.end_time = coreFields.end_time;
        if (coreFields.timezone) eventData.timezone = coreFields.timezone;
        if (coreFields.event_format) eventData.event_format = coreFields.event_format;
        if (coreFields.pricing_type) eventData.pricing_type = coreFields.pricing_type;
        if (coreFields.price_min != null) eventData.price_min = coreFields.price_min;
        if (coreFields.price_max != null) eventData.price_max = coreFields.price_max;
        if (coreFields.currency) eventData.currency = coreFields.currency;
        if (coreFields.difficulty_level) eventData.difficulty_level = coreFields.difficulty_level;
        if (coreFields.capacity != null) eventData.capacity = coreFields.capacity;
        if (coreFields.registration_deadline) eventData.registration_deadline = coreFields.registration_deadline;
        if (coreFields.language) eventData.language = coreFields.language;
        if (coreFields.status) eventData.status = coreFields.status;
        if (coreFields.source_url) eventData.source_url = coreFields.source_url;
        if (coreFields.registration_url) eventData.registration_url = coreFields.registration_url;
        if (coreFields.livestream_url) eventData.livestream_url = coreFields.livestream_url;
        if (coreFields.agenda_url) eventData.agenda_url = coreFields.agenda_url;
        if (coreFields.event_image_url) eventData.event_image_url = coreFields.event_image_url;
        if (coreFields.is_multi_day) eventData.is_multi_day = coreFields.is_multi_day;
        if (coreFields.certificate_offered) eventData.certificate_offered = coreFields.certificate_offered;
        if (coreFields.recording_available) eventData.recording_available = coreFields.recording_available;
        if (coreFields.social_media_hashtag) eventData.social_media_hashtag = coreFields.social_media_hashtag;
        if (coreFields.virtual_platform) eventData.virtual_platform = coreFields.virtual_platform;
        if (coreFields.accessibility_features) eventData.accessibility_features = coreFields.accessibility_features;
        if (coreFields.prerequisites) eventData.prerequisites = coreFields.prerequisites;
        if (coreFields.target_audience) eventData.target_audience = coreFields.target_audience;
        if (relationships.event_type_id) eventData.event_type_id = relationships.event_type_id;
        if (relationships.venue_id) eventData.venue_id = relationships.venue_id;
        if (relationships.series_id) eventData.series_id = relationships.series_id;
        if (relationships.tagIds.length > 0) eventData.tagIds = relationships.tagIds;
        if (relationships.audienceIds.length > 0) eventData.audienceIds = relationships.audienceIds;
        if (relationships.prerequisiteIds.length > 0) eventData.prerequisiteIds = relationships.prerequisiteIds;
        if (organizerData.name) eventData.organizerData = organizerData;
        if (isCreatingVenue && venueData.name) eventData.venueData = venueData;
        onEditAndApprove(item, eventData);
    }, [item, editTitle, coreFields, relationships, organizerData, venueData, isCreatingVenue, onEditAndApprove]);

    const statusBadgeStyle: Record<string, string> = {
        pending: 'bg-amber-400/15 text-amber-200 border border-amber-500/30',
        approved: 'bg-emerald-400/15 text-emerald-200 border border-emerald-500/30',
        rejected: 'bg-rose-500/15 text-rose-200 border border-rose-500/30',
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                className={cn(
                    'fixed inset-y-0 right-0 z-50 w-full max-w-2xl',
                    'bg-background-main border-l border-default',
                    'flex flex-col shadow-2xl',
                    'animate-in slide-in-from-right duration-300'
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="moderation-preview-title"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-default px-6 py-4">
                    <div className="min-w-0 flex-1">
                        <h2 id="moderation-preview-title" className="text-lg font-semibold text-foreground-primary truncate">
                            {eventTitle}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground-tertiary">
                            <span>{organizer}</span>
                            <Badge className={cn('ml-1', statusBadgeStyle[item.status] ?? 'bg-background-tertiary text-foreground-primary')}>
                                {item.status.replace(/_/g, ' ')}
                            </Badge>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-2 text-foreground-tertiary hover:bg-background-tertiary hover:text-foreground-secondary"
                        aria-label="Close panel"
                    >
                        <MaterialIcon name="close" size={20} />
                    </button>
                </div>

                {/* Quality Breakdown */}
                <div className="border-b border-default bg-background-secondary px-6 py-4">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Quality Breakdown</h3>
                        <div className={cn('text-lg font-bold', scoreColor(overallScore))}>
                            {overallScore.toFixed(0)}
                        </div>
                    </div>
                    {qualityComponents ? (
                        <div className="grid grid-cols-2 gap-3">
                            {([
                                ['Source Trust', qualityComponents.source_trust],
                                ['Metadata', qualityComponents.metadata_completeness],
                                ['Speaker Verification', qualityComponents.speaker_verification],
                                ['Historical', qualityComponents.historical_performance],
                            ] as [string, number | undefined][]).map(([label, score]) => {
                                const val = score ?? 0;
                                return (
                                    <div key={label} className="rounded-lg border border-default/60 bg-background-main/50 p-2.5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] text-foreground-muted">{label}</span>
                                            <span className={cn('text-sm font-semibold', score != null ? scoreColor(val) : 'text-foreground-muted')}>
                                                {score != null ? val.toFixed(0) : '\u2014'}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-background-tertiary overflow-hidden">
                                            <div
                                                className={cn('h-full rounded-full transition-all', scoreBarColor(val))}
                                                style={{ width: `${Math.min(100, val)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-foreground-muted">No quality component data available.</p>
                    )}
                </div>

                {/* Reason Code Chips */}
                {item.reason_codes.length > 0 && (
                    <div className="border-b border-default px-6 py-3">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Flagged Reasons</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {item.reason_codes.map((code) => (
                                <Badge key={code} className={cn('px-2 py-0.5 text-[10px] border', reasonCodeColor(code))}>
                                    {code.replace(/_/g, ' ')}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Event Details / Edit Mode */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {editMode ? (
                        <div className="space-y-8">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Edit Event</h3>

                            {lookupLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex items-center gap-3 text-foreground-muted">
                                        <MaterialIcon name="refresh" size={18} className="animate-spin" />
                                        <span className="text-sm">Loading editor...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Title (not part of CoreFieldsState) */}
                                    <div className="grid gap-2">
                                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Title</label>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                            placeholder="Event title"
                                        />
                                    </div>

                                    {/* Basic Information */}
                                    <BasicInfoSection
                                        coreFields={coreFields}
                                        setCoreFields={setCoreFields}
                                        onExpandDescription={() => setIsDescriptionExpanded(true)}
                                    />

                                    {/* Classification */}
                                    {lookupData && (
                                        <ClassificationSection
                                            coreFields={coreFields}
                                            setCoreFields={setCoreFields}
                                            relationships={relationships}
                                            setRelationships={setRelationships}
                                            lookupData={lookupData}
                                        />
                                    )}

                                    {/* Timing & Capacity */}
                                    <TimingCapacitySection
                                        coreFields={coreFields}
                                        setCoreFields={setCoreFields}
                                    />

                                    {/* Pricing */}
                                    <PricingSection
                                        coreFields={coreFields}
                                        setCoreFields={setCoreFields}
                                    />

                                    {/* URLs & Media */}
                                    {item.event_id && (
                                        <UrlsMediaSection
                                            eventId={item.event_id}
                                            coreFields={coreFields}
                                            setCoreFields={setCoreFields}
                                            onSuccess={() => {}}
                                            onError={(msg) => console.error(msg)}
                                        />
                                    )}

                                    {/* Features */}
                                    <FeaturesSection
                                        coreFields={coreFields}
                                        setCoreFields={setCoreFields}
                                    />

                                    {/* Social & Virtual */}
                                    <SocialVirtualSection
                                        coreFields={coreFields}
                                        setCoreFields={setCoreFields}
                                    />

                                    {/* Agenda */}
                                    <AgendaSection
                                        agendaItems={agendaItems}
                                        availableSpeakers={speakers}
                                        onAdd={handleAddAgendaItem}
                                        onUpdate={handleUpdateAgendaItem}
                                        onRemove={handleRemoveAgendaItem}
                                        onSave={handleSaveAgenda}
                                        loading={agendaSaving}
                                    />

                                    {/* Speakers */}
                                    <SpeakersSection
                                        speakers={speakers}
                                        onAdd={handleAddSpeaker}
                                        onUpdate={handleUpdateSpeaker}
                                        onRemove={handleRemoveSpeaker}
                                        onSave={handleSaveSpeakers}
                                        loading={speakersSaving}
                                    />

                                    {/* Venue */}
                                    {lookupData && (
                                        <VenueSection
                                            venueData={venueData}
                                            setVenueData={setVenueData}
                                            relationships={relationships}
                                            setRelationships={setRelationships}
                                            lookupData={lookupData}
                                            isCreatingVenue={isCreatingVenue}
                                            setIsCreatingVenue={setIsCreatingVenue}
                                        />
                                    )}

                                    {/* Organizer */}
                                    <OrganizerSection
                                        organizer={item.events?.organizer as Parameters<typeof OrganizerSection>[0]['organizer']}
                                        organizerData={organizerData}
                                        setOrganizerData={setOrganizerData}
                                        currentLogoUrl={currentLogoUrl}
                                        setCurrentLogoUrl={setCurrentLogoUrl}
                                        sourceUrl={organizerData.website_url || ''}
                                        onSuccess={() => {}}
                                        onError={(msg) => console.error(msg)}
                                        isCreatingOrganizer={isCreatingOrganizer}
                                        setIsCreatingOrganizer={setIsCreatingOrganizer}
                                        createdOrganizerId={null}
                                        onOrganizerCreated={() => {}}
                                    />
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Event Details</h3>

                            {/* Description */}
                            {description && (
                                <div>
                                    <div className="mb-1 text-xs text-foreground-muted">Description</div>
                                    <div className={cn('text-sm text-foreground-tertiary whitespace-pre-wrap', !descExpanded && 'line-clamp-4')}>
                                        {description}
                                    </div>
                                    {description.length > 200 && (
                                        <button
                                            onClick={() => setDescExpanded(!descExpanded)}
                                            className="mt-1 text-xs text-accent-primary hover:underline"
                                        >
                                            {descExpanded ? 'Show less' : 'Show more'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Date/Time */}
                            {startTime && (
                                <div>
                                    <div className="mb-1 text-xs text-foreground-muted">Date & Time</div>
                                    <div className="text-sm text-foreground-secondary">
                                        {format(new Date(startTime), 'EEEE, MMM d, yyyy \u00b7 h:mm a')}
                                    </div>
                                </div>
                            )}

                            {/* Location */}
                            {location && (
                                <div>
                                    <div className="mb-1 text-xs text-foreground-muted">Location</div>
                                    <div className="text-sm text-foreground-secondary">{location}</div>
                                </div>
                            )}

                            {/* Source URL */}
                            {sourceUrl && (
                                <div>
                                    <div className="mb-1 text-xs text-foreground-muted">Source</div>
                                    <a
                                        href={sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-accent-primary hover:underline"
                                    >
                                        <MaterialIcon name="arrow-up-right" size={14} />
                                        {(() => { try { return new URL(sourceUrl).hostname; } catch { return sourceUrl; } })()}
                                    </a>
                                </div>
                            )}

                            {/* Organizer */}
                            <div>
                                <div className="mb-1 text-xs text-foreground-muted">Organizer</div>
                                <div className="text-sm text-foreground-secondary">{organizer}</div>
                            </div>

                            {/* Recommended Tags */}
                            {item.recommended_tags && item.recommended_tags.length > 0 && (
                                <div>
                                    <div className="mb-1.5 text-xs text-foreground-muted">Recommended Tags</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.recommended_tags.map((tag) => (
                                            <Badge key={tag} className="bg-accent-primary-light text-foreground-secondary px-2 py-0.5 text-[10px]">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-default bg-background-secondary px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                        {editMode ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditMode(false)}
                                    disabled={actionLoading}
                                    className="text-foreground-tertiary"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveAndApprove}
                                    disabled={actionLoading || lookupLoading}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <MaterialIcon name="check" size={14} className="mr-1" />
                                    Save & Approve
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onReject(item)}
                                    disabled={actionLoading}
                                    className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                                >
                                    <MaterialIcon name="close" size={14} className="mr-1" />
                                    Reject
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => onApprove(item)}
                                    disabled={actionLoading}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <MaterialIcon name="check" size={14} className="mr-1" />
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setEditMode(true)}
                                    disabled={actionLoading}
                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    <MaterialIcon name="edit" size={14} className="mr-1" />
                                    Edit & Approve
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="mt-3 flex justify-end text-xs text-foreground-muted">
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-default bg-background-tertiary px-1.5 py-0.5 text-[10px]">
                                Esc
                            </kbd>
                            to close
                        </span>
                    </div>
                </div>
            </div>

            {/* Description Editor Modal */}
            {isDescriptionExpanded && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-background-main/80 backdrop-blur"
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
                                className="h-full w-full resize-none rounded-lg border border-default bg-background-secondary p-4 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-slate-500/40"
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
            )}
        </>
    );
}
