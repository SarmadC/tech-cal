import type {
  AgendaItem,
  Event,
  EventTag,
  EventType,
  SupabaseEvent,
  SupabaseEventType,
  SupabaseEventWithDetails,
  SupabaseTrackedEvent,
  SupabaseTrackedEventWithDetails,
} from '@/types';

const DEFAULT_DATE = '2024-01-01T10:00:00.000Z';

const withDefaults = <T extends object>(base: T, overrides: Partial<T> = {}): T => {
  const result = { ...base, ...overrides } as T;
  return result;
};

export const buildAgendaItem = (overrides: Partial<AgendaItem> = {}): AgendaItem =>
  withDefaults<AgendaItem>(
    {
      id: 'agenda-item-1',
      title: 'Sample Session',
      startTime: DEFAULT_DATE,
      endTime: '2024-01-01T11:00:00.000Z',
      type: 'workshop',
      description: 'Sample description',
      location: 'Online',
      dayNumber: 1,
    },
    overrides,
  );

export const buildEventTag = (overrides: Partial<EventTag> = {}): EventTag =>
  withDefaults<EventTag>(
    {
      id: 'tag-1',
      name: 'React',
      color: '#61dafb',
      category: 'Programming',
    },
    overrides,
  );

export const buildEventType = (overrides: Partial<EventType> = {}): EventType =>
  withDefaults<EventType>(
    {
      id: 'type-1',
      name: 'Conference',
      color: '#3B82F6',
      description: 'Technology events',
    },
    overrides,
  );

export const buildEvent = (overrides: Partial<Event> = {}): Event => {
  const base: Event = {
    id: 'event-1',
    createdAt: DEFAULT_DATE,
    updatedAt: DEFAULT_DATE,
    title: 'Sample Event',
    description: 'Sample event description',
    organizer: 'Sample Organizer',
    location: 'Online',
    status: 'confirmed',
    startTime: DEFAULT_DATE,
    endTime: '2024-01-01T12:00:00.000Z',
    timezone: 'UTC',
    sourceUrl: 'https://example.com/event',
    livestreamUrl: null,
    registrationUrl: null,
    eventTypeId: 'type-1',
    organization: {
      id: 'org-1',
      name: 'Sample Organizer',
    },
    tags: [],
    priceRange: null,
    priceMin: null,
    capacity: null,
    attendeeCount: null,
    difficulty: null,
    eventFormat: null,
    targetAudience: null,
    prerequisites: null,
    agendaUrl: null,
    speakerLineup: null,
    agenda: [],
  };

  const event = withDefaults<Event>(base, overrides);

  if (overrides.organization) {
    event.organization = { ...base.organization, ...overrides.organization };
  }

  if (overrides.tags) {
    event.tags = overrides.tags;
  }

  if (overrides.agenda) {
    event.agenda = overrides.agenda;
  }

  return event;
};

export const buildSupabaseEvent = (overrides: Partial<SupabaseEvent> = {}): SupabaseEvent =>
  withDefaults<SupabaseEvent>(
    {
      id: 'supabase-event-1',
      created_at: DEFAULT_DATE,
      updated_at: DEFAULT_DATE,
      title: 'Sample Supabase Event',
      description: 'Description',
      start_time: DEFAULT_DATE,
      end_time: '2024-01-01T12:00:00.000Z',
      timezone: 'UTC',
      organizer_id: 'org-1',
      location: 'Online',
      status: 'confirmed',
      source_url: 'https://example.com/event',
      livestream_url: null,
      event_type_id: 'type-1',
      agenda_url: null,
    },
    overrides,
  );

export const buildSupabaseEventWithDetails = (
  overrides: Partial<SupabaseEventWithDetails> = {},
): SupabaseEventWithDetails => {
  const baseEvent = buildSupabaseEvent(overrides);

  return withDefaults<SupabaseEventWithDetails>(
    {
      ...baseEvent,
      organizer: {
        id: baseEvent.organizer_id ?? 'org-1',
        name: 'Sample Organizer',
        logo_url: 'https://example.com/logo.png',
      },
      event_type: {
        id: baseEvent.event_type_id ?? 'type-1',
        name: 'Conference',
        color: '#3B82F6',
        description: 'Technology events',
      },
      tags: [],
      speaker_lineup: null,
    },
    overrides,
  );
};

export const buildSupabaseTrackedEvent = (
  overrides: Partial<SupabaseTrackedEvent> = {},
): SupabaseTrackedEvent =>
  withDefaults<SupabaseTrackedEvent>(
    {
      id: 'tracked-1',
      user_id: 'user-1',
      event_id: 'supabase-event-1',
      status: 'attending',
      notes: null,
      created_at: DEFAULT_DATE,
      is_bookmarked: false,
      bookmarked_at: null,
      events: [],
    },
    overrides,
  );

export const buildSupabaseTrackedEventWithDetails = (
  overrides: Partial<SupabaseTrackedEventWithDetails> = {},
): SupabaseTrackedEventWithDetails => {
  const baseTracked = buildSupabaseTrackedEvent();
  return withDefaults<SupabaseTrackedEventWithDetails>(
    {
      ...baseTracked,
      events: buildSupabaseEventWithDetails(),
    },
    overrides,
  );
};

