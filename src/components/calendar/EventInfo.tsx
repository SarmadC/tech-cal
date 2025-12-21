'use client';

import { FC, useState } from 'react';
import { ClockIcon, MapPinIcon, CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
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
    hideDescription?: boolean;
    useSingleTagColor?: boolean;
}

const EventInfo: FC<EventInfoProps> = ({ event, category: _category, hideDescription = false, useSingleTagColor = false }) => {
    const timelineTheme = useTimelineTheme();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [showAllTags, setShowAllTags] = useState(false);
    
    // Only show event-specific tags, exclude category name tag
    const allTags = event.tags || [];
    
    const maxInitialTags = 5;
    const shouldShowToggle = allTags.length > maxInitialTags;
    const displayedTags = showAllTags ? allTags : allTags.slice(0, maxInitialTags);
    
    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center space-x-3 text-sm">
                    <ClockIcon className={`w-5 h-5 ${timelineTheme.textMuted}`} />
                    {/* 4. UPDATE FORMATTING: Use the new utility for consistent date/time display. */}
                    <span className={timelineTheme.textSecondary}>{formatDateTime(event.startTime, event.timezone)}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                    <MapPinIcon className={`w-5 h-5 ${timelineTheme.textMuted}`} />
                    <span className={timelineTheme.textSecondary}>{event.location}</span>
                </div>
            </div>
        {/* Display tags with collapsible functionality */}
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {displayedTags.map((tag) => (
                    <div 
                        key={tag.id} 
                        className={`px-3 py-1 text-xs rounded-md flex items-center space-x-2 ${
                            useSingleTagColor
                                ? isDark
                                    ? 'bg-gray-800 text-gray-300'
                                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                                : isDark 
                                    ? 'border border-white/20'
                                    : 'bg-gray-100 border border-gray-300'
                        }`}
                        style={useSingleTagColor ? undefined : { 
                            backgroundColor: isDark ? addColorOpacity(tag.color, 0.2, isDark) : 'rgb(243 244 246)', // gray-100
                            color: isDark ? getColorWithFullOpacity(tag.color, isDark) : 'rgb(55 65 81)' // gray-700
                        }}
                    >
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
            {!hideDescription && (
                <p className={`text-sm leading-relaxed ${timelineTheme.textSecondary}`}>
                    {event.description}
                </p>
            )}
        </>
    );
};

export default EventInfo;
