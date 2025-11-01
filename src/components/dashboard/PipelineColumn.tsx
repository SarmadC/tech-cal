'use client';

import React, { useState, useCallback } from 'react';
import { CalendarPlus, Clock, Sparkle } from '@phosphor-icons/react';
import { format, differenceInDays } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { getImpactBucketLabel } from '@/config/recommendationThresholds';
import type { TrackedEventRecord, Event, CareerProfile, EventType } from '@/types';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { EVENT_STATUS } from '@/types/events';
import { useSnackbar } from '@/contexts/SnackbarContext';
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
  const { trackEvent } = useTrackedEventsUnified();
  const { showSuccess, showError } = useSnackbar();
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

  const handleAccept = useCallback(async (event: Event) => {
    try {
      await trackEvent(event.id, EVENT_STATUS.ATTENDING);
      showSuccess(`RSVP'd to ${event.title}`);
    } catch (_error) {
      showError('Failed to RSVP to event');
    }
  }, [trackEvent, showSuccess, showError]);

  const _handleDecline = useCallback(async (eventId: string) => {
    try {
      await trackEvent(eventId, EVENT_STATUS.CANCELLED);
      showSuccess('Event declined');
    } catch (_error) {
      showError('Failed to decline event');
    }
  }, [trackEvent, showSuccess, showError]);

  return (
    <div className="space-y-6">
      {/* Recommended Events */}
      {metrics.topRecommendedEvents.length > 0 && (
      <div className="glass-card glass-glow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Sparkle className="w-5 h-5 text-glass-secondary" weight="regular" />
          <div className="flex-1">
            <h3 className="text-base font-medium text-glass-primary">Recommended for You</h3>
            <p className="text-sm text-glass-tertiary">Top matching events</p>
          </div>
        </div>

        {metrics.topRecommendedEvents.length > 0 ? (
          <div className="space-y-3">
            {metrics.topRecommendedEvents.map(({ event, score, reason }) => {
              const bucket = getImpactBucketLabel(score);
              const daysUntil = Math.max(0, differenceInDays(new Date(event.startTime), new Date()));
              
              return (
                <div
                  key={event.id}
                  className="p-4 rounded-xl border border-white/10 dark:border-white/10 light:border-black/10 hover:border-white/20 dark:hover:border-white/20 light:hover:border-black/15 transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-sm font-semibold text-glass-primary line-clamp-2 mb-1 cursor-pointer hover:opacity-80 transition-colors"
                        onClick={() => handleEventClick(event)}
                      >
                        {event.title}
                      </h4>
                      {reason && (
                        <p className="text-xs text-glass-tertiary line-clamp-2">{reason}</p>
                      )}
                    </div>
                    <div
                      className={`flex-shrink-0 px-2 py-1 rounded-full border text-xs font-medium ${bucket.bgColor} ${bucket.color} ${bucket.borderColor}`}
                    >
                      {score}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-glass-tertiary mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" weight="regular" />
                      <span>
                        {format(new Date(event.startTime), 'MMM d, yyyy')}
                        {daysUntil === 0 ? ' • Today' : daysUntil === 1 ? ' • Tomorrow' : ` • ${daysUntil} days away`}
                      </span>
                    </div>
                    {event.location && (
                      <>
                        <span className="text-glass-tertiary opacity-60">•</span>
                        <span className="line-clamp-1">{event.location}</span>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(event)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 dark:bg-white/10 light:bg-black/5 hover:bg-white/20 dark:hover:bg-white/20 light:hover:bg-black/8 text-xs font-medium text-glass-primary transition-all"
                    >
                      <CalendarPlus className="w-4 h-4" weight="bold" />
                      RSVP
                    </button>
                    <button
                      onClick={() => handleEventClick(event)}
                      className="px-3 py-2 rounded-lg border border-white/20 dark:border-white/20 light:border-black/15 hover:border-white/30 dark:hover:border-white/30 light:hover:border-black/20 text-xs font-medium text-glass-secondary transition-all"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkle className="w-10 h-10 text-glass-tertiary opacity-60 mx-auto mb-3" weight="regular" />
            <p className="text-sm text-glass-tertiary mb-1">No recommendations available</p>
            <p className="text-xs text-glass-tertiary">Complete your career profile for personalized events</p>
          </div>
        )}
      </div>
      )}

      {/* Follow-up Reminders */}
      {metrics.followUpReminders.length > 0 && (
        <div className="glass-card glass-glow p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-glass-secondary" weight="regular" />
            <div className="flex-1">
              <h3 className="text-base font-medium text-glass-primary">Follow-up Reminders</h3>
              <p className="text-sm text-glass-tertiary">RSVP&apos;d events coming up</p>
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
