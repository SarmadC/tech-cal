import { AgendaItem } from '@/types';

/**
 * Centralized utilities for timeline components
 * Provides consistent formatting, colors, and common functionality
 */

/**
 * Unified time formatting for timeline components
 * Handles both ISO strings and time-only strings consistently
 */
export function formatTimelineTime(timeString: string): string {
    if (!timeString) return '';
    
    if (timeString.includes('T') || timeString.includes(' ')) {
        // Handle ISO strings or datetime strings
        return new Date(timeString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } else {
        // Handle time-only strings (HH:MM format)
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
}

/**
 * Centralized type color system for agenda items
 * Provides consistent theme-aware colors across all timeline components
 */
export function getTypeColor(type: AgendaItem['type'], isDark: boolean): {
    background: string;
    border: string;
    text: string;
} {
    const baseClasses = {
        keynote: 'bg-blue-500/20 border-blue-500/30',
        session: 'bg-green-500/20 border-green-500/30',
        workshop: 'bg-purple-500/20 border-purple-500/30',
        break: 'bg-orange-500/20 border-orange-500/30',
        networking: 'bg-pink-500/20 border-pink-500/30',
        default: 'bg-gray-500/20 border-gray-500/30'
    };
    
    const textClasses = isDark 
        ? {
            keynote: 'text-blue-300',
            session: 'text-green-300',
            workshop: 'text-purple-300',
            break: 'text-orange-300',
            networking: 'text-pink-300',
            default: 'text-gray-300'
        }
        : {
            keynote: 'text-blue-700',
            session: 'text-green-700',
            workshop: 'text-purple-700',
            break: 'text-orange-700',
            networking: 'text-pink-700',
            default: 'text-gray-700'
        };
    
    const typeKey = type as keyof typeof baseClasses || 'default';
    
    return {
        background: baseClasses[typeKey],
        border: baseClasses[typeKey],
        text: textClasses[typeKey]
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
