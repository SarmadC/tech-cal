import { AgendaItem } from '@/types';
import { formatDate } from '@/utils/dateUtils';

/**
 * Centralized utilities for timeline components
 * Provides consistent formatting, colors, and common functionality
 */

/**
 * Centralized type color system for agenda items
 * Provides consistent theme-aware colors across all timeline components
 */
export function getTypeColor(type: AgendaItem['type'], _isDark: boolean): {
    background: string;
    border: string;
    text: string;
    className: string;
} {
    // Normalize the type to lowercase for consistent matching
    const normalizedType = (type || '').toLowerCase();
    
    // Map types to CSS class names
    const typeClassMap: Record<string, string> = {
        keynote: 'event-tag-keynote',
        session: 'event-tag-session',
        workshop: 'event-tag-workshop',
        break: 'event-tag-break',
        networking: 'event-tag-networking',
        registration: 'event-tag-registration',
        certification: 'event-tag-certification',
        support: 'event-tag-support',
        exhibition: 'event-tag-exhibition',
        panel: 'event-tag-panel',
        entertainment: 'event-tag-entertainment',
        default: 'event-tag-default'
    };
    
    const className = typeClassMap[normalizedType] || typeClassMap.default;
    
    // Return CSS class name for use with custom CSS properties
    return {
        background: '', // Will be handled by CSS class
        border: '', // Will be handled by CSS class
        text: '', // Will be handled by CSS class
        className: className
    };
}

/**
 * Consistent empty state component for timeline views
 */
export function getEmptyState(isDark: boolean, message: string = 'No timeline available for this event.') {
    const iconClass = isDark ? 'text-gray-500' : 'text-gray-400';
    const textClass = isDark ? 'text-gray-400' : 'text-gray-600';
    
    return {
        iconClass,
        textClass,
        message
    };
}

/**
 * Format track name for display
 */
