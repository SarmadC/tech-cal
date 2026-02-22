import { Event } from '@/types';
import { UnifiedFilterOptions } from '@/hooks/useUnifiedServerFiltering';
import { getEventFormat, isEventFree, normalizeDifficulty } from '@/utils/filterCountUtils';

export interface QuickFitBadge {
    id: 'schedule-conflict' | 'within-budget' | 'remote' | 'beginner-friendly';
    label: 'Schedule conflict' | 'Within budget' | 'Remote' | 'Beginner-friendly';
}

interface QuickFitContext {
    filters: Pick<UnifiedFilterOptions, 'budget' | 'cost'>;
    scheduledEvents?: Event[];
}

const BUDGET_THRESHOLDS: Record<Exclude<UnifiedFilterOptions['budget'], 'all' | 'free-only' | 'unlimited'>, number> = {
    low: 50,
    moderate: 150,
    high: 400,
};

function getEventTimeWindow(event: Event): { start: number; end: number } | null {
    const start = new Date(event.startTime).getTime();
    if (Number.isNaN(start)) {
        return null;
    }

    const parsedEnd = event.endTime ? new Date(event.endTime).getTime() : NaN;
    const end = Number.isNaN(parsedEnd) ? start + (90 * 60 * 1000) : parsedEnd;

    return {
        start,
        end: Math.max(end, start + 1),
    };
}

function hasTimeConflict(event: Event, scheduledEvents: Event[]): boolean {
    const eventWindow = getEventTimeWindow(event);
    if (!eventWindow) {
        return false;
    }

    return scheduledEvents.some((scheduledEvent) => {
        if (scheduledEvent.id === event.id) {
            return false;
        }

        const scheduledWindow = getEventTimeWindow(scheduledEvent);
        if (!scheduledWindow) {
            return false;
        }

        return eventWindow.start < scheduledWindow.end && eventWindow.end > scheduledWindow.start;
    });
}

function isWithinBudget(event: Event, filters: Pick<UnifiedFilterOptions, 'budget' | 'cost'>): boolean {
    const free = isEventFree(event);

    if (filters.cost === 'free') {
        return free;
    }

    if (filters.budget === 'free-only') {
        return free;
    }

    if (filters.budget === 'unlimited') {
        return true;
    }

    if (free) {
        return true;
    }

    const price = event.priceMin ?? null;
    if (price === null || Number.isNaN(price)) {
        return false;
    }

    if (filters.budget === 'all') {
        return price <= 150;
    }

    const threshold = BUDGET_THRESHOLDS[filters.budget as keyof typeof BUDGET_THRESHOLDS];
    return threshold !== undefined ? price <= threshold : false;
}

export function getQuickFitBadges(event: Event, context: QuickFitContext): QuickFitBadge[] {
    const badges: QuickFitBadge[] = [];

    if (context.scheduledEvents && context.scheduledEvents.length > 0 && hasTimeConflict(event, context.scheduledEvents)) {
        badges.push({ id: 'schedule-conflict', label: 'Schedule conflict' });
    }

    if (isWithinBudget(event, context.filters)) {
        badges.push({ id: 'within-budget', label: 'Within budget' });
    }

    const format = getEventFormat(event);
    if (format === 'virtual' || format === 'hybrid') {
        badges.push({ id: 'remote', label: 'Remote' });
    }

    if (normalizeDifficulty(event) === 'beginner') {
        badges.push({ id: 'beginner-friendly', label: 'Beginner-friendly' });
    }

    return badges.slice(0, 4);
}
