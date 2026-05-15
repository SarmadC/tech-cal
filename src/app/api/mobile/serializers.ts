import {
  mobileCalendarEventSchema,
  mobileCalendarFeedSchema,
  type MobileCalendarDaySummary,
  type MobileCalendarEvent,
  type MobileCalendarFeed,
  mobileEventCardSchema,
  mobileDashboardSummarySchema,
  type MobileDiscoverCost,
  mobileDiscoverFeedSchema,
  type MobileDiscoverFeedRequest,
  type MobileDiscoverRankingMode,
  mobileEventDetailSchema,
  mobileEventSummarySchema,
  type LocalCalendarDateKey,
  type MobileDashboardSummary,
  type MobileDashboardTopRecommendation,
  type MobileDashboardCommitment,
  type MobileDashboardDiscoveryBreadth,
  type MobileDashboardPipelineInsight,
  type MobileDashboardFunnelInsight,
  type MobileDashboardEngagementStreak,
  type MobileDashboardMonthlyPulse,
  type MobileDashboardNetworkPulse,
  type MobileDashboardPerformance,
  type MobileDashboardPredictionAccuracy,
  type MobileDashboardCareerImpact,
  type MobileDashboardCareerOutcomes,
  type MobileDiscoverFeed,
  type MobileEventCard,
  type MobileEventDetail,
  type MobileEventDetailAgendaItem,
  type MobileEventDetailSpeaker,
  type MobileEventEngagement,
  type MobileEventSummary,
  type MobileSurfaceHeader,
} from '@kurecal/domain';

import type { AgendaItem, Event, EventType } from '@/types';
import type { FilteredEventsData } from '@/types/filteredEvents';
import { isEventFreeFromPricing, normalizeEventFormat } from '@/utils/filterCountUtils';