export function formatTrackName(track: string): string {
    if (!track || track === 'Main' || track === 'General') {
        return 'Main Track';
    }
    return track.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const AGENDA_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

const hasCalendarDate = (value?: string | null): boolean => {
    return Boolean(value && AGENDA_DATE_PATTERN.test(value.trim()));
};

const toMinutes = (timeString: string): number => {
    if (!timeString) return 0;
    if (timeString.includes('T') || timeString.includes(' ')) {
        const date = new Date(timeString);
        return date.getHours() * 60 + date.getMinutes();
    }
    const [hours, minutes] = timeString.split(':');
    return parseInt(hours || '0', 10) * 60 + parseInt(minutes || '0', 10);
};

export function getAgendaItemIdentity(item: AgendaItem, fallbackIndex?: number): string {
    const baseIdentity = [
        item.id,
        item.startTime,
        item.endTime,
        item.title,
        item.track,
        item.location,
        item.dayNumber,
    ]
        .filter((value) => value !== undefined && value !== null && value !== '')
        .join('|');

    if (baseIdentity) {
        return baseIdentity;
    }

    return `agenda-item-${fallbackIndex ?? 0}`;
}

export function getAgendaItemSortValue(item: AgendaItem): number {
    if (hasCalendarDate(item.startTime)) {
        const timestamp = new Date(item.startTime).getTime();
        if (!Number.isNaN(timestamp)) {
            return timestamp;
        }
    }

    return toMinutes(item.startTime);
}

export type AgendaDayGroup = {
    key: string;
    label: string;
    sortValue: number;
    items: AgendaItem[];
};

export function buildAgendaDayGroups(
    agenda: AgendaItem[] = [],
    eventTimezone?: string | null
): AgendaDayGroup[] {
    const groups = new Map<string, { sortValue: number; items: AgendaItem[]; dateLabel?: string }>();

    agenda.forEach((item) => {
        const sortValue = getAgendaItemSortValue(item);
        const dateLabel = hasCalendarDate(item.startTime)
            ? formatDate(item.startTime, eventTimezone)
            : undefined;
        const key = dateLabel ? `date:${dateLabel}` : `day:${item.dayNumber ?? 1}`;
        const existingGroup = groups.get(key);

        if (existingGroup) {
            existingGroup.sortValue = Math.min(existingGroup.sortValue, sortValue);
            existingGroup.items.push(item);
            return;
        }

        groups.set(key, {
            sortValue,
            items: [item],
            dateLabel,
        });
    });

    const sortedGroups = Array.from(groups.entries())
        .map(([key, group]) => ({
            key,
            sortValue: group.sortValue,
            dateLabel: group.dateLabel,
            items: [...group.items].sort((left, right) => getAgendaItemSortValue(left) - getAgendaItemSortValue(right)),
        }))
        .sort((left, right) => left.sortValue - right.sortValue);

    return sortedGroups.map((group, index) => {
        const dateSuffix = group.dateLabel ? ` - ${group.dateLabel}` : '';

        return {
            key: group.key,
            label: `Day ${index + 1}${dateSuffix}`,
            sortValue: group.sortValue,
            items: group.items,
        };
    });
}

/**
 * Check if two events overlap in time
 */
export function eventsOverlap(event1: AgendaItem, event2: AgendaItem): boolean {
    if (
        hasCalendarDate(event1.startTime) &&
        hasCalendarDate(event1.endTime) &&
        hasCalendarDate(event2.startTime) &&
        hasCalendarDate(event2.endTime)
    ) {
        const start1 = new Date(event1.startTime).getTime();
        const end1 = new Date(event1.endTime).getTime();
        const start2 = new Date(event2.startTime).getTime();
        const end2 = new Date(event2.endTime).getTime();

        if (![start1, end1, start2, end2].some((value) => Number.isNaN(value))) {
            return start1 < end2 && start2 < end1;
        }
    }

    const start1 = toMinutes(event1.startTime);
    const end1 = toMinutes(event1.endTime);
    const start2 = toMinutes(event2.startTime);
    const end2 = toMinutes(event2.endTime);

    return start1 < end2 && start2 < end1;
}

/**
 * Get speaker avatar URL with fallback
 */
type SpeakerAvatarInput = {
    name: string;
    avatar?: string;
    photoUrl?: string;
    linkedinUrl?: string;
    socialLinks?: { linkedin?: string };
};

const normalizeAvatarUrl = (value?: string | null): string | null => {
    const normalized = value?.trim();
    if (!normalized) {
        return null;
    }

    if (normalized.startsWith('//')) {
        return `https:${normalized}`;
    }

    if (/^https?:\/\//i.test(normalized)) {
        return normalized;
    }

    return null;
};

const normalizeLinkedInProfileUrl = (value?: string | null): string | null => {
    const normalized = value?.trim();
    if (!normalized) {
        return null;
    }

    if (/^https?:\/\//i.test(normalized)) {
        return normalized;
    }

    if (/^(www\.)?linkedin\.com\//i.test(normalized)) {
        return `https://${normalized.replace(/^https?:\/\//i, '')}`;
    }

    return null;
};

export function getSpeakerAvatarUrls(speaker: SpeakerAvatarInput, size: number = 40): { primary: string; fallback: string } {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&size=${size}&background=random&format=png`;
    const preferredPhoto = normalizeAvatarUrl(speaker.photoUrl) || normalizeAvatarUrl(speaker.avatar);
    const linkedInProfile = normalizeLinkedInProfileUrl(speaker.linkedinUrl || speaker.socialLinks?.linkedin);
    const primary = preferredPhoto || (linkedInProfile ? `https://unavatar.io/${encodeURIComponent(linkedInProfile)}` : fallback);

    return { primary, fallback };
}

export function getSpeakerAvatarUrl(speaker: SpeakerAvatarInput, size: number = 40): string {
    return getSpeakerAvatarUrls(speaker, size).primary;
}
