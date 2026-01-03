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
        <div className="space-y-6">
            {/* Notion-style Property Grid - Polished */}
            <div className="grid grid-cols-[120px_1fr] gap-y-3 text-[13px]">
                {/* Date Property */}
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.05em] pt-0.5">
                    Date
                </div>
                <div className="text-zinc-100 font-medium">
                    {formatDateTime(event.startTime, event.timezone)}
                </div>

                {/* Location Property */}
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.05em] pt-0.5">
                    Location
                </div>
                <div className="text-zinc-100 font-medium">
                    {event.location || 'Online'}
                </div>

                {/* Tags Property - No Label, just values */}
                {allTags.length > 0 && (
                    <>
                        <div className="col-start-2 flex flex-wrap gap-1.5 pt-1">
                            {displayedTags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="h-5 px-2 flex items-center text-[11px] font-medium rounded-sm bg-zinc-800/50 text-zinc-300 border border-white/5"
                                >
                                    <span>{tag.name}</span>
                                </div>
                            ))}

                            {shouldShowToggle && (
                                <button
                                    onClick={() => setShowAllTags(!showAllTags)}
                                    className="h-5 px-1 flex items-center text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    {showAllTags ? 'Show less' : `+${allTags.length - maxInitialTags} more`}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {!hideDescription && (
                <div className={`text-sm leading-relaxed ${timelineTheme.textSecondary} border-t border-gray-200 dark:border-white/10 pt-4 mt-4`}>
                    {event.description}
                </div>
            )}
        </div>
    );
};

export default EventInfo;
