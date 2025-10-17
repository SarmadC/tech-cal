'use client';

import { FC, memo } from 'react';
// 1. UPDATE IMPORTS: Use the new, canonical `TrackedEvent` type.
import { TrackedEvent } from '@/types';
import { getCategoryColor } from '@/utils/eventUtils';
import { getPillColor } from '@/utils/pillColorUtils';
import { ClockIcon, MapPinIcon, UsersIcon, StarIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/dateUtils';

// 2. UPDATE PROPS: The interface now uses the new types.
interface EventCardProps {
    event: TrackedEvent;
    categoryName?: string;
    isSelected?: boolean;
    onCardClick?: (event: TrackedEvent) => void;
    onTrackClick?: (event: TrackedEvent, isCurrentlyTracked: boolean) => void;
}

const EventCard: FC<EventCardProps> = ({
    event,
    categoryName = "General",
    isSelected = false,
    onCardClick,
    onTrackClick,
}) => {
    // The `isTracked` property is guaranteed to exist on the `TrackedEvent` type.
    const { isTracked } = event;

    return (
        <div
            onClick={() => onCardClick?.(event)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCardClick?.(event);
                }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Event: ${event.title} by ${event.organizer}`}
            className={`
                event-card premium-card smooth-colors rounded-xl p-4
                border border-gray-800 transition-all duration-200 cursor-pointer group
                hover:border-zinc-500/50
                focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent
                ${isSelected ? 'border-zinc-300 ring-2 ring-white/30' : ''}
            `}
            style={{
                ['--category-title-color' as unknown as string]: getPillColor(getCategoryColor(event), 0.5),
                ['--text-on-pastel' as unknown as string]: getPillColor(getCategoryColor(event), 0.5)
            }}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                    <span className="font-semibold text-white group-hover:text-zinc-200 transition-colors">
                        {event.title}
                    </span>
                    <span className="text-sm text-gray-400 flex items-center mt-1 hover-lift">
                        <UsersIcon className="w-3 h-3 mr-1.5" /> {event.organizer}
                    </span>
                </div>
                {onTrackClick && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTrackClick(event, isTracked);
                        }}
                        className={`
                            premium-button scale-on-hover
                            p-2 rounded-full transition-colors
                            ${isTracked
                                ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }
                        `}
                        aria-label={isTracked ? 'Untrack Event' : 'Track Event'}
                    >
                        <StarIcon className={`w-4 h-4 ${isTracked ? 'fill-current bounce-in' : ''}`} />
                    </button>
                )}
            </div>

            <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                {event.description}
            </p>

            <div className="flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center space-x-3">
                    <span className="flex items-center hover-lift">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {formatDate(event.startTime, event.timezone)}
                    </span>
                    {event.location && (
                        <span className="flex items-center truncate hover-lift">
                            <MapPinIcon className="w-3 h-3 mr-1" />
                            {event.location}
                        </span>
                    )}
                </div>
                <Badge
                    variant="outline"
                    className="border-gray-700 scale-on-hover"
                    style={{
                        borderColor: event.color,
                        color: event.color,
                        backgroundColor: `${event.color}1A`
                    }}
                >
                    {categoryName}
                </Badge>
            </div>
        </div>
    );
};

export default memo(EventCard);