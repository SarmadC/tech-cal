import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { EventCard } from './EventCard';
import type { Event, TrackedEventRecord } from '@/types';

interface EventListProps {
  events: (Event | TrackedEventRecord)[];
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionText: string;
  emptyActionHref: string;
  variant?: 'upcoming' | 'recommended' | 'compact';
  className?: string;
  onEventClick?: (event: Event | TrackedEventRecord) => void;
}

/**
 * Reusable event list component for dashboard
 */
export function EventList({
  events,
  title,
  description,
  emptyTitle,
  emptyDescription,
  emptyActionText,
  emptyActionHref,
  variant = 'upcoming',
  className = '',
  onEventClick
}: EventListProps) {
  return (
    <Card className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm ${className}`}>
      <CardHeader className={variant === 'compact' ? 'pb-4' : ''}>
        <CardTitle className="text-gray-900 dark:text-white">{title}</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-300">{description}</CardDescription>
      </CardHeader>
      <CardContent className={variant === 'compact' ? 'px-6 pb-6 pt-0' : 'space-y-4'}>
        {events.length > 0 ? (
          <div className={variant === 'compact' ? 'space-y-0' : 'space-y-4'}>
            {events.map((event) => (
              <EventCard
                key={'trackingId' in event ? event.trackingId : event.id}
                event={event}
                variant={variant}
                onClick={() => onEventClick?.(event)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{emptyTitle}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{emptyDescription}</p>
            <Button asChild>
              <Link href={emptyActionHref}>{emptyActionText}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
