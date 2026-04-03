import type {
  LocalCalendarDateKey,
  MobileCalendarEvent,
  MobileCalendarFeed,
} from '@kurecal/domain';

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

export function formatLocalDateKey(date: Date): LocalCalendarDateKey {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function parseLocalDateKey(
  value: string | null | undefined
): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function resolveMonthStartKey(
  value: LocalCalendarDateKey | Date
): LocalCalendarDateKey {
  const date = typeof value === 'string' ? parseLocalDateKey(value) : value;
  const resolved = date ?? new Date();

  return formatLocalDateKey(
    new Date(resolved.getFullYear(), resolved.getMonth(), 1)
  );
}

export function resolveCurrentMonthStartKey(): LocalCalendarDateKey {
  return resolveMonthStartKey(new Date());
}

export function resolveTodayDateKey(): LocalCalendarDateKey {
  return formatLocalDateKey(new Date());
}

export function shiftMonthKey(
  monthStartKey: LocalCalendarDateKey,
  offset: number
): LocalCalendarDateKey {
  const monthStart = parseLocalDateKey(monthStartKey) ?? new Date();

  return formatLocalDateKey(
    new Date(monthStart.getFullYear(), monthStart.getMonth() + offset, 1)
  );
}

export function isDateInMonth(
  dateKey: LocalCalendarDateKey,
  monthStartKey: LocalCalendarDateKey
): boolean {
  return resolveMonthStartKey(dateKey) === monthStartKey;
}

export function formatMonthLabel(monthStartKey: LocalCalendarDateKey): string {
  const date = parseLocalDateKey(monthStartKey) ?? new Date();

  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function formatDayHeading(dateKey: LocalCalendarDateKey): string {
  const date = parseLocalDateKey(dateKey) ?? new Date();

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function groupCalendarEventsByDate(events: MobileCalendarEvent[]) {
  const grouped = new Map<LocalCalendarDateKey, MobileCalendarEvent[]>();

  for (const event of events) {
    const dayEvents = grouped.get(event.dateKey) ?? [];
    dayEvents.push(event);
    grouped.set(event.dateKey, dayEvents);
  }

  for (const [dateKey, dayEvents] of grouped.entries()) {
    grouped.set(
      dateKey,
      dayEvents
        .slice()
        .sort(
          (left, right) =>
            new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
        )
    );
  }

  return grouped;
}

export function resolvePreferredSelectedDate(
  feed: MobileCalendarFeed,
  currentSelectedDate?: LocalCalendarDateKey | null
): LocalCalendarDateKey {
  const monthDayKeys = new Set(
    feed.days.filter((day) => day.inCurrentMonth).map((day) => day.dateKey)
  );

  if (currentSelectedDate && monthDayKeys.has(currentSelectedDate)) {
    return currentSelectedDate;
  }

  if (monthDayKeys.has(feed.today)) {
    return feed.today;
  }

  return feed.events[0]?.dateKey ?? feed.month.monthStart;
}
