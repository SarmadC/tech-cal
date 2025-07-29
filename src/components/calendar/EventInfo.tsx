// src/components/calendar/EventInfo.tsx
'use client';

import { FC } from 'react';
import { Clock, MapPin, Users, Tag } from 'lucide-react';
import { AppEvent, AppEventType } from '@/types';

interface EventInfoProps {
    event: AppEvent;
    category?: AppEventType;
}

const EventInfo: FC<EventInfoProps> = ({ event, category }) => (
    <>
        <div className="space-y-4">
            <div className="flex items-center space-x-3 text-sm">
                <Clock className="w-5 h-5 text-gray-400" />
                <span>{new Date(event.startTime).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span>{event.location}</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
                <Users className="w-5 h-5 text-gray-400" />
                <span>Organized by {event.organizer}</span>
            </div>
        </div>
        {category && (
            <div className="flex items-center space-x-2">
                <div className="px-3 py-1 text-xs rounded-full flex items-center space-x-2" style={{ backgroundColor: `${category.color}33`, color: category.color }}>
                    <Tag className="w-3 h-3" />
                    <span>{category.name}</span>
                </div>
            </div>
        )}
        <p className="text-sm leading-relaxed text-gray-300">
            {event.description}
        </p>
    </>
);

export default EventInfo;