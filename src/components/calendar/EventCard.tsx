// src/components/calendar/EventCard.tsx
'use client';

import { FC, memo } from 'react';
// FIX: Import the new EnrichedAppEvent type
import { EnrichedAppEvent } from '@/types';
import { Clock, MapPin, Users, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
    // FIX: Use the more specific type for the event prop
    event: EnrichedAppEvent;
    categoryName?: string; // Add a prop for the category name
    isSelected?: boolean;
    onCardClick?: (event: EnrichedAppEvent) => void;
    onTrackClick?: (event: EnrichedAppEvent, isCurrentlyTracked: boolean) => void;
}

// A helper to format dates concisely
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
};

const EventCard: FC<EventCardProps> = ({
    event,
    categoryName = "General", // Default to "General" if no name is provided
    isSelected = false,
    onCardClick,
    onTrackClick,
}) => {
    // FIX: No more 'any'. We can safely access isTracked because of our new type.
    const { isTracked } = event;

    return (
        <div
            onClick={() => onCardClick?.(event)}
            className={`
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
                    <span className="text-sm text-gray-400 flex items-center mt-1">
                        <Users className="w-3 h-3 mr-1.5" /> {event.organizer}
                    </span>
                </div>
                {onTrackClick && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTrackClick(event, isTracked);
                        }}
                        className={`p-2 rounded-full transition-colors ${isTracked
                                ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                        aria-label={isTracked ? 'Untrack Event' : 'Track Event'}
                    >
                        <Star className={`w-4 h-4 ${isTracked ? 'fill-current' : ''}`} />
                    </button>
                )}
            </div>

            <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                {event.description}
            </p>

            <div className="flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center space-x-3">
                    <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(event.startTime)}
                    </span>
                    {event.location && (
                        <span className="flex items-center truncate">
                            <MapPin className="w-3 h-3 mr-1" />
                            {event.location}
                        </span>
                    )}
                </div>
                <Badge
                    variant="outline"
                    className="border-gray-700"
                    style={{
                        borderColor: event.color,
                        color: event.color,
                        backgroundColor: `${event.color}1A`
                    }}
                >
                    {/* FIX: Use the categoryName prop */}
                    {categoryName}
                </Badge>
            </div>
        </div>
    );
};

export default memo(EventCard);