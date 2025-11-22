import { AgendaItem } from '@/types';

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

/**
 * Check if two events overlap in time
 */
export function eventsOverlap(event1: AgendaItem, event2: AgendaItem): boolean {
    const toMinutes = (timeString: string): number => {
        if (!timeString) return 0;
        if (timeString.includes('T') || timeString.includes(' ')) {
            const d = new Date(timeString);
            return d.getHours() * 60 + d.getMinutes();
        }
        const [h, m] = timeString.split(':');
        return parseInt(h || '0', 10) * 60 + parseInt(m || '0', 10);
    };
    
    const start1 = toMinutes(event1.startTime);
    const end1 = toMinutes(event1.endTime);
    const start2 = toMinutes(event2.startTime);
    const end2 = toMinutes(event2.endTime);
    
    return start1 < end2 && start2 < end1;
}

/**
 * Get speaker avatar URL with fallback
 */
export function getSpeakerAvatarUrl(speaker: { name: string; avatar?: string }, size: number = 40): string {
    if (speaker.avatar) {
        return speaker.avatar;
    }
    
    // Generate initials-based avatar
    const initials = speaker.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=random`;
}
