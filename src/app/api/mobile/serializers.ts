import {
  mobileCalendarEventSchema,
  mobileCalendarFeedSchema,
  type MobileCalendarDaySummary,
  type MobileCalendarEvent,
  type MobileCalendarFeed,
  mobileDashboardSummarySchema,
  mobileDiscoverFeedSchema,
  mobileEventDetailSchema,
  mobileEventSummarySchema,
  type LocalCalendarDateKey,
  type MobileDashboardSummary,
  type MobileDiscoverFeed,
  type MobileEventDetail,
  type MobileEventDetailAgendaItem,
  type MobileEventDetailSpeaker,
  type MobileEventEngagement,
  type MobileEventSummary,
  type MobileSurfaceHeader,
} from '@kurecal/domain';

import type { AgendaItem, Event } from '@/types';
import { isEventFreeFromPricing, normalizeEventFormat } from '@/utils/filterCountUtils';

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
    eventTypeName: event.category?.name?.trim() || null,
    eventTypeColor:
      event.category?.color?.trim() ||
      (typeof event.color === 'string' ? event.color.trim() : null),
    isAllDay: isDateOnlyEvent(event.startTime, event.endTime, event.timezone),
  });
}

export function buildDiscoverFeed({
  header,
  events,
  page,
  pageSize,
  totalCount,
}: {
  header: MobileSurfaceHeader;
  events: MobileEventSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}): MobileDiscoverFeed {
  return mobileDiscoverFeedSchema.parse({
    header,
    totalCount,
    nextPage: page * pageSize < totalCount ? page + 1 : null,
    events,
  });
}

export function buildDashboardSummary({
  header,
  upcomingCount,
  savedCount,
  recommendationCount,
  heroEvent,
  upcomingEvents,
  recommendedEvents,
}: {
  header: MobileSurfaceHeader;
  upcomingCount: number;
  savedCount: number;
  recommendationCount: number;
  heroEvent?: MobileEventSummary | null;
  upcomingEvents?: MobileEventSummary[];
  recommendedEvents?: MobileEventSummary[];
}): MobileDashboardSummary {
  return mobileDashboardSummarySchema.parse({
    header,
    upcomingCount,
    savedCount,
    recommendationCount,
    heroEvent: heroEvent ?? null,
    upcomingEvents: upcomingEvents ?? [],
    recommendedEvents: recommendedEvents ?? [],
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
}): MobileCalendarFeed {
  const monthDate = new Date(`${monthStart}T12:00:00.000Z`);

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
    days,
    events,
    emptyState: {
      title: 'No events this month',
      description:
        'Try another month or head back to Discover to save new events into your plan.',
    },
  });
}
