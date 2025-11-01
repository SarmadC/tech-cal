'use client';

import React, { useState, useCallback } from 'react';
import { Clock } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import type { TrackedEventRecord, Event, CareerProfile, EventType } from '@/types';
import dynamic from 'next/dynamic';

// Dynamically import event detail modal
const DashboardEventDetailModal = dynamic(
  () => import('@/components/dashboard/DashboardEventDetailModal'),
  { ssr: false }
);

interface PipelineColumnProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  careerProfile: CareerProfile | null;
  eventTypes?: EventType[];
}

export function PipelineColumn({
  trackedEvents,
  upcomingEvents,
  careerProfile,
  eventTypes = [],
}: PipelineColumnProps) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const metrics = useDashboardMetrics({
    trackedEvents,
    upcomingEvents,
    careerProfile,
  });

  const handleEventClick = useCallback((event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Follow-up Reminders */}
      {metrics.followUpReminders.length > 0 && (
        <div className="glass-card glass-glow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-glass-secondary" weight="regular" />
            <div className="flex-1">
              <h3 className="text-base font-medium text-glass-primary">Follow-up Reminders</h3>
              <p className="text-sm text-glass-tertiary">Bookmarked events coming up</p>
            </div>
          </div>

          <div className="space-y-3">
            {metrics.followUpReminders.slice(0, 5).map(({ event, daysUntil }) => (
              <div
                key={event.id}
                className="p-3 rounded-lg border border-white/10 dark:border-white/10 light:border-black/10 hover:border-white/20 dark:hover:border-white/20 light:hover:border-black/15 transition-all group cursor-pointer"
                onClick={() => handleEventClick(event)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-sm font-medium text-glass-primary line-clamp-2 group-hover:opacity-80 transition-colors">
                    {event.title}
                  </h4>
                  <div className="flex-shrink-0 text-xs font-medium text-glass-tertiary">
                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-glass-tertiary">
                  <Clock className="w-3.5 h-3.5" weight="regular" />
                  <span>{format(new Date(event.startTime), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      <DashboardEventDetailModal
        isOpen={isModalOpen}
        event={selectedEvent}
        onClose={handleModalClose}
        categories={eventTypes}
      />
    </div>
  );
}
