// src/components/calendar/UpcomingEventCard.tsx
'use client';

import { FC } from 'react';
// We still accept a base AppEvent, as the parent component might not know the tracked status
import { AppEvent } from '@/types';
import EventCard from './EventCard';

interface UpcomingEventCardProps {
    event: AppEvent;
    onViewDetails: (event: AppEvent) => void;
    onMarkInterested: (event: AppEvent) => void;
}

const UpcomingEventCard: FC<UpcomingEventCardProps> = ({
    event,
    onViewDetails,
    onMarkInterested,
}) => {
    // 👇 FIX IS HERE:
    // We create a new object that conforms to the EnrichedAppEvent type.
    // We spread the original event properties and provide a default value
    // for `isTracked` if it's not already present.
    const enrichedEvent = {
        ...event,
        isTracked: event.isTracked ?? false, // Use `false` if `event.isTracked` is undefined or null
    };

    return (
        <EventCard
            // Pass the guaranteed-to-be-enriched event object to the child component.
            event={enrichedEvent}
            onCardClick={onViewDetails}
            // The onMarkInterested function from the parent still receives the original AppEvent type
            onTrackClick={(clickedEvent) => onMarkInterested(clickedEvent)}
        />
    );
};

export default UpcomingEventCard;