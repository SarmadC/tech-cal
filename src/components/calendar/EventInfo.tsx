'use client';

import { FC, useState } from 'react';
// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType } from '@/types';
// 2. IMPORT DATE UTILITY: Import the centralized formatting function.
import { formatDateTime } from '@/utils/dateUtils';

// 3. UPDATE PROPS: The interface now uses the new types.
interface EventInfoProps {
    event: Event;
    category?: EventType;
    hideDescription?: boolean;
    useSingleTagColor?: boolean;
}

const EventInfo: FC<EventInfoProps> = ({ event, category: _category, hideDescription = false, useSingleTagColor: _useSingleTagColor = false }) => {
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
                <div className="text-[11px] font-medium text-foreground-tertiary uppercase tracking-[0.05em]">
                    Date
                </div>
                <div className="text-[13px] text-foreground-primary font-medium leading-tight">
                    {formatDateTime(event.startTime, event.timezone)}
                </div>

                {/* Location Property */}
                <div className="text-[11px] font-medium text-foreground-tertiary uppercase tracking-[0.05em]">
                    Location
                </div>
                <div className="text-[13px] text-foreground-primary font-medium leading-tight flex items-center gap-1">
                    {event.location || 'Online'}

                </div>

                {/* Host Property */}
                <div className="text-[11px] font-medium text-foreground-tertiary uppercase tracking-[0.05em]">
                    Host
                </div>
                <div className="text-[13px] text-foreground-primary font-medium leading-tight flex items-center gap-2">
                    {event.organization?.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={event.organization.logo}
                            alt=""
                            className="w-4 h-4 object-contain"
                        />
                    )}
                    <span>{event.organization?.name || event.organizer || 'Unknown Host'}</span>
                </div>

                {/* Tags Property */}
                {allTags.length > 0 && (
                    <>
                        <div className="text-[11px] font-medium text-foreground-tertiary uppercase tracking-[0.05em] pt-1.5 self-start">
                            Tags
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {displayedTags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="h-5 px-2 flex items-center text-[11px] font-medium rounded-sm bg-background-secondary/80 text-foreground-secondary border border-border-subtle"
                                >
                                    <span>{tag.name}</span>
                                </div>
                            ))}

                            {shouldShowToggle && (
                                <button
                                    onClick={() => setShowAllTags(!showAllTags)}
                                    className="h-5 px-1 flex items-center text-[11px] text-foreground-tertiary hover:text-foreground-primary transition-colors"
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
                    className="text-[13px] leading-[1.6] text-foreground-secondary border-t border-border-subtle pt-6 mt-6"
                >
                    {event.description}
                </div>
            )}
        </div>
    );
};

export default EventInfo;
