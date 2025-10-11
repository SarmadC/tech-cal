'use client';

import { FC } from 'react';
import { ClockIcon, MapPinIcon, TagIcon } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType } from '@/types';
// 2. IMPORT DATE UTILITY: Import the centralized formatting function.
import { formatDateTime } from '@/utils/dateUtils';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { addColorOpacity, getColorWithFullOpacity } from '@/utils/colorUtils';

// 3. UPDATE PROPS: The interface now uses the new types.
interface EventInfoProps {
    event: Event;
    category?: EventType;
}

const EventInfo: FC<EventInfoProps> = ({ event, category }) => {
    const timelineTheme = useTimelineTheme();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    
    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center space-x-3 text-sm">
                    <ClockIcon className={`w-5 h-5 ${timelineTheme.textMuted}`} />
                    {/* 4. UPDATE FORMATTING: Use the new utility for consistent date/time display. */}
                    <span className={timelineTheme.textSecondary}>{formatDateTime(event.startTime)}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                    <MapPinIcon className={`w-5 h-5 ${timelineTheme.textMuted}`} />
                    <span className={timelineTheme.textSecondary}>{event.location}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" className={`w-5 h-5 ${timelineTheme.textMuted}`}>
                        <path d="M240,208H224V96a16,16,0,0,0-16-16H144V32a16,16,0,0,0-24.88-13.32L39.12,72A16,16,0,0,0,32,85.34V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM208,96V208H144V96ZM48,85.34,128,32V208H48ZM112,112v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm-32,0v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm0,56v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Zm32,0v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Z"></path>
                    </svg>
                    <span className={timelineTheme.textSecondary}>{event.organizer}</span>
                </div>
            </div>
        {/* Display all tags - category and event tags */}
        <div className="flex flex-wrap gap-2">
            {/* Category tag */}
            {category && (
                <div 
                    className="px-3 py-1 text-xs rounded-md flex items-center space-x-2" 
                    style={{ 
                        backgroundColor: addColorOpacity(category.color, 0.2, isDark), 
                        color: getColorWithFullOpacity(category.color, isDark) 
                    }}
                >
                    <TagIcon className="w-3 h-3" />
                    <span>{category.name}</span>
                </div>
            )}
            
            {/* Additional event tags */}
            {event.tags && event.tags.length > 0 && event.tags.map((tag) => (
                <div 
                    key={tag.id} 
                    className="px-3 py-1 text-xs rounded-md flex items-center space-x-2" 
                    style={{ 
                        backgroundColor: addColorOpacity(tag.color, 0.2, isDark), 
                        color: getColorWithFullOpacity(tag.color, isDark) 
                    }}
                >
                    <TagIcon className="w-3 h-3" />
                    <span>{tag.name}</span>
                </div>
            ))}
        </div>
            <p className={`text-sm leading-relaxed ${timelineTheme.textSecondary}`}>
                {event.description}
            </p>
        </>
    );
};

export default EventInfo;