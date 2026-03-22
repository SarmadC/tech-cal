export type UpdateQueueSignalKey =
    | 'needs_review'
    | 'schedule_change'
    | 'starts_soon'
    | 'past_event';

export interface UpdateQueueSignals {
    needsReview: boolean;
    hasScheduleChange: boolean;
    startsSoon: boolean;
    isPastEvent: boolean;
}

export interface UpdateQueueFieldLike {
    field_name: string;
    field_status?: string | null;
}

export interface UpdateQueueFieldCounts {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
}

export interface UpdateQueueSortableItem {
    created_at: string;
    status: string;
    event?: {
        start_time?: string | null;
    } | null;
    fieldCounts?: UpdateQueueFieldCounts;
}

const SIGNAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const SCHEDULE_FIELDS = new Set(['start_time', 'end_time', 'timezone', 'agenda']);
const LOCATION_FIELDS = new Set([
    'location',
    'venue_name',
    'venue_address',
    'venue_city',
    'venue_country',
    'event_format',
    'meeting_platform',
    'virtual_url',
]);
const SOURCE_FIELDS = new Set([
    'source_url',
    'event_url',
    'registration_url',
    'website_url',
    'canonical_url',
]);

const STATUS_SORT_ORDER: Record<string, number> = {
    pending: 0,
    partially_approved: 1,
    approved: 2,
    auto_applied: 3,
    rejected: 4,
};

const FIELD_STATUS_SORT_ORDER: Record<string, number> = {
    pending: 0,
    approved: 1,
    rejected: 2,
    auto_applied: 3,
};

const toTimestamp = (value?: string | null): number | null => {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

const compareNumbers = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);

export const isScheduleField = (fieldName: string): boolean => SCHEDULE_FIELDS.has(fieldName);

export const getFieldPriority = (fieldName: string): number => {
    if (SCHEDULE_FIELDS.has(fieldName)) return 0;
    if (LOCATION_FIELDS.has(fieldName)) return 1;
    if (SOURCE_FIELDS.has(fieldName)) return 2;
    if (fieldName === 'title') return 3;
    if (fieldName === 'description') return 4;
    return 5;
};

export const formatQueueFieldLabel = (fieldName: string): string =>
    fieldName
        .split('_')
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');

export const sortChangedFieldNames = (fieldNames: string[]): string[] =>
    Array.from(new Set(fieldNames)).sort((left, right) => {
        const priorityCompare = compareNumbers(getFieldPriority(left), getFieldPriority(right));
        if (priorityCompare !== 0) {
            return priorityCompare;
        }
        return formatQueueFieldLabel(left).localeCompare(formatQueueFieldLabel(right));
    });

export const sortQueueFields = <T extends UpdateQueueFieldLike>(fields: T[]): T[] =>
    [...fields].sort((left, right) => {
        const leftStatus = FIELD_STATUS_SORT_ORDER[left.field_status ?? ''] ?? 99;
        const rightStatus = FIELD_STATUS_SORT_ORDER[right.field_status ?? ''] ?? 99;
        const statusCompare = compareNumbers(leftStatus, rightStatus);
        if (statusCompare !== 0) {
            return statusCompare;
        }

        const priorityCompare = compareNumbers(
            getFieldPriority(left.field_name),
            getFieldPriority(right.field_name)
        );
        if (priorityCompare !== 0) {
            return priorityCompare;
        }

        return formatQueueFieldLabel(left.field_name).localeCompare(formatQueueFieldLabel(right.field_name));
    });

export const deriveUpdateQueueSignals = ({
    requiresReviewReason,
    eventStartTime,
    fieldNames,
    now = new Date(),
}: {
    requiresReviewReason?: string | null;
    eventStartTime?: string | null;
    fieldNames: string[];
    now?: Date;
}): UpdateQueueSignals => {
    const nowMs = now.getTime();
    const startTimestamp = toTimestamp(eventStartTime);
    const startsSoon =
        startTimestamp !== null &&
        startTimestamp >= nowMs &&
        startTimestamp <= nowMs + SIGNAL_WINDOW_MS;

    return {
        needsReview: Boolean(requiresReviewReason),
        hasScheduleChange: fieldNames.some(isScheduleField),
        startsSoon,
        isPastEvent: startTimestamp !== null && startTimestamp < nowMs,
    };
};

export const matchesSignalFilter = (
    signals: UpdateQueueSignals,
    signal?: UpdateQueueSignalKey | null
): boolean => {
    if (!signal) {
        return true;
    }

    if (signal === 'needs_review') return signals.needsReview;
    if (signal === 'schedule_change') return signals.hasScheduleChange;
    if (signal === 'starts_soon') return signals.startsSoon;
    if (signal === 'past_event') return signals.isPastEvent;
    return true;
};

const compareUrgency = (
    left: UpdateQueueSortableItem,
    right: UpdateQueueSortableItem,
    now: Date
): number => {
    const nowMs = now.getTime();
    const leftStart = toTimestamp(left.event?.start_time ?? null);
    const rightStart = toTimestamp(right.event?.start_time ?? null);

    const resolveBucket = (start: number | null): number => {
        if (start === null) return 1;
        if (start >= nowMs) return 0;
        return 2;
    };

    const bucketCompare = compareNumbers(resolveBucket(leftStart), resolveBucket(rightStart));
    if (bucketCompare !== 0) {
        return bucketCompare;
    }

    const leftCreated = toTimestamp(left.created_at) ?? 0;
    const rightCreated = toTimestamp(right.created_at) ?? 0;

    if (leftStart !== null && rightStart !== null) {
        if (leftStart >= nowMs && rightStart >= nowMs) {
            const futureCompare = compareNumbers(leftStart, rightStart);
            if (futureCompare !== 0) {
                return futureCompare;
            }
        } else if (leftStart < nowMs && rightStart < nowMs) {
            const pastCompare = compareNumbers(rightStart, leftStart);
            if (pastCompare !== 0) {
                return pastCompare;
            }
        }
    } else if (leftStart === null && rightStart === null) {
        const noDateCompare = compareNumbers(rightCreated, leftCreated);
        if (noDateCompare !== 0) {
            return noDateCompare;
        }
    }

    return compareNumbers(rightCreated, leftCreated);
};

export const compareUpdateQueueItems = (
    left: UpdateQueueSortableItem,
    right: UpdateQueueSortableItem,
    sortKey: 'created_at' | 'event_start_time' | 'pending_fields' | 'status',
    direction: 'asc' | 'desc',
    now = new Date()
): number => {
    let result = 0;

    if (sortKey === 'created_at') {
        result = compareNumbers(
            toTimestamp(left.created_at) ?? 0,
            toTimestamp(right.created_at) ?? 0
        );
    } else if (sortKey === 'pending_fields') {
        result = compareNumbers(
            left.fieldCounts?.pending ?? 0,
            right.fieldCounts?.pending ?? 0
        );
    } else if (sortKey === 'status') {
        result = compareNumbers(
            STATUS_SORT_ORDER[left.status] ?? 99,
            STATUS_SORT_ORDER[right.status] ?? 99
        );
    } else {
        result = compareUrgency(left, right, now);
    }

    if (result === 0) {
        result = compareNumbers(
            toTimestamp(right.created_at) ?? 0,
            toTimestamp(left.created_at) ?? 0
        );
    }

    return direction === 'desc' ? result * -1 : result;
};
