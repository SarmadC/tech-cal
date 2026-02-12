import { Event, CareerImpactScore } from '@/types';
import { getEventFormat } from '@/utils/filterCountUtils';

export type EventWithImpact = Event & { careerImpact?: CareerImpactScore };

export type DiscoveryRankingMode = 'best-match' | 'trending' | 'near-me' | 'soonest';

export interface RankingOption {
    id: DiscoveryRankingMode;
    label: string;
    description: string;
}

export const DISCOVERY_RANKING_OPTIONS: RankingOption[] = [
    {
        id: 'best-match',
        label: 'Best match',
        description: 'Prioritize strongest career alignment',
    },
    {
        id: 'trending',
        label: 'Trending',
        description: 'Prioritize momentum and attendance',
    },
    {
        id: 'near-me',
        label: 'Near me',
        description: 'Prioritize local or remote accessibility',
    },
    {
        id: 'soonest',
        label: 'Soonest',
        description: 'Prioritize upcoming events first',
    },
];

interface RankingContext {
    locationHint?: string;
    hiddenEventIds?: Set<string>;
    categoryPenalty?: Record<string, number>;
}

interface DiversifyOptions {
    viewportSize?: number;
    maxSameOrganizer?: number;
    maxSameCategory?: number;
}

function getCareerScore(event: EventWithImpact): number {
    const raw = event.careerImpact?.overall ?? 0;
    return Math.min(100, Math.max(0, raw));
}

function getAttendeeScore(event: EventWithImpact): number {
    const attendees = event.attendeeCount ?? 0;
    if (attendees <= 0) {
        return 0;
    }

    return Math.min(100, Math.round(Math.log10(attendees + 1) * 40));
}

function getTimeUrgencyScore(event: EventWithImpact): number {
    const startAt = new Date(event.startTime).getTime();
    if (Number.isNaN(startAt)) {
        return 0;
    }

    const now = Date.now();
    const msUntilStart = startAt - now;

    if (msUntilStart <= 0) {
        return 0;
    }

    const daysUntilStart = msUntilStart / (1000 * 60 * 60 * 24);

    if (daysUntilStart <= 1) return 100;
    if (daysUntilStart <= 3) return 90;
    if (daysUntilStart <= 7) return 75;
    if (daysUntilStart <= 14) return 60;
    if (daysUntilStart <= 30) return 45;

    return 25;
}

function getNearMeScore(event: EventWithImpact, locationHint?: string): number {
    const format = getEventFormat(event);
    const location = (event.location ?? '').toLowerCase();
    const normalizedHint = (locationHint ?? '').trim().toLowerCase();

    let score = 0;

    if (format === 'virtual') {
        score += 75;
    } else if (format === 'hybrid') {
        score += 55;
    } else {
        score += 20;
    }

    if (normalizedHint.length > 0) {
        if (location.includes(normalizedHint)) {
            score += 35;
        } else {
            const hintParts = normalizedHint
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean);
            if (hintParts.some((part) => part.length > 2 && location.includes(part))) {
                score += 20;
            }
        }
    }

    return Math.min(100, score);
}

function getStartTimestamp(event: EventWithImpact): number {
    const timestamp = new Date(event.startTime).getTime();
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function getFeedbackPenalty(event: EventWithImpact, categoryPenalty: RankingContext['categoryPenalty']): number {
    if (!categoryPenalty) {
        return 0;
    }

    const categoryKey = event.eventTypeId || 'unknown';
    return categoryPenalty[categoryKey] ?? 0;
}

function getRankingScore(event: EventWithImpact, mode: DiscoveryRankingMode, locationHint?: string): number {
    const career = getCareerScore(event);
    const attendee = getAttendeeScore(event);
    const urgency = getTimeUrgencyScore(event);

    switch (mode) {
        case 'best-match':
            return career * 1.2 + attendee * 0.15 + urgency * 0.05;
        case 'trending':
            return attendee * 1.15 + career * 0.35 + urgency * 0.1;
        case 'near-me':
            return getNearMeScore(event, locationHint) * 1.1 + career * 0.35 + urgency * 0.1;
        case 'soonest':
            return urgency * 1.25 + career * 0.35 + attendee * 0.1;
        default:
            return career;
    }
}

export function rankEventsByMode(
    events: EventWithImpact[],
    mode: DiscoveryRankingMode,
    context: RankingContext = {}
): EventWithImpact[] {
    const hidden = context.hiddenEventIds;
    const filtered = hidden ? events.filter((event) => !hidden.has(event.id)) : events;

    return [...filtered].sort((a, b) => {
        const aPenalty = getFeedbackPenalty(a, context.categoryPenalty);
        const bPenalty = getFeedbackPenalty(b, context.categoryPenalty);

        const aScore = getRankingScore(a, mode, context.locationHint) - aPenalty;
        const bScore = getRankingScore(b, mode, context.locationHint) - bPenalty;

        if (bScore !== aScore) {
            return bScore - aScore;
        }

        const aStart = getStartTimestamp(a);
        const bStart = getStartTimestamp(b);
        if (aStart !== bStart) {
            return aStart - bStart;
        }

        return a.id.localeCompare(b.id);
    });
}

function getOrganizerKey(event: EventWithImpact): string {
    return event.organization?.id ?? event.organization?.name ?? event.organizer ?? 'unknown-organizer';
}

function getCategoryKey(event: EventWithImpact): string {
    return event.eventTypeId || event.category?.id || 'unknown-category';
}

export function diversifyFirstViewport(
    events: EventWithImpact[],
    options: DiversifyOptions = {}
): EventWithImpact[] {
    const {
        viewportSize = 9,
        maxSameOrganizer = 1,
        maxSameCategory = 2,
    } = options;

    if (events.length <= 2) {
        return events;
    }

    const organizerCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const prioritized: EventWithImpact[] = [];
    const deferred: EventWithImpact[] = [];

    events.forEach((event, index) => {
        if (index >= viewportSize) {
            deferred.push(event);
            return;
        }

        const organizerKey = getOrganizerKey(event);
        const categoryKey = getCategoryKey(event);
        const organizerCount = organizerCounts.get(organizerKey) ?? 0;
        const categoryCount = categoryCounts.get(categoryKey) ?? 0;

        const canPlace = organizerCount < maxSameOrganizer && categoryCount < maxSameCategory;

        if (canPlace) {
            prioritized.push(event);
            organizerCounts.set(organizerKey, organizerCount + 1);
            categoryCounts.set(categoryKey, categoryCount + 1);
        } else {
            deferred.push(event);
        }
    });

    while (prioritized.length < Math.min(viewportSize, events.length) && deferred.length > 0) {
        const candidate = deferred.shift();
        if (!candidate) {
            break;
        }

        const organizerKey = getOrganizerKey(candidate);
        const categoryKey = getCategoryKey(candidate);
        organizerCounts.set(organizerKey, (organizerCounts.get(organizerKey) ?? 0) + 1);
        categoryCounts.set(categoryKey, (categoryCounts.get(categoryKey) ?? 0) + 1);
        prioritized.push(candidate);
    }

    return [...prioritized, ...deferred];
}
