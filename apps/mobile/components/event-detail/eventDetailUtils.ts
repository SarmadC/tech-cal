import type {
  MobileEventDetail,
  MobileEventDetailAgendaItem,
  MobileEventDetailSpeaker,
} from '@kurecal/domain';

const NON_MAPPABLE_LOCATIONS = new Set(['online', 'remote', 'hybrid', 'tbd', 'location tba']);

export const SPEAKER_PREVIEW_COUNT = 4;

export type AgendaDayGroup = {
  key: string;
  displayDayNumber: number;
  items: MobileEventDetailAgendaItem[];
};

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function formatDatePart(value: string, timeZone?: string | null) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: timeZone ?? undefined,
  });
}

function formatWeekdayPart(value: string, timeZone?: string | null) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timeZone ?? undefined,
  });
}

function formatTimePart(value: string, timeZone?: string | null) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone ?? undefined,
  });
}

function formatCalendarDayKey(value: string, timeZone?: string | null) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timeZone ?? undefined,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export function formatEventDateTime(
  startTime: string,
  endTime?: string | null,
  timeZone?: string | null
) {
  if (!isValidDate(startTime)) {
    return startTime;
  }

  const startDateLabel = formatDatePart(startTime, timeZone);
  const startTimeLabel = formatTimePart(startTime, timeZone);

  if (!endTime || !isValidDate(endTime)) {
    return `${startDateLabel} · ${startTimeLabel}`;
  }

  const endDateLabel = formatDatePart(endTime, timeZone);
  const endTimeLabel = formatTimePart(endTime, timeZone);

  if (startDateLabel === endDateLabel) {
    return startTimeLabel === endTimeLabel
      ? `${startDateLabel} · ${startTimeLabel}`
      : `${startDateLabel} · ${startTimeLabel} to ${endTimeLabel}`;
  }

  return `${startDateLabel} · ${startTimeLabel} to ${endDateLabel} · ${endTimeLabel}`;
}

export function formatEventStartDateTime(startTime: string, timeZone?: string | null) {
  if (!isValidDate(startTime)) {
    return startTime;
  }

  return `${formatDatePart(startTime, timeZone)} · ${formatTimePart(startTime, timeZone)}`;
}

export function formatAgendaTimeRange(
  agendaItem: MobileEventDetailAgendaItem,
  timeZone?: string | null
) {
  if (!isValidDate(agendaItem.startTime)) {
    return agendaItem.startTime;
  }

  const startLabel = formatTimePart(agendaItem.startTime, timeZone);
  if (!agendaItem.endTime || !isValidDate(agendaItem.endTime)) {
    return startLabel;
  }

  return `${startLabel} - ${formatTimePart(agendaItem.endTime, timeZone)}`;
}

export function formatAgendaStartTime(
  agendaItem: MobileEventDetailAgendaItem,
  timeZone?: string | null
) {
  if (!isValidDate(agendaItem.startTime)) {
    return agendaItem.startTime;
  }

  return formatTimePart(agendaItem.startTime, timeZone);
}

export function buildAgendaDayGroups(
  agenda: MobileEventDetailAgendaItem[],
  timeZone?: string | null
) {
  const grouped = new Map<
    string,
    {
      sortValue: number;
      items: MobileEventDetailAgendaItem[];
    }
  >();

  agenda
    .slice()
    .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())
    .forEach((agendaItem) => {
      const sortValue = isValidDate(agendaItem.startTime)
        ? new Date(agendaItem.startTime).getTime()
        : Number.MAX_SAFE_INTEGER;
      const dayKey = isValidDate(agendaItem.startTime)
        ? formatCalendarDayKey(agendaItem.startTime, timeZone)
        : agendaItem.startTime;
      const key = isValidDate(agendaItem.startTime)
        ? `date:${dayKey}`
        : `day:${agendaItem.dayNumber ?? 1}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.items.push(agendaItem);
        existing.sortValue = Math.min(existing.sortValue, sortValue);
        return;
      }

      grouped.set(key, {
        sortValue,
        items: [agendaItem],
      });
    });

  return Array.from(grouped.entries())
    .map(([key, group]) => ({
      key,
      sortValue: group.sortValue,
      items: group.items.sort(
        (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
      ),
    }))
    .sort((left, right) => left.sortValue - right.sortValue)
    .map((group, index) => ({
      key: group.key,
      displayDayNumber: index + 1,
      items: group.items,
    }));
}

export function formatAgendaDayLabel(
  group: AgendaDayGroup,
  totalGroups: number,
  timeZone?: string | null
) {
  const firstItem = group.items[0];
  if (!firstItem || !isValidDate(firstItem.startTime)) {
    return `Day ${group.displayDayNumber}`;
  }

  const dateLabel = formatWeekdayPart(firstItem.startTime, timeZone);
  return totalGroups > 1 ? `Day ${group.displayDayNumber} · ${dateLabel}` : dateLabel;
}

export function formatAgendaDayMeta(
  items: MobileEventDetailAgendaItem[],
  timeZone?: string | null
) {
  if (items.length === 0) {
    return 'No sessions';
  }

  const firstItem = items[0];
  if (!firstItem || !isValidDate(firstItem.startTime)) {
    return `${items.length} session${items.length === 1 ? '' : 's'}`;
  }

  const startLabel = formatTimePart(firstItem.startTime, timeZone);
  const sessionCount = `${items.length} session${items.length === 1 ? '' : 's'}`;

  return `Starts ${startLabel} · ${sessionCount}`;
}

export function buildAgendaSecondaryText(agendaItem: MobileEventDetailAgendaItem) {
  const speakerNames = (agendaItem.speakers ?? [])
    .map((speaker) => speaker.name?.trim())
    .filter((speakerName): speakerName is string => Boolean(speakerName))
    .join(', ');

  const parts = [agendaItem.track, agendaItem.location, speakerNames].filter(
    (value): value is string => Boolean(value && value.trim())
  );

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function buildSpeakerSecondaryText(speaker: MobileEventDetailSpeaker) {
  const parts = [speaker.title, speaker.company].filter(
    (value): value is string => Boolean(value && value.trim())
  );

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function collectUniqueSpeakers(detail: MobileEventDetail) {
  const speakers = [...detail.speakerLineup, ...detail.agenda.flatMap((agendaItem) => agendaItem.speakers ?? [])];
  const seen = new Set<string>();

  return speakers.filter((speaker, index) => {
    const key = `${speaker.id || 'speaker'}::${speaker.name || index}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return Boolean(speaker.name?.trim());
  });
}

export function hasMappableLocation(location?: string | null): location is string {
  if (!location?.trim()) {
    return false;
  }

  return !NON_MAPPABLE_LOCATIONS.has(location.trim().toLowerCase());
}

export function buildMapsSearchUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
