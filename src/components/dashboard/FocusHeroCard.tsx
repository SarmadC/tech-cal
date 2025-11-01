'use client';

import React from 'react';
import { Calendar, Clock, Target, Sparkle, CaretRight, Info } from '@phosphor-icons/react';
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

interface FocusHeroCardProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  careerProfile: CareerProfile | null;
  eventTypes?: EventType[];
}

export function FocusHeroCard({
  trackedEvents,
  upcomingEvents,
  careerProfile,
  eventTypes = [],
}: FocusHeroCardProps) {
  const { trackEvent } = useTrackedEventsUnified();
  const { showSuccess, showError } = useSnackbar();
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const metrics = useDashboardMetrics({
    trackedEvents,
    upcomingEvents,
    careerProfile,
  });

  const handleRSVP = async (event: Event) => {
    try {
      await trackEvent(event.id, EVENT_STATUS.ATTENDING);
      showSuccess(`RSVP'd to ${event.title}`);
    } catch (error) {
      showError('Failed to RSVP to event');
      console.error(error);
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className="glass-card glass-glow p-6 mb-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-glass-primary mb-2">Your Focus</h2>
        <p className="text-sm text-glass-tertiary">Top recommendation and quick insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Recommended Event - Main Card */}
        <div className="lg:col-span-2">
          {metrics.topRecommendedEvent ? (
            <div className="glass-card p-6 border border-white/10 dark:border-white/10 light:border-black/10 hover:border-white/20 dark:hover:border-white/20 light:hover:border-black/15 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkle className="w-4 h-4 text-yellow-400" weight="fill" />
                    <span className="text-xs font-medium text-yellow-400 uppercase tracking-wider">
                      Recommended for You
                    </span>
                  </div>
                  <h3
                    className="text-lg font-semibold text-glass-primary mb-2 cursor-pointer hover:opacity-80 transition-colors line-clamp-2"
                    onClick={() => handleEventClick(metrics.topRecommendedEvent!.event)}
                  >
                    {metrics.topRecommendedEvent.event.title}
                  </h3>
                  {metrics.topRecommendedEvent.reason && (
                    <p className="text-sm text-glass-secondary mb-4 line-clamp-2">
                      {metrics.topRecommendedEvent.reason}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {(() => {
                    const bucket = getImpactBucketLabel(metrics.topRecommendedEvent.score);
                    return (
                      <div
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium ${bucket.bgColor} ${bucket.color} ${bucket.borderColor}`}
                      >
                        {bucket.label}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-glass-tertiary">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" weight="regular" />
                  <span>
                    {format(new Date(metrics.topRecommendedEvent.event.startTime), 'MMM d, yyyy')}
                  </span>
                  <span className="text-glass-tertiary opacity-60">•</span>
                  <span>
                    {(() => {
                      const daysUntil = Math.max(
                        0,
                        differenceInDays(new Date(metrics.topRecommendedEvent.event.startTime), new Date())
                      );
                      if (daysUntil === 0) return 'Today';
                      return `${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} away`;
                    })()}
                  </span>
                </div>
                {metrics.topRecommendedEvent.event.location && (
                  <>
                    <span className="text-glass-tertiary opacity-60">•</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" weight="regular" />
                      <span className="line-clamp-1">{metrics.topRecommendedEvent.event.location}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRSVP(metrics.topRecommendedEvent!.event)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 dark:bg-white/10 light:bg-black/5 hover:bg-white/20 dark:hover:bg-white/20 light:hover:bg-black/8 text-sm font-medium text-glass-primary transition-all focus:outline-none focus:ring-2 focus:ring-white/30 dark:focus:ring-white/30 light:focus:ring-black/20"
                >
                  RSVP Now
                  <CaretRight className="w-4 h-4 inline ml-2" weight="bold" />
                </button>
                <button
                  onClick={() => handleEventClick(metrics.topRecommendedEvent!.event)}
                  className="px-4 py-2.5 rounded-lg border border-white/20 dark:border-white/20 light:border-black/15 hover:border-white/30 dark:hover:border-white/30 light:hover:border-black/20 text-sm font-medium text-glass-secondary transition-all focus:outline-none focus:ring-2 focus:ring-white/30 dark:focus:ring-white/30 light:focus:ring-black/20"
                >
                  View Details
                </button>
              </div>

              {metrics.topRecommendedEvent.computed && (
                <div className="mt-4 flex items-center gap-1.5 text-xs text-glass-tertiary">
                  <Info className="w-3.5 h-3.5" weight="regular" />
                  <span>Score computed from your profile</span>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-6 border border-white/10 dark:border-white/10 light:border-black/10 text-center py-12">
              <Target className="w-12 h-12 text-glass-tertiary opacity-60 mx-auto mb-3" weight="regular" />
              <p className="text-sm font-medium text-glass-secondary mb-1">No recommendations available</p>
              <p className="text-xs text-glass-tertiary">
                {upcomingEvents.length === 0
                  ? 'Check back for new events'
                  : 'Complete your career profile for personalized recommendations'}
              </p>
            </div>
          )}
        </div>

        {/* Quick Glance Metrics */}
        <div className="space-y-4">
          {/* Upcoming Commitments */}
          <div className="glass-card p-4 border border-white/10 dark:border-white/10 light:border-black/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-glass-tertiary uppercase tracking-wider">
                Upcoming
              </span>
              <Calendar className="w-4 h-4 text-glass-tertiary opacity-60" weight="regular" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-glass-primary">
                {metrics.upcomingCommitments}
              </span>
              <span className="text-sm text-glass-tertiary">
                {metrics.upcomingCommitments === 1 ? 'event' : 'events'}
              </span>
            </div>
            <p className="text-xs text-glass-tertiary mt-1">You&apos;re attending</p>
          </div>

          {/* Last Impact Score */}
          <div className="glass-card p-4 border border-white/10 dark:border-white/10 light:border-black/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-glass-tertiary uppercase tracking-wider">
                Last Impact
              </span>
              <Target className="w-4 h-4 text-glass-tertiary opacity-60" weight="regular" />
            </div>
            {metrics.lastImpactScore ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-glass-primary">
                    {Math.round(metrics.lastImpactScore.score)}
                  </span>
                  <span className="text-sm text-glass-tertiary">/100</span>
                </div>
                <p className="text-xs text-glass-tertiary mt-1 line-clamp-1">
                  {metrics.lastImpactScore.eventTitle}
                </p>
                {metrics.lastImpactScore.computed && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-glass-tertiary opacity-60">
                    <Info className="w-3 h-3" weight="regular" />
                    <span>Computed</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-glass-tertiary opacity-60">—</span>
                <p className="text-xs text-glass-tertiary mt-1">No events attended yet</p>
              </div>
            )}
          </div>

          {/* Skills Covered This Month */}
          <div className="glass-card p-4 border border-white/10 dark:border-white/10 light:border-black/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-glass-tertiary uppercase tracking-wider">
                Skills This Month
              </span>
                  <Sparkle className="w-4 h-4 text-glass-tertiary opacity-60" weight="regular" />
            </div>
            {metrics.skillsCoveredThisMonth.uniqueSkills.length > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-glass-primary">
                    {metrics.skillsCoveredThisMonth.canonicalMatches}
                  </span>
                  <span className="text-sm text-glass-tertiary">skills</span>
                </div>
                <p className="text-xs text-glass-tertiary mt-1">
                  {metrics.skillsCoveredThisMonth.uniqueSkills.length} total mentions
                </p>
                {metrics.skillsCoveredThisMonth.needsVerification.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-glass-tertiary opacity-60">
                    <Info className="w-3 h-3" weight="regular" />
                    <span>{metrics.skillsCoveredThisMonth.needsVerification.length} need verification</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-glass-tertiary opacity-60">0</span>
                <span className="text-sm text-glass-tertiary">skills</span>
              </div>
            )}
          </div>
        </div>
      </div>

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
