'use client';

import { FC, useState } from 'react';
import { ClockIcon, MapPinIcon, TagIcon, CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
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
    const [showAllTags, setShowAllTags] = useState(false);
    
    // Combine category and event tags
    const allTags = [
        ...(category ? [{ id: 'category', name: category.name, color: category.color }] : []),
        ...(event.tags || [])
    ];
    
    const maxInitialTags = 5;
    const shouldShowToggle = allTags.length > maxInitialTags;
    const displayedTags = showAllTags ? allTags : allTags.slice(0, maxInitialTags);
    
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
        {/* Display tags with collapsible functionality */}
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {displayedTags.map((tag) => (
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
            
            {/* Show more/less toggle button */}
            {shouldShowToggle && (
                <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                    {showAllTags ? (
                        <>
                            <CaretUpIcon className="w-3 h-3" />
                            Show less
                        </>
                    ) : (
                        <>
                            <CaretDownIcon className="w-3 h-3" />
                            Show {allTags.length - maxInitialTags} more
                        </>
                    )}
                </button>
            )}
        </div>
            <p className={`text-sm leading-relaxed ${timelineTheme.textSecondary}`}>
                {event.description}
            </p>
        </>
    );
};

export default EventInfo;