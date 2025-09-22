import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ClockIcon, UsersIcon } from '@phosphor-icons/react';
import { formatDateTime } from '@/utils/dateUtils';
import type { Event, TrackedEventRecord } from '@/types';

interface EventCardProps {
  event: Event | TrackedEventRecord;
  variant?: 'upcoming' | 'recommended';
  className?: string;
}

/**
 * Reusable event card component for dashboard
 */
export function EventCard({ event, variant = 'upcoming', className = '' }: EventCardProps) {
  // Handle both Event and TrackedEventRecord types
  const eventData = 'event' in event ? event.event : event;
  // const trackingId = 'trackingId' in event ? event.trackingId : event.id; // Unused variable removed

  if (!eventData) return null;

  return (
    <Card className={`group p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all ${className}`}>
      <CardContent className="p-0">
        <h3 className={`font-semibold text-gray-900 dark:text-white mb-2 ${variant === 'recommended' ? 'font-medium' : ''}`}>
          {eventData.title}
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
          <span className="flex items-center">
            <ClockIcon className="w-4 h-4 inline mr-1" />
            {formatDateTime(eventData.startTime, eventData.timezone)}
          </span>
          <span className="flex items-center">
            <UsersIcon className="w-4 h-4 inline mr-1" />
            {eventData.organizer}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
