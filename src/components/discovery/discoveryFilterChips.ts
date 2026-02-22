import { EventType } from '@/types';
import { UnifiedFilterOptions } from '@/hooks/useUnifiedServerFiltering';

export type FilterChipType =
    | 'search'
    | 'location'
    | 'date'
    | 'format'
    | 'cost'
    | 'budget'
    | 'difficulty'
    | 'popularity'
    | 'duration'
    | 'availability'
    | 'recommended'
    | 'category'
    | 'tag';

export interface DiscoveryFilterChip {
    key: string;
    label: string;
    type: FilterChipType;
    filterKey: keyof UnifiedFilterOptions;
    value?: string;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function formatDateRange(range: UnifiedFilterOptions['dateRange']): string | null {
    if (!range.start && !range.end) {
        return null;
    }

    if (range.start && range.end) {
        return `${formatDate(range.start)} - ${formatDate(range.end)}`;
    }

    if (range.start) {
        return `From ${formatDate(range.start)}`;
    }

    return `Until ${formatDate(range.end as Date)}`;
}

export function buildActiveFilterChips(
    filters: UnifiedFilterOptions,
    categories: EventType[]
): DiscoveryFilterChip[] {
    const chips: DiscoveryFilterChip[] = [];

    if (filters.searchTerm.trim()) {
        chips.push({
            key: 'search-term',
            label: `Search: ${filters.searchTerm.trim()}`,
            type: 'search',
            filterKey: 'searchTerm',
        });
    }

    filters.locations
        .filter((location) => location.trim().length > 0)
        .forEach((location, index) => {
            chips.push({
                key: `location-${index}-${location}`,
                label: `Location: ${location}`,
                type: 'location',
                filterKey: 'locations',
                value: location,
            });
        });

    const dateLabel = formatDateRange(filters.dateRange);
    if (dateLabel) {
        chips.push({
            key: 'date-range',
            label: dateLabel,
            type: 'date',
            filterKey: 'dateRange',
        });
    }

    if (filters.format !== 'all') {
        chips.push({
            key: `format-${filters.format}`,
            label: `Format: ${filters.format}`,
            type: 'format',
            filterKey: 'format',
            value: filters.format,
        });
    }

    if (filters.cost !== 'all') {
        chips.push({
            key: `cost-${filters.cost}`,
            label: `Cost: ${filters.cost}`,
            type: 'cost',
            filterKey: 'cost',
            value: filters.cost,
        });
    }

    if (filters.budget !== 'all') {
        chips.push({
            key: `budget-${filters.budget}`,
            label: `Budget: ${filters.budget}`,
            type: 'budget',
            filterKey: 'budget',
            value: filters.budget,
        });
    }

    if (filters.difficulty !== 'all') {
        chips.push({
            key: `difficulty-${filters.difficulty}`,
            label: `Level: ${filters.difficulty}`,
            type: 'difficulty',
            filterKey: 'difficulty',
            value: filters.difficulty,
        });
    }

    if (filters.popularity !== 'all') {
        chips.push({
            key: `popularity-${filters.popularity}`,
            label: `Popularity: ${filters.popularity}`,
            type: 'popularity',
            filterKey: 'popularity',
            value: filters.popularity,
        });
    }

    if (filters.duration !== 'all') {
        chips.push({
            key: `duration-${filters.duration}`,
            label: `Duration: ${filters.duration}`,
            type: 'duration',
            filterKey: 'duration',
            value: filters.duration,
        });
    }

    if (filters.availability !== 'all') {
        chips.push({
            key: `availability-${filters.availability}`,
            label: `Availability: ${filters.availability}`,
            type: 'availability',
            filterKey: 'availability',
            value: filters.availability,
        });
    }

    if (filters.recommended) {
        chips.push({
            key: 'recommended-only',
            label: 'Recommended only',
            type: 'recommended',
            filterKey: 'recommended',
            value: 'true',
        });
    }

    const categoryNameMap = new Map(categories.map((category) => [category.id, category.name]));
    filters.categories.forEach((categoryId) => {
        chips.push({
            key: `category-${categoryId}`,
            label: `Category: ${categoryNameMap.get(categoryId) ?? categoryId}`,
            type: 'category',
            filterKey: 'categories',
            value: categoryId,
        });
    });

    filters.tags.forEach((tag) => {
        chips.push({
            key: `tag-${tag}`,
            label: `Tag: ${tag}`,
            type: 'tag',
            filterKey: 'tags',
            value: tag,
        });
    });

    return chips;
}
