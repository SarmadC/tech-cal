/**
 * Shared types for the Enrichment Editor
 */

import type { Database } from '@/types/supabase';

// Database row types
export type EventsRow = Database['public']['Tables']['events']['Row'];
export type OrganizerRow = Database['public']['Tables']['organizers']['Row'];
export type EventTypeRow = Database['public']['Tables']['event_type']['Row'];
export type VenueRow = Database['public']['Tables']['venues']['Row'];
export type EventSeriesRow = Database['public']['Tables']['event_series']['Row'];
export type EventAgendaRow = Database['public']['Tables']['event_agenda']['Row'];
export type EventFormatEnum = Database['public']['Enums']['event_format_enum'];
export type PricingTypeEnum = Database['public']['Enums']['pricing_type_enum'];

export type EventTagRelationRow = Database['public']['Tables']['event_tag_relations']['Row'] & {
    event_tags: Database['public']['Tables']['event_tags']['Row'] | null;
};

export type EventAudienceRelationRow = Database['public']['Tables']['event_target_audiences']['Row'] & {
    target_audiences: Database['public']['Tables']['target_audiences']['Row'] | null;
};

export type EventPrerequisiteRelationRow = Database['public']['Tables']['event_prerequisites']['Row'] & {
    prerequisites: Database['public']['Tables']['prerequisites']['Row'] | null;
};

export type AgendaSpeakerRelation = Database['public']['Tables']['agenda_speakers']['Row'] & {
    speakers: Database['public']['Tables']['speakers']['Row'] | null;
};

// Domain types
export interface Speaker {
    id?: string;
    name: string;
    linkedinUrl?: string;
    title?: string;
    company?: string;
    bio?: string;
    photoUrl?: string;
}

export interface AgendaItemInput {
    title: string;
    startTime: string;
    endTime: string;
    type?: string;
    description?: string;
    location?: string;
    dayNumber?: number;
    track?: string;
    topics?: string[];
    sortOrder?: number;
    speakerIds?: string[];
    capacity?: number | null;
    difficultyLevel?: string | null;
    prerequisites?: string | null;
    isRequired?: boolean | null;
}

export interface LookupData {
    eventTypes: Array<{ id: string; name: string | null; color: string | null; icon: string | null; description: string | null }>;
    venues: Array<{ id: string; name: string; address: string | null; city: string | null; state_province: string | null; country: string | null }>;
    eventSeries: Array<{ id: string; name: string; description: string | null; logo_url: string | null; website_url: string | null }>;
    eventTags: Array<{ id: string; event_tag: string; category: string | null }>;
    targetAudiences: Array<{ id: string; name: string; description: string | null }>;
    prerequisites: Array<{ id: string; name: string; description: string | null }>;
}

export interface CoreFieldsState {
    description: string;
    location: string;
    timezone: string;
    start_time: string | null;
    end_time: string | null;
    language: string;
    source_url: string;
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

export interface RelationshipsState {
    event_type_id: string | null;
    venue_id: string | null;
    series_id: string | null;
    organizer_id: string | null;
    tagIds: string[];
    audienceIds: string[];
    prerequisiteIds: string[];
}

export interface VenueData {
    name: string;
    address: string;
    city: string;
    state_province: string;
    country: string;
    venue_type: string;
    capacity: number | null;
    latitude: number | null;
    longitude: number | null;
}

export interface OrganizerData {
    name: string;
    description: string;
    website_url: string;
    social_media: Record<string, unknown> | null;
}

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

// Section props interfaces
export interface SectionProps {
    expanded: boolean;
    onToggle: () => void;
    loading?: boolean;
}

export interface BasicInfoSectionProps extends SectionProps {
    coreFields: CoreFieldsState;
    setCoreFields: React.Dispatch<React.SetStateAction<CoreFieldsState>>;
    onExpandDescription: () => void;
}

export interface ClassificationSectionProps extends SectionProps {
    coreFields: CoreFieldsState;
    setCoreFields: React.Dispatch<React.SetStateAction<CoreFieldsState>>;
    relationships: RelationshipsState;
    setRelationships: React.Dispatch<React.SetStateAction<RelationshipsState>>;
    lookupData: LookupData;
    eventTagRelations?: EventTagRelationRow[] | null;
}

export interface TimingCapacitySectionProps extends SectionProps {
    coreFields: CoreFieldsState;
    setCoreFields: React.Dispatch<React.SetStateAction<CoreFieldsState>>;
}

export interface PricingSectionProps extends SectionProps {
    coreFields: CoreFieldsState;
    setCoreFields: React.Dispatch<React.SetStateAction<CoreFieldsState>>;
}

export interface UrlsMediaSectionProps extends SectionProps {
    eventId: string;
    coreFields: CoreFieldsState;
    setCoreFields: React.Dispatch<React.SetStateAction<CoreFieldsState>>;
    onSuccess: () => void;
    onError: (error: string) => void;
}

export interface FeaturesSectionProps extends SectionProps {
    coreFields: CoreFieldsState;
    setCoreFields: React.Dispatch<React.SetStateAction<CoreFieldsState>>;
}

export interface SocialVirtualSectionProps extends SectionProps {
    coreFields: CoreFieldsState;
    setCoreFields: React.Dispatch<React.SetStateAction<CoreFieldsState>>;
}

export interface AgendaSectionProps {
    agendaItems: AgendaItemInput[];
    availableSpeakers: Speaker[];
    onAdd: () => void;
    onUpdate: (index: number, updates: Partial<AgendaItemInput>) => void;
    onRemove: (index: number) => void;
    onSave: () => void;
    loading: boolean;
}

export interface SpeakersSectionProps {
    speakers: Speaker[];
    onAdd: () => void;
    onUpdate: (index: number, updates: Partial<Speaker>) => void;
    onRemove: (index: number) => void;
    onSave: () => void;
    loading: boolean;
}

export interface VenueSectionProps extends SectionProps {
    venueData: VenueData;
    setVenueData: React.Dispatch<React.SetStateAction<VenueData>>;
    relationships: RelationshipsState;
    setRelationships: React.Dispatch<React.SetStateAction<RelationshipsState>>;
    lookupData: LookupData;
    eventVenueId?: string;
    isCreatingVenue: boolean;
    setIsCreatingVenue: React.Dispatch<React.SetStateAction<boolean>>;
    onSuccess: () => void;
    onError: (error: string) => void;
}

export interface SeriesSectionProps extends SectionProps {
    relationships: RelationshipsState;
    setRelationships: React.Dispatch<React.SetStateAction<RelationshipsState>>;
    lookupData: LookupData;
    eventSeries?: EventSeriesRow | null;
}

export interface OrganizerSectionProps extends SectionProps {
    organizer: OrganizerRow;
    organizerData: OrganizerData;
    setOrganizerData: React.Dispatch<React.SetStateAction<OrganizerData>>;
    currentLogoUrl: string | null;
    setCurrentLogoUrl: React.Dispatch<React.SetStateAction<string | null>>;
    sourceUrl: string;
    onSuccess: () => void;
    onError: (error: string) => void;
}

// Utility functions
export const toDateTimeLocalValue = (value?: string | null): string => {
    if (!value) return '';
    const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
    if (match) return match[1];

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
};

export const parseDateTimeLocalValue = (value: string): string => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        return `${value}:00`;
    }
    return value;
};
