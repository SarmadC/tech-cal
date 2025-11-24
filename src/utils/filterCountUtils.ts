// src/utils/filterCountUtils.ts
import { Event, EventType } from '@/types';

/**
 * Get event format from event_format column
 * Maps database enum values to filter values
 * Defaults to "in-person" if null (per user requirement)
 */
export function getEventFormat(event: Event): 'virtual' | 'in-person' | 'hybrid' {
    if (!event.eventFormat) {
        return 'in-person'; // Default to in-person if null
    }

    // Map database enum values to filter values
    switch (event.eventFormat) {
        case 'Online':
            return 'virtual';
        case 'In-person':
            return 'in-person';
        case 'Hybrid':
            return 'hybrid';
        default:
            return 'in-person'; // Fallback to in-person for unknown values
    }
}

/**
 * Determine if an event is free based on price_min column
 * Returns true if price_min is null or 0, false otherwise
 */
export function isEventFree(event: Event): boolean {
    // If priceMin is null or 0, event is free
    return event.priceMin === null || event.priceMin === undefined || event.priceMin === 0;
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
): {
    format: Record<string, number>;
    cost: Record<string, number>;
    categories: Record<string, number>;
} {
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
        if (event.eventTypeId && counts.categories.hasOwnProperty(event.eventTypeId)) {
            counts.categories[event.eventTypeId]++;
        }
    });

    return counts;
}

