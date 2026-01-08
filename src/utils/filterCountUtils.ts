// src/utils/filterCountUtils.ts
import { Event, EventType } from '@/types';

export interface FilterCounts {
    format: Record<string, number>;
    cost: Record<string, number>;
    categories: Record<string, number>;
}

/**
 * Get event format from event_format column
 * Maps database enum values to filter values
 * Defaults to "in-person" if null (per user requirement)
 */
export function getEventFormat(event: Event): 'virtual' | 'in-person' | 'hybrid' {
    return normalizeEventFormat(event.eventFormat);
}

/**
 * Normalize event_format values (DB or app) into filter keys
 */
export function normalizeEventFormat(
    format?: string | null
): 'virtual' | 'in-person' | 'hybrid' {
    if (!format) return 'in-person';

    switch (format) {
        case 'Online':
        case 'virtual':
            return 'virtual';
        case 'In-person':
        case 'in-person':
            return 'in-person';
        case 'Hybrid':
        case 'hybrid':
            return 'hybrid';
        default:
            return 'in-person';
    }
}

/**
 * Determine if an event is free based on price_min and priceRange
 * Defaults to paid (false) when uncertain, as most conferences/events are paid
 */
export function isEventFree(event: Event): boolean {
    // If priceMin > 0, it's definitely not free
    if (event.priceMin !== null && event.priceMin !== undefined && event.priceMin > 0) {
        return false;
    }
    
    // If priceRange exists, check it for explicit indicators
    if (event.priceRange) {
        const priceRangeLower = event.priceRange.toLowerCase().trim();
        // If priceRange explicitly says "free", it's free
        if (priceRangeLower === 'free') {
            return true;
        }
        // If priceRange contains "paid", "$", or numbers, it's not free
        if (priceRangeLower.includes('paid') || 
            priceRangeLower.includes('$') || 
            /\d/.test(priceRangeLower)) {
            return false;
        }
    }
    
    // Default to paid (false) when uncertain - most events are paid
    // Only return true if priceMin is explicitly 0 (not null/undefined)
    return event.priceMin === 0;
}

/**
 * Normalize difficulty level from event
 * First checks event.difficulty field, then falls back to inference from title/description
 * Always returns a value (defaults to 'intermediate') to match getDifficultyFromEvent behavior
 */
export function normalizeDifficulty(event: Event): 'beginner' | 'intermediate' | 'advanced' {
    // First, check if event.difficulty exists and is valid
    if (event.difficulty) {
        const normalized = event.difficulty.toLowerCase();
        if (normalized === 'beginner' || normalized === 'intermediate' || normalized === 'advanced') {
            return normalized as 'beginner' | 'intermediate' | 'advanced';
        }
    }

    // Fallback: infer from title/description (matching getDifficultyFromEvent logic exactly)
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();
    
    if (title.includes('beginner') || title.includes('intro') || title.includes('101')) {
        return 'beginner';
    }
    if (title.includes('advanced') || title.includes('expert') || description.includes('prerequisite')) {
        return 'advanced';
    }
    
    // Default to intermediate (matching getDifficultyFromEvent behavior)
    return 'intermediate';
}

/**
 * Calculate filter counts for discovery sidebar
 * Returns counts object with all required keys initialized
 */
export function calculateFilterCounts(
    events: Event[],
    categories: EventType[]
): FilterCounts {
    // Initialize counts with all required keys
    const counts = {
        format: {
            virtual: 0,
            'in-person': 0,
            hybrid: 0
        },
        cost: {
            free: 0,
            paid: 0
        },
        categories: {} as Record<string, number>
    };

    // Seed category counts with zeros for all categories
    categories.forEach(cat => {
        counts.categories[cat.id] = 0;
    });

    // Iterate through events and count
    events.forEach(event => {
        // Count format
        const format = getEventFormat(event);
        counts.format[format]++;

        // Count cost
        if (isEventFree(event)) {
            counts.cost.free++;
        } else {
            counts.cost.paid++;
        }

        // Count categories
        if (event.eventTypeId && Object.prototype.hasOwnProperty.call(counts.categories, event.eventTypeId)) {
            counts.categories[event.eventTypeId]++;
        }
    });

    return counts;
}

