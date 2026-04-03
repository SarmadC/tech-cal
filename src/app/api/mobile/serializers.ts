import {
  mobileDashboardSummarySchema,
  mobileDiscoverFeedSchema,
  mobileEventDetailSchema,
  mobileEventSummarySchema,
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
