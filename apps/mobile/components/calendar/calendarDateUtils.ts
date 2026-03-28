import type { MobileDiscoverDateRange } from '@kurecal/domain';

export type CalendarDay = {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
  isToday: boolean;
};

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

export function formatLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function buildDateKeyFromParts(
  date: Date,
  options?: {
    timeZone?: string | null;
    useUtc?: boolean;
  }
) {
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
      // Fall back to local date formatting when the timezone is invalid.
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

export function isDateOnlyEvent(
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

export function formatEventDateKey(
  startTime: string,
  endTime?: string | null,
  timeZone?: string | null
) {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return formatLocalDateKey(new Date());
  }

  if (isDateOnlyEvent(startTime, endTime, timeZone)) {
    return buildDateKeyFromParts(date, { useUtc: true });
  }

  return buildDateKeyFromParts(date, { timeZone });
}

export function formatEventStartTimeLabel(
  startTime: string,
  endTime?: string | null,
  timeZone?: string | null
) {
  if (isDateOnlyEvent(startTime, endTime, timeZone)) {
    return 'All day';
  }

  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return 'TBD';
  }

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

export function parseLocalDateKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function resolveMonthStartKey(value: string | Date) {
  const date = typeof value === 'string' ? parseLocalDateKey(value) : value;
  const resolved = date ?? new Date();
  return formatLocalDateKey(new Date(resolved.getFullYear(), resolved.getMonth(), 1));
}

export function resolveMonthEndKey(monthStartKey: string) {
  const monthStart = parseLocalDateKey(monthStartKey) ?? new Date();
  return formatLocalDateKey(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
}

export function shiftMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

export function shiftMonthKey(monthStartKey: string, offset: number) {
  const monthStart = parseLocalDateKey(monthStartKey) ?? new Date();
  return formatLocalDateKey(shiftMonth(monthStart, offset));
}

export function resolveDateInMonth(selectedDateKey: string | null, monthStartKey: string) {
  const monthStart = parseLocalDateKey(monthStartKey) ?? new Date();
  const selectedDate = parseLocalDateKey(selectedDateKey);
  const targetDay = selectedDate?.getDate() ?? 1;
  const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  return formatLocalDateKey(
    new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(targetDay, lastDay))
  );
}

export function formatMonthLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatMonthButtonLabel(monthStartKey: string) {
  const date = parseLocalDateKey(monthStartKey) ?? new Date();
  return date.toLocaleDateString('en-US', {
    month: 'long',
  });
}

export function formatAccessibilityLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateLabel(value: string | null | undefined) {
  const date = parseLocalDateKey(value);
  if (!date) {
    return 'Any date';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRangeSummary(value: MobileDiscoverDateRange) {
  if (!value.start && !value.end) {
    return 'Any date';
  }

  if (value.start && value.end) {
    return `${formatDateLabel(value.start)} - ${formatDateLabel(value.end)}`;
  }

  if (value.start) {
    return `From ${formatDateLabel(value.start)}`;
  }

  return `Until ${formatDateLabel(value.end)}`;
}

export function resolveInitialMonthFromRange(value: MobileDiscoverDateRange) {
  return parseLocalDateKey(value.start) ?? parseLocalDateKey(value.end) ?? new Date();
}

export function resolveInitialMonthFromDate(value: string | null | undefined) {
  return parseLocalDateKey(value) ?? new Date();
}

export function buildCalendarWeeks(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const todayKey = formatLocalDateKey(new Date());

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(start);
      date.setDate(start.getDate() + weekIndex * 7 + dayIndex);

      return {
        date,
        key: formatLocalDateKey(date),
        inCurrentMonth: date.getMonth() === month.getMonth(),
        isToday: formatLocalDateKey(date) === todayKey,
      } satisfies CalendarDay;
    })
  );
}

export function applyRangeSelection(range: MobileDiscoverDateRange, nextKey: string): MobileDiscoverDateRange {
  if (!range.start || (range.start && range.end)) {
    return {
      start: nextKey,
      end: null,
    };
  }

  if (nextKey === range.start) {
    return {
      start: null,
      end: null,
    };
  }

  if (nextKey < range.start) {
    return {
      start: nextKey,
      end: range.start,
    };
  }

  return {
    start: range.start,
    end: nextKey,
  };
}

export function applySingleSelection(current: string | null, nextKey: string) {
  if (current === nextKey) {
    return null;
  }

  return nextKey;
}
