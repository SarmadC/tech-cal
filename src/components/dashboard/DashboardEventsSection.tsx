'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SectionErrorBoundary } from '@/components/common/ErrorBoundary';
import { EventList } from '@/components/dashboard/EventList';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import type { TrackedEventRecord, Event } from '@/types';

interface DashboardEventsSectionProps {
  allUpcomingEvents: Event[];
  trackedEvents: TrackedEventRecord[];
}

export function DashboardEventsSection({ allUpcomingEvents, trackedEvents }: DashboardEventsSectionProps) {
  const router = useRouter();
  
  const nextTrackedEvents = useMemo(() => {
    if (!trackedEvents || !allUpcomingEvents) return [];
    return trackedEvents
      .map(te => allUpcomingEvents.find(e => e.id === te.eventId))
      .filter((event): event is Event => event !== undefined)
      .slice(0, 5);
  }, [trackedEvents, allUpcomingEvents]);

  const handleEventClick = useCallback((event: Event | TrackedEventRecord) => {
    const eventData = 'event' in event ? event.event : event;
    if (eventData) {
      router.push(`/events/${eventData.id}`);
    }
  }, [router]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SectionErrorBoundary name="DashboardSection">
          <EventList
            events={nextTrackedEvents}
            title="Your Upcoming Events"
            description="Events you are tracking."
            emptyTitle="No upcoming events"
            emptyDescription="Start tracking events to see them here."
            emptyActionText="Browse Events"
            emptyActionHref="/calendar"
            variant="compact"
            onEventClick={handleEventClick}
          />
        </SectionErrorBoundary>
      </div>
      <div className="lg:col-span-1">
        <SectionErrorBoundary name="DashboardSection">
          <ActivityFeed
            events={allUpcomingEvents}
            trackedEvents={trackedEvents}
          />
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
