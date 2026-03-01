/**
 * Centralized utility for calendar event colors.
 * Maps event types and categories to CSS variables defined in event-type-colors.css.
 */

import { Event, MultiDayEventInstance } from '@/types';

/**
 * Maps a category name to its corresponding CSS variable name.
 * @param categoryName The name of the event category.
 * @returns The CSS variable name.
 */
export const getCategoryColorVar = (categoryName?: string): string => {
    if (!categoryName) return '--color-category-conference'; // Default

    const normalized = categoryName.toLowerCase().trim();

    switch (normalized) {
        case 'registration':
            return '--event-registration-bg';
        case 'certification':
            return '--event-certification-bg';
        case 'support':
            return '--event-support-bg';
        case 'exhibition':
            return '--event-exhibition-bg';
        case 'panel':
            return '--event-panel-bg';
        case 'entertainment':
            return '--event-entertainment-bg';
        case 'keynote':
            return '--event-keynote-bg';
        case 'session':
            return '--event-session-bg';
        case 'workshop':
            return '--event-workshop-bg';
        case 'break':
            return '--event-break-bg';
        case 'networking':
            return '--event-networking-bg';
        case 'tech summit':
        case 'summit':
            return '--color-category-summit';
        case 'conference':
            return '--color-category-conference';
        case 'webinar':
            return '--color-category-webinar';
        case 'startup':
            return '--color-category-startup';
        case 'trade show':
            return '--color-category-trade-show';
        case 'product launch':
            return '--color-category-product-launch';
        case 'training':
            return '--color-category-training';
        default:
            return '--event-default-bg';
    }
};

/**
 * Gets the actual color value (var(...) or hex) for an event.
 * @param event The event or event instance.
 * @returns The color value.
 */
export const getEventAccentColor = (event: Event | MultiDayEventInstance): string => {
    // Map category name to CSS variable (DB colors no longer used)
    const categoryName = event.category?.name;
    const colorVar = getCategoryColorVar(categoryName);

    return `var(${colorVar})`;
};
