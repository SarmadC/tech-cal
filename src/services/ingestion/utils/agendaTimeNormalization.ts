import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import {
    isValidIanaTimezone,
    normalizeTimezone,
    parseLocalTime,
} from '@/utils/ingestion/ExtractNormalization';

export interface AgendaTimeNormalizationInput {
    startTime: string;
    endTime: string;
    dayNumber?: number | null;
    durationMinutes?: number | null;
}

export interface AgendaTimeAnchor {
    eventStartTime?: string | null;
    eventTimezone?: string | null;
}

export interface NormalizedAgendaTimeRange {
    startTime: string;
    endTime: string;
    durationMinutes: number | null;
}

interface ResolvedAgendaTime {
    isoString: string;
    isTimeOnly: boolean;
}

const ISO_DATE_PATTERN = /\d{4}-\d{2}-\d{2}/;

const hasCalendarDate = (value: string): boolean => ISO_DATE_PATTERN.test(value);

const isAbsoluteDateTime = (value: string): boolean =>
    hasCalendarDate(value) && !Number.isNaN(new Date(value).getTime());

const resolveAnchorTimezone = (eventTimezone?: string | null): string => {
    const normalizedTimezone = normalizeTimezone(eventTimezone, undefined, 'UTC').timezone;
    return isValidIanaTimezone(normalizedTimezone) ? normalizedTimezone : 'UTC';
};

const shiftIsoDate = (isoDate: string, dayOffset: number): string => {
    const [year, month, day] = isoDate.split('-').map(Number);
    const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));

    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(
        shifted.getUTCDate()
    ).padStart(2, '0')}`;
};

const normalizeSingleAgendaTime = (
    value: string,
    anchor: AgendaTimeAnchor,
    dayOffset: number
): ResolvedAgendaTime => {
    const trimmed = value.trim();

    if (isAbsoluteDateTime(trimmed)) {
        return {
            isoString: new Date(trimmed).toISOString(),
            isTimeOnly: false,
        };
    }

    const localTime = parseLocalTime(trimmed);
    if (!localTime) {
        throw new Error(`Unsupported agenda time format: "${value}"`);
    }

    if (!anchor.eventStartTime) {
        throw new Error(`Cannot anchor time-only agenda value "${value}" without event start_time`);
    }

    const eventStartDate = new Date(anchor.eventStartTime);
    if (Number.isNaN(eventStartDate.getTime())) {
        throw new Error(
            `Cannot anchor time-only agenda value "${value}" because event start_time is invalid`
        );
    }

    const timezone = resolveAnchorTimezone(anchor.eventTimezone);
    const localEventDate = formatInTimeZone(eventStartDate, timezone, 'yyyy-MM-dd');
    const targetDate = shiftIsoDate(localEventDate, dayOffset);

    return {
        isoString: fromZonedTime(`${targetDate}T${localTime}:00`, timezone).toISOString(),
        isTimeOnly: true,
    };
};

export const normalizeAgendaTimeRangeForEvent = (
    input: AgendaTimeNormalizationInput,
    anchor: AgendaTimeAnchor
): NormalizedAgendaTimeRange => {
    const baseDayOffset = Math.max((input.dayNumber ?? 1) - 1, 0);

    const normalizedStart = normalizeSingleAgendaTime(input.startTime, anchor, baseDayOffset);
    let normalizedEnd = normalizeSingleAgendaTime(input.endTime, anchor, baseDayOffset);

    if (
        normalizedEnd.isTimeOnly &&
        new Date(normalizedEnd.isoString).getTime() <= new Date(normalizedStart.isoString).getTime()
    ) {
        normalizedEnd = normalizeSingleAgendaTime(input.endTime, anchor, baseDayOffset + 1);
    }

    let durationMinutes =
        typeof input.durationMinutes === 'number' && Number.isFinite(input.durationMinutes)
            ? Math.max(0, Math.round(input.durationMinutes))
            : null;

    if (durationMinutes === null) {
        const startMs = new Date(normalizedStart.isoString).getTime();
        const endMs = new Date(normalizedEnd.isoString).getTime();
        const diffMinutes = Math.round((endMs - startMs) / 60000);

        if (diffMinutes >= 0) {
            durationMinutes = diffMinutes;
        }
    }

    return {
        startTime: normalizedStart.isoString,
        endTime: normalizedEnd.isoString,
        durationMinutes,
    };
};
