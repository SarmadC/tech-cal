'use client';

import { FC } from 'react';
import { ClockIcon, MapPinIcon, UsersIcon, TagIcon } from '@phosphor-icons/react';
// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType } from '@/types';
// 2. IMPORT DATE UTILITY: Import the centralized formatting function.
import { formatDateTime } from '@/utils/dateUtils';

// 3. UPDATE PROPS: The interface now uses the new types.
interface EventInfoProps {
    event: Event;
    category?: EventType;
}

const EventInfo: FC<EventInfoProps> = ({ event, category }) => (
    <>
        <div className="space-y-4">
            <div className="flex items-center space-x-3 text-sm">
                <ClockIcon className="w-5 h-5 text-gray-400" />
                {/* 4. UPDATE FORMATTING: Use the new utility for consistent date/time display. */}
                <span>{formatDateTime(event.startTime)}</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
                <MapPinIcon className="w-5 h-5 text-gray-400" />
                <span>{event.location}</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
                <UsersIcon className="w-5 h-5 text-gray-400" />
                <span>Organized by {event.organizer}</span>
            </div>
        </div>
        {/* Display all tags - category and event tags */}
        <div className="flex flex-wrap gap-2">
            {/* Category tag */}
            {category && (
                <div className="px-3 py-1 text-xs rounded-md flex items-center space-x-2" style={{ backgroundColor: `${category.color}33`, color: category.color }}>
                    <TagIcon className="w-3 h-3" />
                    <span>{category.name}</span>
                </div>
            )}
            
            {/* Additional event tags */}
            {event.tags && event.tags.length > 0 && event.tags.map((tag) => (
                <div 
                    key={tag.id} 
                    className="px-3 py-1 text-xs rounded-md flex items-center space-x-2" 
                    style={{ backgroundColor: `${tag.color}33`, color: tag.color }}
                >
                    <TagIcon className="w-3 h-3" />
                    <span>{tag.name}</span>
                </div>
            ))}
        </div>
        <p className="text-sm leading-relaxed text-gray-300">
            {event.description}
        </p>
    </>
);

export default EventInfo;