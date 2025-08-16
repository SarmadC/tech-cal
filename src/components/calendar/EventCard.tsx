'use client';

import { FC, memo } from 'react';
import { EnrichedAppEvent } from '@/types';
import { Clock, MapPin, Users, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
// 1. Import the new date utility function
import { formatDate } from '@/utils/dateUtils';

interface EventCardProps {
    event: EnrichedAppEvent;
    categoryName?: string;
    isSelected?: boolean;
    onCardClick?: (event: EnrichedAppEvent) => void;
    onTrackClick?: (event: EnrichedAppEvent, isCurrentlyTracked: boolean) => void;
}

const EventCard: FC<EventCardProps> = ({
    event,
    categoryName = "General",
    isSelected = false,
    onCardClick,
    onTrackClick,
}) => {
    const { isTracked } = event;

    return (
        <div
            onClick={() => onCardClick?.(event)}
            className={`
                premium-card smooth-colors
                bg-[#1e1e1e] border border-gray-800 rounded-xl p-4
                transition-all duration-200 cursor-pointer group
                hover:border-blue-500/50 hover:bg-[#2a2a2a]
                ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : ''}
            `}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                    <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {event.title}
                    </span>
                    <span className="text-sm text-gray-400 flex items-center mt-1 hover-lift">
                        <Users className="w-3 h-3 mr-1.5" /> {event.organizer}
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
                                ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }
                        `}
                        aria-label={isTracked ? 'Untrack Event' : 'Track Event'}
                    >
                        <Star className={`w-4 h-4 ${isTracked ? 'fill-current bounce-in' : ''}`} />
                    </button>
                )}
            </div>

            <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                {event.description}
            </p>

            <div className="flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center space-x-3">
                    <span className="flex items-center hover-lift">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(event.startTime, { month: 'short', day: 'numeric' })}
                    </span>
                    {event.location && (
                        <span className="flex items-center truncate hover-lift">
                            <MapPin className="w-3 h-3 mr-1" />
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