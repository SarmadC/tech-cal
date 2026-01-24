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
            {/* Property Grid - Linear Style */}
            <div className="grid grid-cols-[100px_1fr] gap-y-3 items-baseline">
                {/* Date Property */}
                <div className="text-[11px] font-medium text-[#757575] uppercase tracking-[0.05em]">
                    Date
                </div>
                <div className="text-[13px] text-[#E6E6E6] font-medium leading-tight">
                    {formatDateTime(event.startTime, event.timezone)}
                </div>

                {/* Location Property */}
                <div className="text-[11px] font-medium text-[#757575] uppercase tracking-[0.05em]">
                    Location
                </div>
                <div className="text-[13px] text-[#E6E6E6] font-medium leading-tight flex items-center gap-1">
                    {event.location || 'Online'}

                </div>

                {/* Host Property */}
                <div className="text-[11px] font-medium text-[#757575] uppercase tracking-[0.05em]">
                    Host
                </div>
                <div className="text-[13px] text-[#E6E6E6] font-medium leading-tight flex items-center gap-2">
                    {event.organization?.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={event.organization.logo}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover bg-white/10"
                        />
                    )}
                    <span>{event.organization?.name || event.organizer || 'Unknown Host'}</span>
                </div>

                {/* Tags Property */}
                {allTags.length > 0 && (
                    <>
                        <div className="text-[11px] font-medium text-[#757575] uppercase tracking-[0.05em] pt-1.5 self-start">
                            Tags
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
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

            {!hideDescription && event.description && (
                <div
                    className={`text-[13px] leading-[1.6] text-[#B0B0B0] border-t border-white/10 pt-6 mt-6`}
                    style={{ borderTopColor: 'rgba(255,255,255,0.08)' }}
                >
                    {event.description}
                </div>
            )}
        </div>
    );
};

export default EventInfo;
