import type {
  MobileEventDetail,
  MobileEventDetailAgendaItem,
  MobileCalendarEvent,
  MobileCalendarFeed,
  MobileDiscoverFeedRequest,
  MobileDiscoverCost,
  MobileDashboardHome,
  MobileDiscoverFeed,
  MobileDiscoverRankingMode,
  MobileEventCard,
  MobileEventEngagement,
  MobileEventDetailSpeaker,
} from '@kurecal/domain';
import type { AgendaItem, Event, EventStatus, EventType, FilteredEventsData, TrackedEventRecord } from '@/types';
import { isEventFreeFromPricing, normalizeEventFormat } from '@/utils/filterCountUtils';

function deriveEventSlug(event: Event): string {
  if (!event.sourceUrl?.includes('/')) {
    return event.id;
  }

  const candidate = event.sourceUrl.split('/').filter(Boolean).pop();
  return candidate || event.id;
}

function formatEventTimeLabel(startTime: string, endTime?: string | null): string {
  const start = new Date(startTime);
  const dateLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const startLabel = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!endTime) {
    return `${dateLabel} • ${startLabel}`;
  }

  const end = new Date(endTime);
  const endLabel = end.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${dateLabel} • ${startLabel} - ${endLabel}`;
}

function isUtcMidnightTimestamp(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function isDateOnlyCalendarEvent(
  startTime: string,
  endTime?: string | null,
  timeZone?: string | null
) {
  if (timeZone?.trim()) {
    return false;
  }

  if (!isUtcMidnightTimestamp(startTime)) {
    return false;
  }

  return !endTime || isUtcMidnightTimestamp(endTime);
}

function formatCalendarTimePart(value: string, timeZone?: string | null): string {
  const date = new Date(value);

  try {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timeZone ?? undefined,
    });
  } catch {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}

function formatCalendarEventTimeLabel(
  startTime: string,
  endTime?: string | null,
  timeZone?: string | null
): string {
  if (isDateOnlyCalendarEvent(startTime, endTime, timeZone)) {
    return 'All day';
  }

  const startLabel = formatCalendarTimePart(startTime, timeZone);

  if (!endTime) {
    return startLabel;
  }

  const endLabel = formatCalendarTimePart(endTime, timeZone);

  return `${startLabel} - ${endLabel}`;
}

function statusBadge(status: EventStatus | null | undefined): string | null {
  if (!status) {
    return null;
  }

  if (status === 'attending') {
    return 'Attending';
  }

  if (status === 'attended') {
    return 'Attended';
  }

  if (status === 'cancelled') {
    return 'Canceled';
  }

  return null;
}

function getPriceLabel(event: Event): string {
  if (isEventFreeFromPricing(event.priceMin, event.priceRange, { priceMax: null })) {
    return 'Free';
  }

  if (typeof event.priceMin === 'number' && Number.isFinite(event.priceMin) && event.priceMin > 0) {
    return `$${Math.round(event.priceMin)}`;
  }

  return event.priceRange?.trim() || 'Paid';
}

function getFormatLabel(event: Event): string {
  const format = normalizeEventFormat(event.eventFormat);

  if (format === 'virtual') {
    return 'Remote';
  }

  if (format === 'hybrid') {
    return 'Hybrid';
  }

  return 'On-Site';
}

function getEventDetailMetaLabel(event: Event): string | null {
  if (event.category?.name) {
    return event.category.name;
  }

  if (!event.eventFormat) {
    return null;
  }

  const format = normalizeEventFormat(event.eventFormat);
  if (format === 'virtual') {
    return 'Online';
  }

  if (format === 'hybrid') {
    return 'Hybrid';
  }

  return 'In-person';
}

function toMobileEventDetailSpeaker(speaker: {
  id?: string | null;
  name?: string | null;
  title?: string | null;
  company?: string | null;
  photoUrl?: string | null;
}): MobileEventDetailSpeaker | null {
  const name = speaker.name?.trim();
  if (!name) {
    return null;
  }

  return {
    id: String(speaker.id ?? name),
    name,
    title: speaker.title?.trim() || null,
    company: speaker.company?.trim() || null,
    photoUrl: speaker.photoUrl?.trim() || null,
  };
}

function toMobileEventDetailAgendaItem(agendaItem: AgendaItem): MobileEventDetailAgendaItem {
  const agendaSpeakers = [
    ...(agendaItem.speakers ?? []),
    ...(agendaItem.speaker ? [agendaItem.speaker] : []),
  ]
    .map((speaker) => toMobileEventDetailSpeaker(speaker))
    .filter((speaker): speaker is MobileEventDetailSpeaker => Boolean(speaker));
  const dayNumber =
    typeof agendaItem.dayNumber === 'number' && agendaItem.dayNumber > 0
      ? agendaItem.dayNumber
      : 1;

  return {
    id: agendaItem.id,
    dayNumber,
    startTime: agendaItem.startTime,
    endTime: agendaItem.endTime ?? null,
    title: agendaItem.title,
    description: agendaItem.description?.trim() || null,
    location: agendaItem.location?.trim() || null,
    type: agendaItem.type,
    track: agendaItem.track?.trim() || null,
    topics: agendaItem.topics?.filter((topic) => topic.trim().length > 0),
    speakers: agendaSpeakers,
  };
}

function toTagLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

function countActiveDiscoverFilters(filters: {
  searchTerm: string;
  categories: string[];
  tags: string[];
  location: string | null;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  format: 'all' | 'virtual' | 'in-person' | 'hybrid';
  cost: MobileDiscoverCost;
}): number {
  let count = 0;

  if (filters.searchTerm.trim()) count += 1;
  if (filters.categories.length > 0) count += 1;
  if (filters.tags.length > 0) count += 1;
  if (filters.location?.trim()) count += 1;
  if (filters.dateRange.start || filters.dateRange.end) count += 1;
  if (filters.format !== 'all') count += 1;
  if (filters.cost !== 'all') count += 1;

  return count;
}

function countActiveCalendarFilters(filters: {
  tags: string[];
  location: string | null;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  cost: MobileDiscoverCost;
}): number {
  let count = 0;

  if (filters.tags.length > 0) count += 1;
  if (filters.location?.trim()) count += 1;
  if (filters.dateRange.start || filters.dateRange.end) count += 1;
  if (filters.cost !== 'all') count += 1;

  return count;
}

function buildDiscoverResultLabel(mode: MobileDiscoverRankingMode, totalCount: number): string {
  if (mode === 'best-match') {
    return `${totalCount} ranked ${totalCount === 1 ? 'pick' : 'picks'}`;
  }

  if (mode === 'trending') {
    return `${totalCount} trending ${totalCount === 1 ? 'event' : 'events'}`;
  }

  return `${totalCount} upcoming ${totalCount === 1 ? 'event' : 'events'}`;
}

function buildDiscoverSupportingText(mode: MobileDiscoverRankingMode): string {
  if (mode === 'best-match') {
    return 'Career-impact ranking tuned to the same mobile web discovery hierarchy.';
  }

  if (mode === 'trending') {
    return 'Momentum-first ranking for events with stronger current pull.';
  }

  return 'A time-first pass when you want the next opportunities without extra noise.';
}

export function toMobileEventCard(
  event: Event,
  options: {
    engagement?: MobileEventEngagement;
    insight?: string | null;
    badges?: string[];
  } = {}
): MobileEventCard {
  const badges = [...(options.badges ?? [])];
  const status = statusBadge(options.engagement?.status);

  if (options.engagement?.isBookmarked) {
    badges.push('Saved');
  }
  if (status) {
    badges.push(status);
  }

  return {
    id: event.id,
    title: event.title,
    slug: deriveEventSlug(event),
    description: event.description ?? null,
    location: event.location ?? null,
    startTime: event.startTime,
    endTime: event.endTime ?? null,
    imageUrl: event.eventImageUrl ?? null,
    organizerLogoUrl: event.organization?.logo ?? null,
    organizerName: event.organization?.name ?? event.organizer ?? null,
    score:
      event.recommendationMetadata?.alignmentScore ??
      event.recommendationMetadata?.matchScore ??
      null,
    engagement: options.engagement,
    badges,
    insight: options.insight ?? null,
    timeLabel: formatEventTimeLabel(event.startTime, event.endTime),
    format: normalizeEventFormat(event.eventFormat),
    formatLabel: getFormatLabel(event),
    priceLabel: getPriceLabel(event),
  };
}

export function toMobileEventDetail(
  event: Event,
  options: {
    engagement?: MobileEventEngagement;
  } = {}
): MobileEventDetail {
  const speakerLineup = (event.speakerLineup ?? [])
    .map((speaker) => toMobileEventDetailSpeaker(speaker))
    .filter((speaker): speaker is MobileEventDetailSpeaker => Boolean(speaker));

  return {
    id: event.id,
    title: event.title,
    metaLabel: getEventDetailMetaLabel(event),
    description: event.description?.trim() || null,
    location: event.location?.trim() || null,
    startTime: event.startTime,
    endTime: event.endTime ?? null,
    timezone: event.timezone ?? null,
    sourceUrl: event.sourceUrl?.trim() || null,
    registrationUrl: event.registrationUrl?.trim() || null,
    imageUrl: event.eventImageUrl ?? null,
    host: {
      name: event.organization?.name ?? event.organizer ?? 'Organizer',
      logoUrl: event.organization?.logo ?? null,
    },
    tags: (event.tags ?? []).map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      category: tag.category ?? null,
    })),
    agenda: (event.agenda ?? []).map(toMobileEventDetailAgendaItem),
    speakerLineup,
    engagement: options.engagement,
  };
}

export function trackedRecordToEventCard(record: TrackedEventRecord): MobileEventCard | null {
  if (!record.event) {
    return null;
  }

  return toMobileEventCard(record.event, {
    engagement: {
      isBookmarked: record.isBookmarked,
      status: record.status,
    },
  });
}

export function toMobileCalendarEvent(
  event: Event,
  options: {
    engagement?: MobileEventEngagement;
  } = {}
): MobileCalendarEvent {
  return {
    id: event.id,
    title: event.title,
    location: event.location ?? null,
    startTime: event.startTime,
    endTime: event.endTime ?? null,
    timezone: event.timezone ?? null,
    eventTypeId: event.eventTypeId,
    organizerName: event.organization?.name ?? event.organizer ?? null,
    engagement: options.engagement,
    timeLabel: formatCalendarEventTimeLabel(event.startTime, event.endTime, event.timezone),
    priceLabel: getPriceLabel(event),
    isFree: isEventFreeFromPricing(event.priceMin, event.priceRange, { priceMax: null }),
  };
}

export function buildDiscoverFeed(params: {
  rankingMode: MobileDiscoverRankingMode;
  request: Required<
    Pick<
      MobileDiscoverFeedRequest,
      'searchTerm' | 'categories' | 'tags' | 'location' | 'format' | 'cost'
    >
  > & {
    dateRange: {
      start: string | null;
      end: string | null;
    };
  };
  data: FilteredEventsData;
  topPicks: MobileDiscoverFeed['topPicks'];
  events: MobileEventCard[];
}): MobileDiscoverFeed {
  const activeCount = countActiveDiscoverFilters({
    searchTerm: params.request.searchTerm,
    categories: params.request.categories,
    tags: params.request.tags,
    location: params.request.location,
    dateRange: params.request.dateRange,
    format: params.request.format,
    cost: params.request.cost,
  });

  const counts = {
    format: {
      virtual: params.data.counts?.format.virtual ?? 0,
      'in-person': params.data.counts?.format['in-person'] ?? 0,
      hybrid: params.data.counts?.format.hybrid ?? 0,
    },
    cost: {
      free: params.data.counts?.cost.free ?? 0,
      paid: params.data.counts?.cost.paid ?? 0,
    },
    categories: params.data.counts?.categories ?? {},
    tags: params.data.counts?.tags ?? {},
  };

  const availableTags = Object.entries(counts.tags ?? {})
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, 20)
    .map(([value, count]) => ({
      value,
      label: toTagLabel(value),
      count,
    }));

  return {
    header: {
      eyebrow: 'KureCal mobile',
      title: 'Discover',
      subtitle: 'The mobile web discovery hierarchy, translated into the native app shell.',
    },
    controls: {
      rankingModes: [
        {
          id: 'best-match',
          label: 'Best match',
          description: 'Prioritize strongest career alignment.',
        },
        {
          id: 'trending',
          label: 'Trending',
          description: 'Prioritize momentum and attendance.',
        },
        {
          id: 'soonest',
          label: 'Soonest',
          description: 'Ordered by upcoming start time.',
        },
      ],
      activeRankingMode: params.rankingMode,
    },
    activeState: {
      resultLabel: buildDiscoverResultLabel(params.rankingMode, params.data.pagination.total),
      supportingText: buildDiscoverSupportingText(params.rankingMode),
    },
    results: {
      returnedCount: params.events.length,
      totalCount: params.data.pagination.total,
      hasMore: params.data.pagination.hasMore,
    },
    filters: {
      searchTerm: params.request.searchTerm,
      categories: params.request.categories,
      tags: params.request.tags,
      location: params.request.location,
      dateRange: params.request.dateRange,
      format: params.request.format,
      cost: params.request.cost,
      activeCount,
    },
    availableFilters: {
      categories: params.data.filters.available.categories,
      tags: availableTags,
    },
    counts,
    topPicks: params.topPicks,
    events: params.events,
  };
}

export function buildDashboardHome(params: {
  hasCompletedOnboarding: boolean;
  profileHasCompletedOnboarding?: boolean;
  trackedCount: number;
  savedCount: number;
  attendingCount: number;
  recommendationCards: MobileEventCard[];
  upcomingCards: MobileEventCard[];
}): MobileDashboardHome {
  const recommendationCount = params.recommendationCards.length;
  const highlight = params.recommendationCards[0]?.title ?? null;

  return {
    hero: {
      eyebrow: 'Dashboard',
      title: params.hasCompletedOnboarding ? 'Your momentum, in one pass.' : 'Finish setup, then move faster.',
      subtitle: params.hasCompletedOnboarding
        ? 'A mobile-first overview of recommendations, saved plans, and your next few moves.'
        : 'Complete your profile to unlock stronger ranking and more useful planning signals.',
      highlight,
    },
    metrics: [
      {
        id: 'tracked',
        label: 'Tracked',
        value: String(params.trackedCount),
        detail: 'Events connected to your planning flow.',
      },
      {
        id: 'saved',
        label: 'Saved',
        value: String(params.savedCount),
        detail: 'Bookmarks ready for calendar review.',
      },
      {
        id: 'attending',
        label: 'Attending',
        value: String(params.attendingCount),
        detail: 'Events you have committed to show up for.',
      },
      {
        id: 'recommended',
        label: 'Recommended',
        value: String(recommendationCount),
        detail: 'Fresh ranked opportunities waiting in Discover.',
      },
    ],
    recommendationsLabel: 'Recommended next',
    recommendations: params.recommendationCards,
    upcomingLabel: 'Planned next',
    upcoming: params.upcomingCards,
    onboardingState: {
      hasCompleted: params.hasCompletedOnboarding,
      title: params.hasCompletedOnboarding
        ? 'Profile calibrated'
        : params.profileHasCompletedOnboarding
          ? 'Career profile still needs details'
          : 'Career profile incomplete',
      body: params.hasCompletedOnboarding
        ? 'Your ranking model is using the richer career profile from the main product.'
        : params.profileHasCompletedOnboarding
          ? 'You skipped the deeper setup earlier. Resume onboarding to improve recommendations and planning quality.'
          : 'The mobile shell is ready, but stronger recommendations still depend on the full onboarding profile.',
      ctaLabel: params.hasCompletedOnboarding
        ? 'View onboarding'
        : params.profileHasCompletedOnboarding
          ? 'Resume onboarding'
          : 'Finish onboarding',
    },
  };
}

export function buildCalendarFeed(params: {
  monthStart: string;
  monthEnd: string;
  request: Required<Pick<MobileCalendarFeed['filters'], 'tags' | 'location' | 'cost'>> & {
    dateRange: {
      start: string | null;
      end: string | null;
    };
  };
  data?: FilteredEventsData | null;
  eventTypes: EventType[];
  events: MobileCalendarEvent[];
}): MobileCalendarFeed {
  const activeCount = countActiveCalendarFilters({
    tags: params.request.tags,
    location: params.request.location,
    dateRange: params.request.dateRange,
    cost: params.request.cost,
  });

  const counts = {
    cost: {
      free: params.data?.counts?.cost.free ?? 0,
      paid: params.data?.counts?.cost.paid ?? 0,
    },
    tags: params.data?.counts?.tags ?? {},
  };

  const availableTags = Object.entries(counts.tags)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, 20)
    .map(([value, count]) => ({
      value,
      label: toTagLabel(value),
      count,
    }));

  const monthDate = new Date(`${params.monthStart}T12:00:00.000Z`);

  return {
    month: {
      monthStart: params.monthStart,
      monthEnd: params.monthEnd,
      label: monthDate.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    },
    results: {
      returnedCount: params.events.length,
      totalCount: params.data?.pagination.total ?? params.events.length,
    },
    filters: {
      tags: params.request.tags,
      location: params.request.location,
      dateRange: params.request.dateRange,
      cost: params.request.cost,
      activeCount,
    },
    availableFilters: {
      tags: availableTags,
      eventTypes: params.eventTypes.map((eventType) => ({
        id: eventType.id,
        name: eventType.name,
        color: eventType.color,
        description: eventType.description ?? null,
      })),
    },
    counts,
    emptyState: {
      title: 'No events this month',
      body:
        activeCount > 0
          ? 'Adjust a filter or move to another month to surface more events.'
          : 'Try a different month to keep exploring what is coming up.',
    },
    events: params.events,
  };
}
