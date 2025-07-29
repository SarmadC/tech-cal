// src/components/calendar/UpcomingEventCard.tsx (Refactored to use EventCard)
'use client';

import { FC } from 'react';
import { AppEvent } from '@/types';
import EventCard from './EventCard'; // Import our new generic card!

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
    // The logic for displaying an event now lives inside EventCard.
    // This component's only job is to connect the specific actions
    // (onViewDetails, onMarkInterested) to the generic card's props.

    return (
        <EventCard
            event={event}
            onCardClick={onViewDetails} // Clicking the card triggers "View Details"
            onTrackClick={(clickedEvent) => onMarkInterested(clickedEvent)} // Clicking the star triggers "Mark Interested"
        />
    );
};

export default UpcomingEventCard;