function resolveImageUrl(src: string | null | undefined): string | null {
  const value = src?.trim();
  if (!value) return null;

  if (value.startsWith('/')) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
    return origin ? `${origin}${value}` : null;
  }

  try {
    const url = new URL(value);
    if (url.protocol === 'http:') url.protocol = 'https:';
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDateKey(date: Date): LocalCalendarDateKey {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function buildDateKeyFromParts(
  date: Date,
  options?: {
    timeZone?: string | null;
    useUtc?: boolean;
  }
): LocalCalendarDateKey {
  if (options?.useUtc) {
    return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`;
  }

  if (options?.timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: options.timeZone,
      }).formatToParts(date);

      const year = parts.find((part) => part.type === 'year')?.value;
      const month = parts.find((part) => part.type === 'month')?.value;
      const day = parts.find((part) => part.type === 'day')?.value;

      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    } catch {
      // Fall back to local formatting when the timezone is invalid.
    }
  }

  return formatLocalDateKey(date);
}

function isUtcMidnightTimestamp(value: string | null | undefined) {
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

function isDateOnlyEvent(
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

function formatEventDateKey(
  startTime: string,
  endTime?: string | null,
  timeZone?: string | null
): LocalCalendarDateKey {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return formatLocalDateKey(new Date());
  }

  if (isDateOnlyEvent(startTime, endTime, timeZone)) {
    return buildDateKeyFromParts(date, { useUtc: true });
  }

  return buildDateKeyFromParts(date, { timeZone });
}

function deriveEventSlug(event: Event): string {
  const pathCandidate = event.sourceUrl
    ?.split('/')
    .filter(Boolean)
    .pop();

  return pathCandidate || event.id;
}

function formatEventTimeLabel(event: Event): string {
  const start = new Date(event.startTime);
  const end = event.endTime ? new Date(event.endTime) : null;

  const dateLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const startLabel = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone ?? undefined,
  });

  if (!end) {
    return `${dateLabel} • ${startLabel}`;
  }

  const endLabel = end.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone ?? undefined,
  });

  return `${dateLabel} • ${startLabel} - ${endLabel}`;
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
  if (isDateOnlyEvent(startTime, endTime, timeZone)) {
    return 'All day';
  }

  const startLabel = formatCalendarTimePart(startTime, timeZone);

  if (!endTime) {
    return startLabel;
  }

  const endLabel = formatCalendarTimePart(endTime, timeZone);

  return `${startLabel} - ${endLabel}`;
}

function getFormatLabel(event: Event): string | null {
  const format = normalizeEventFormat(event.eventFormat);

  if (format === 'virtual') {
    return 'Remote';
  }

  if (format === 'hybrid') {
    return 'Hybrid';
  }

  if (format === 'in-person') {
    return 'In person';
  }

  return null;
}

function getPriceLabel(event: Event): string | null {
  if (isEventFreeFromPricing(event.priceMin, event.priceRange, { priceMax: null })) {
    return 'Free';
  }

  if (typeof event.priceMin === 'number' && Number.isFinite(event.priceMin) && event.priceMin > 0) {
    return `$${Math.round(event.priceMin)}`;
  }

  return event.priceRange?.trim() || null;
}

function getMetaLabel(event: Event): string | null {
  if (event.category?.name?.trim()) {
    return event.category.name.trim();
  }

  return getFormatLabel(event);
}

function toTagNames(event: Event): string[] {
  return Array.from(
    new Set(
      (event.tags ?? [])
        .map((tag) => tag.name?.trim())
        .filter((tag): tag is string => Boolean(tag))
    )
  );
}

function toTagLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) =>
      part.length <= 3
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
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

function buildDiscoverResultLabel(
  mode: MobileDiscoverRankingMode,
  totalCount: number
): string {
  if (mode === 'best-match') {
    return `${totalCount} ranked ${totalCount === 1 ? 'pick' : 'picks'}`;
  }

  if (mode === 'trending') {
    return `${totalCount} trending ${totalCount === 1 ? 'event' : 'events'}`;
  }

  return `${totalCount} upcoming ${totalCount === 1 ? 'event' : 'events'}`;
}

function buildDiscoverSupportingText(
  mode: MobileDiscoverRankingMode
): string {
  if (mode === 'best-match') {
    return 'Career-impact ranking tuned to the same mobile web discovery hierarchy.';
  }

  if (mode === 'trending') {
    return 'Momentum-first ranking for events with stronger current pull.';
  }

  return 'A time-first pass when you want the next opportunities without extra noise.';
}

function toMobileSpeaker(
  speaker: Partial<{
    id: string;
    name: string;
    title: string;
    company: string;
    photoUrl: string;
  }>
): MobileEventDetailSpeaker | null {
  const name = speaker.name?.trim();

  if (!name) {
    return null;
  }

  return {
    id: speaker.id?.trim() || name,
    name,
    title: speaker.title?.trim() || null,
    company: speaker.company?.trim() || null,
    photoUrl: speaker.photoUrl?.trim() || null,
  };
}

function toAgendaSpeakers(agendaItem: AgendaItem): MobileEventDetailSpeaker[] {
  const speakers = [
    ...(agendaItem.speakers ?? []),
    ...(agendaItem.speaker ? [agendaItem.speaker] : []),
  ];

  const deduped = new Map<string, MobileEventDetailSpeaker>();

  for (const speaker of speakers) {
    const serialized = toMobileSpeaker({
      id: speaker.id,
      name: speaker.name,
      title: speaker.title,
      company: speaker.company,
      photoUrl: speaker.photoUrl,
    });

    if (!serialized) {
      continue;
    }

    const key = serialized.id || serialized.name.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, serialized);
    }
  }

  return Array.from(deduped.values());
}

function toAgendaItem(agendaItem: AgendaItem): MobileEventDetailAgendaItem {
  return {
    id: agendaItem.id,
    dayNumber:
      typeof agendaItem.dayNumber === 'number' && agendaItem.dayNumber > 0
        ? agendaItem.dayNumber
        : 1,
    startTime: agendaItem.startTime,
    endTime: agendaItem.endTime ?? null,
    title: agendaItem.title,
    description: agendaItem.description?.trim() || null,
    location: agendaItem.location?.trim() || null,
    track: agendaItem.track?.trim() || null,
    speakers: toAgendaSpeakers(agendaItem),
  };
}

function collectSpeakerLineup(event: Event): MobileEventDetailSpeaker[] {
  const deduped = new Map<string, MobileEventDetailSpeaker>();

  for (const speaker of event.speakerLineup ?? []) {
    const serialized = toMobileSpeaker({
      id: speaker.id,
      name: speaker.name,
      title: speaker.title,
      company: speaker.company,
      photoUrl: speaker.photoUrl,
    });

    if (serialized && !deduped.has(serialized.id)) {
      deduped.set(serialized.id, serialized);
    }
  }

  for (const agendaItem of event.agenda ?? []) {
    for (const speaker of toAgendaSpeakers(agendaItem)) {
      if (!deduped.has(speaker.id)) {
        deduped.set(speaker.id, speaker);
      }
    }
  }

  return Array.from(deduped.values());
}

export function toMobileEventCard(
  event: Event,
  options: {
    engagement?: MobileEventEngagement | null;
    insight?: string | null;
    badges?: string[];
  } = {}
): MobileEventCard {
  const badges = [...(options.badges ?? [])];
  const status = options.engagement?.status;

  if (options.engagement?.isBookmarked) {
    badges.push('Saved');
  }
  if (status === 'attending') {
    badges.push('Attending');
  } else if (status === 'attended') {
    badges.push('Attended');
  } else if (status === 'cancelled') {
    badges.push('Canceled');
  }

  return mobileEventCardSchema.parse({
    id: event.id,
    title: event.title,
    slug: deriveEventSlug(event),
    description: event.description?.trim() || null,
    location: event.location?.trim() || null,
    startTime: event.startTime,
    endTime: event.endTime ?? null,
    imageUrl: resolveImageUrl(event.eventImageUrl),
    organizerLogoUrl: resolveImageUrl(event.organization?.logo),
    organizerName:
      event.organization?.name?.trim() || event.organizer?.trim() || null,
    score:
      event.recommendationMetadata?.alignmentScore ??
      event.recommendationMetadata?.matchScore ??
      null,
    engagement: options.engagement ?? undefined,
    badges,
    insight: options.insight ?? null,
    timeLabel: formatEventTimeLabel(event),
    format: normalizeEventFormat(event.eventFormat),
    formatLabel: getFormatLabel(event),
    priceLabel: getPriceLabel(event),
  });
}

export function toMobileEventSummary(
  event: Event,
  engagement?: MobileEventEngagement | null
): MobileEventSummary {
  return mobileEventSummarySchema.parse({
    id: event.id,
    title: event.title,
    slug: deriveEventSlug(event),
    description: event.description?.trim() || null,
    location: event.location?.trim() || null,
    startTime: event.startTime,
    endTime: event.endTime ?? null,
    imageUrl: event.eventImageUrl?.trim() || null,
    organizerName: event.organization?.name?.trim() || event.organizer?.trim() || null,
    tags: toTagNames(event),
    timeLabel: formatEventTimeLabel(event),
    formatLabel: getFormatLabel(event),
    priceLabel: getPriceLabel(event),
    engagement: engagement ?? undefined,
  });
}

export function trackedRecordToEventCard(record: {
  event: Event | null;
  isBookmarked: boolean;
  status: MobileEventEngagement['status'];
}): MobileEventCard | null {
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

export function toMobileEventDetail(
  event: Event,
  engagement?: MobileEventEngagement | null
): MobileEventDetail {
  const summary = toMobileEventSummary(event, engagement);

  return mobileEventDetailSchema.parse({
    event: {
      ...summary,
      sourceUrl: event.sourceUrl?.trim() || null,
      registrationUrl: event.registrationUrl?.trim() || null,
      timezone: event.timezone?.trim() || null,
      metaLabel: getMetaLabel(event),
    },
    host:
      event.organization?.name?.trim() || event.organizer?.trim()
        ? {
            id: event.organization?.id,
            name: event.organization?.name?.trim() || event.organizer.trim(),
            logoUrl: event.organization?.logo?.trim() || null,
          }
        : null,
    tags: summary.tags,
    agenda: (event.agenda ?? []).map((agendaItem) => toAgendaItem(agendaItem)),
    speakerLineup: collectSpeakerLineup(event),
  });
}

export function toMobileCalendarEvent(
  event: Event,
  engagement?: MobileEventEngagement | null
): MobileCalendarEvent {
  const summary = toMobileEventSummary(event, engagement);

  return mobileCalendarEventSchema.parse({
    ...summary,
    dateKey: formatEventDateKey(event.startTime, event.endTime, event.timezone),
    timezone: event.timezone?.trim() || null,
    eventTypeId: event.eventTypeId?.trim() || event.category?.id || null,
    eventTypeName: event.category?.name?.trim() || null,
    eventTypeColor:
      event.category?.color?.trim() ||
      (typeof event.color === 'string' ? event.color.trim() : null),
    isAllDay: isDateOnlyEvent(event.startTime, event.endTime, event.timezone),
    isFree: isEventFreeFromPricing(event.priceMin, event.priceRange, {
      priceMax: null,
    }),
    timeLabel: formatCalendarEventTimeLabel(
      event.startTime,
      event.endTime,
      event.timezone
    ),
  });
}

export function buildDiscoverFeed({
  rankingMode,
  request,
  data,
  topPicks,
  events,
}: {
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
    searchTerm: request.searchTerm,
    categories: request.categories,
    tags: request.tags,
    location: request.location,
    dateRange: request.dateRange,
    format: request.format,
    cost: request.cost,
  });

  const counts = {
    format: {
      virtual: data.counts?.format.virtual ?? 0,
      'in-person': data.counts?.format['in-person'] ?? 0,
      hybrid: data.counts?.format.hybrid ?? 0,
    },
    cost: {
      free: data.counts?.cost.free ?? 0,
      paid: data.counts?.cost.paid ?? 0,
    },
    categories: data.counts?.categories ?? {},
    tags: data.counts?.tags ?? {},
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

  return mobileDiscoverFeedSchema.parse({
    header: {
      eyebrow: 'KureCal mobile',
      title: 'Discover',
      subtitle:
        'The mobile web discovery hierarchy, translated into the native app shell.',
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
      activeRankingMode: rankingMode,
    },
    activeState: {
      resultLabel: buildDiscoverResultLabel(rankingMode, data.pagination.total),
      supportingText: buildDiscoverSupportingText(rankingMode),
    },
    results: {
      returnedCount: events.length,
      totalCount: data.pagination.total,
      hasMore: data.pagination.hasMore,
    },
    filters: {
      searchTerm: request.searchTerm,
      categories: request.categories,
      tags: request.tags,
      location: request.location,
      dateRange: request.dateRange,
      format: request.format,
      cost: request.cost,
      activeCount,
    },
    availableFilters: {
      categories: data.filters.available.categories,
      tags: availableTags,
    },
    counts,
    topPicks,
    events,
  });
}

export function buildDashboardSummary({
  hasCompletedOnboarding,
  profileHasCompletedOnboarding = false,
  trackedCount,
  savedCount,
  attendingCount,
  recommendationCards,
  upcomingCards,
  topRecommendation,
  upcomingCommitments,
  showOpenCommitmentSlot = false,
  insights,
  monthlyPulse,
  performance,
  engagementStreak,
  discoveryBreadth,
  networkPulse,
  predictionAccuracy,
  careerImpact,
  careerOutcomes,
}: {
  hasCompletedOnboarding: boolean;
  profileHasCompletedOnboarding?: boolean;
  trackedCount: number;
  savedCount: number;
  attendingCount: number;
  recommendationCards: MobileEventCard[];
  upcomingCards: MobileEventCard[];
  topRecommendation?: MobileDashboardTopRecommendation | null;
  upcomingCommitments?: MobileDashboardCommitment[];
  showOpenCommitmentSlot?: boolean;
  insights?: {
    pipeline: MobileDashboardPipelineInsight;
    funnel: MobileDashboardFunnelInsight;
  };
  monthlyPulse?: MobileDashboardMonthlyPulse;
  performance?: MobileDashboardPerformance;
  engagementStreak?: MobileDashboardEngagementStreak;
  discoveryBreadth?: MobileDashboardDiscoveryBreadth;
  networkPulse?: MobileDashboardNetworkPulse;
  predictionAccuracy?: MobileDashboardPredictionAccuracy;
  careerImpact?: MobileDashboardCareerImpact;
  careerOutcomes?: MobileDashboardCareerOutcomes;
}): MobileDashboardSummary {
  const recommendationCount = recommendationCards.length;
  const highlight = recommendationCards[0]?.title ?? null;

  return mobileDashboardSummarySchema.parse({
    hero: {
      eyebrow: 'Dashboard',
      title: hasCompletedOnboarding
        ? 'Your momentum, in one pass.'
        : 'Finish setup, then move faster.',
      subtitle: hasCompletedOnboarding
        ? 'A mobile-first overview of recommendations, saved plans, and your next few moves.'
        : 'Complete your profile to unlock stronger ranking and more useful planning signals.',
      highlight,
    },
    metrics: [
      {
        id: 'tracked',
        label: 'Tracked',
        value: String(trackedCount),
        detail: 'Events connected to your planning flow.',
      },
      {
        id: 'saved',
        label: 'Saved',
        value: String(savedCount),
        detail: 'Bookmarks ready for calendar review.',
      },
      {
        id: 'attending',
        label: 'Attending',
        value: String(attendingCount),
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
    recommendations: recommendationCards,
    upcomingLabel: 'Planned next',
    upcoming: upcomingCards,
    onboardingState: {
      hasCompleted: hasCompletedOnboarding,
      title: hasCompletedOnboarding
        ? 'Profile calibrated'
        : profileHasCompletedOnboarding
          ? 'Career profile still needs details'
          : 'Career profile incomplete',
      body: hasCompletedOnboarding
        ? 'Your ranking model is using the richer career profile from the main product.'
        : profileHasCompletedOnboarding
          ? 'You skipped the deeper setup earlier. Resume onboarding to improve recommendations and planning quality.'
          : 'The mobile shell is ready, but stronger recommendations still depend on the full onboarding profile.',
      ctaLabel: hasCompletedOnboarding
        ? 'View onboarding'
        : profileHasCompletedOnboarding
          ? 'Resume onboarding'
          : 'Finish onboarding',
    },
    topRecommendation: topRecommendation ?? null,
    upcomingCommitments: upcomingCommitments ?? [],
    showOpenCommitmentSlot,
    insights,
    monthlyPulse,
    performance,
    engagementStreak,
    discoveryBreadth,
    networkPulse,
    predictionAccuracy,
    careerImpact,
    careerOutcomes,
  });
}

export function buildCalendarFeed({
  header,
  monthStart,
  monthEnd,
  today,
  days,
  events,
  totalCount,
  savedCount,
  attendingCount,
  request,
  data,
  eventTypes,
}: {
  header: MobileSurfaceHeader;
  monthStart: LocalCalendarDateKey;
  monthEnd: LocalCalendarDateKey;
  today: LocalCalendarDateKey;
  days: MobileCalendarDaySummary[];
  events: MobileCalendarEvent[];
  totalCount: number;
  savedCount: number;
  attendingCount: number;
  request: {
    tags: string[];
    location: string | null;
    dateRange: {
      start: string | null;
      end: string | null;
    };
    cost: MobileDiscoverCost;
  };
  data?: FilteredEventsData | null;
  eventTypes: EventType[];
}): MobileCalendarFeed {
  const monthDate = new Date(`${monthStart}T12:00:00.000Z`);
  const activeCount = countActiveCalendarFilters(request);
  const counts = {
    cost: {
      free: data?.counts?.cost.free ?? 0,
      paid: data?.counts?.cost.paid ?? 0,
    },
    tags: data?.counts?.tags ?? {},
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
  const emptyBody =
    activeCount > 0
      ? 'Adjust a filter or move to another month to surface more events.'
      : 'Try a different month to keep exploring what is coming up.';

  return mobileCalendarFeedSchema.parse({
    header,
    month: {
      monthStart,
      monthEnd,
      label: monthDate.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    },
    today,
    metrics: {
      totalCount,
      savedCount,
      attendingCount,
    },
    results: {
      returnedCount: events.length,
      totalCount: data?.pagination.total ?? totalCount,
    },
    filters: {
      tags: request.tags,
      location: request.location,
      dateRange: request.dateRange,
      cost: request.cost,
      activeCount,
    },
    availableFilters: {
      tags: availableTags,
      eventTypes: eventTypes.map((eventType) => ({
        id: eventType.id,
        name: eventType.name,
        color: eventType.color,
        description: eventType.description ?? null,
      })),
    },
    counts,
    days,
    events,
    emptyState: {
      title: 'No events this month',
      description: emptyBody,
      body: emptyBody,
    },
  });
}
