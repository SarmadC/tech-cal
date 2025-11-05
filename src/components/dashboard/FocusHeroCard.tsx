'use client';

import React from 'react';
import { Calendar, Clock, Target, Sparkle, Info, Star } from '@phosphor-icons/react';
import { format, differenceInDays } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { getImpactBucketLabel } from '@/config/recommendationThresholds';
import type { TrackedEventRecord, Event, CareerProfile, EventType } from '@/types';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useSnackbar } from '@/contexts/SnackbarContext';
import dynamic from 'next/dynamic';
import Image from 'next/image';

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
  const { toggleBookmark, isBookmarked } = useEventEngagement();
  const { showError } = useSnackbar();
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isUpcomingEventsModalOpen, setIsUpcomingEventsModalOpen] = React.useState(false);

  const metrics = useDashboardMetrics({
    trackedEvents,
    upcomingEvents,
    careerProfile,
  });

  const handleBookmark = async (event: Event) => {
    try {
      await toggleBookmark(event.id, event as unknown as Record<string, unknown>);
    } catch (error) {
      showError('Failed to bookmark event');
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
        <div className="lg:col-span-2 flex">
          {metrics.topRecommendedEvent ? (
            <div className="glass-card p-6 border border-white/10 dark:border-white/10 light:border-black/10 hover:border-white/20 dark:hover:border-white/20 light:hover:border-black/15 transition-colors flex flex-col w-full h-full">
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
                    <p className="text-sm text-glass-secondary mb-3 line-clamp-4">
                      {metrics.topRecommendedEvent.reason}
                    </p>
                  )}
                  {metrics.topRecommendedEvent.event.description && (
                    <p className="text-sm text-glass-tertiary mb-4 line-clamp-3">
                      {metrics.topRecommendedEvent.event.description}
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

              {/* Enhanced Content Section */}
              <div className="space-y-4 mb-6">
                {/* Event Tags */}
                {metrics.topRecommendedEvent.event.tags && metrics.topRecommendedEvent.event.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {metrics.topRecommendedEvent.event.tags.slice(0, 4).map((tag, index) => (
                      <span
                        key={tag.id || index}
                        className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 dark:bg-white/10 light:bg-black/5 border border-white/20 dark:border-white/20 light:border-black/10 text-glass-secondary"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Organizer Info */}
                {metrics.topRecommendedEvent.event.organizer && (
                  <div className="flex items-center gap-2 text-sm text-glass-tertiary">
                    <span className="text-xs font-medium text-glass-secondary">Organized by:</span>
                    <span>{metrics.topRecommendedEvent.event.organizer}</span>
                    {metrics.topRecommendedEvent.event.organization?.logo && (
                      <Image
                        src={metrics.topRecommendedEvent.event.organization.logo}
                        alt={metrics.topRecommendedEvent.event.organizer}
                        width={16}
                        height={16}
                        className="w-4 h-4 rounded"
                      />
                    )}
                  </div>
                )}

                {/* Career Impact Highlights - Matched Skills */}
                {(() => {
                  const matchedSkills = metrics.getEventMatchedSkills(metrics.topRecommendedEvent.event);
                  if (matchedSkills.length > 0) {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-glass-secondary">
                          <Target className="w-3.5 h-3.5 text-yellow-400" weight="fill" />
                          <span>{matchedSkills.length} {matchedSkills.length === 1 ? 'skill' : 'skills'} match your profile</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {matchedSkills.slice(0, 4).map((skill, index) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-500/20 dark:bg-yellow-500/20 light:bg-yellow-500/15 border border-yellow-500/40 dark:border-yellow-500/40 light:border-yellow-500/30 text-yellow-600 dark:text-yellow-400 light:text-yellow-700"
                            >
                              {skill}
                            </span>
                          ))}
                          {matchedSkills.length > 4 && (
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/10 dark:bg-white/10 light:bg-black/5 border border-white/20 dark:border-white/20 light:border-black/10 text-glass-tertiary">
                              +{matchedSkills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Optional Metadata */}
                {(metrics.topRecommendedEvent.event.difficulty || metrics.topRecommendedEvent.event.targetAudience) && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-glass-tertiary">
                    {metrics.topRecommendedEvent.event.difficulty && (
                      <span className="px-2.5 py-1 rounded-full bg-white/10 dark:bg-white/10 light:bg-black/5 border border-white/20 dark:border-white/20 light:border-black/10 capitalize">
                        {metrics.topRecommendedEvent.event.difficulty}
                      </span>
                    )}
                    {metrics.topRecommendedEvent.event.targetAudience && (
                      <span className="px-2.5 py-1 rounded-full bg-white/10 dark:bg-white/10 light:bg-black/5 border border-white/20 dark:border-white/20 light:border-black/10">
                        {metrics.topRecommendedEvent.event.targetAudience}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-auto">
                {(() => {
                  const event = metrics.topRecommendedEvent!.event;
                  const bookmarked = isBookmarked(event.id);
                  return (
                    <button
                      onClick={() => handleBookmark(event)}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-white/30 dark:focus:ring-white/30 light:focus:ring-black/20 ${
                        bookmarked
                          ? 'bg-yellow-500/20 dark:bg-yellow-500/20 light:bg-yellow-500/15 hover:bg-yellow-500/30 dark:hover:bg-yellow-500/30 light:hover:bg-yellow-500/20 border border-yellow-500/40 dark:border-yellow-500/40 light:border-yellow-500/30 text-yellow-600 dark:text-yellow-400 light:text-yellow-700'
                          : 'bg-white/10 dark:bg-white/10 light:bg-black/5 hover:bg-white/20 dark:hover:bg-white/20 light:hover:bg-black/8 text-glass-primary'
                      }`}
                    >
                      {bookmarked ? (
                        <>
                          <Star className="w-4 h-4 inline mr-2" weight="fill" />
                          Bookmarked
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4 inline mr-2" weight="regular" />
                          Bookmark Event
                        </>
                      )}
                    </button>
                  );
                })()}
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
          <button
            onClick={() => metrics.upcomingCommitments > 0 && setIsUpcomingEventsModalOpen(true)}
            disabled={metrics.upcomingCommitments === 0}
            className={`glass-card p-4 border border-white/10 dark:border-white/10 light:border-black/10 w-full text-left transition-all ${
              metrics.upcomingCommitments > 0
                ? 'hover:border-white/20 dark:hover:border-white/20 light:hover:border-black/15 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-black/5 cursor-pointer'
                : 'opacity-60 cursor-default'
            }`}
          >
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
          </button>

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

      {/* Upcoming Events Modal */}
      {isUpcomingEventsModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsUpcomingEventsModalOpen(false)}
        >
          <div 
            className="glass-card p-6 border border-white/10 dark:border-white/10 light:border-black/10 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-glass-primary">Upcoming Events</h3>
                <p className="text-sm text-glass-tertiary mt-1">
                  {metrics.followUpReminders.length} {metrics.followUpReminders.length === 1 ? 'event' : 'events'} you&apos;re attending
                </p>
              </div>
              <button
                onClick={() => setIsUpcomingEventsModalOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-black/5 transition-colors text-glass-tertiary"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3">
              {metrics.followUpReminders.length > 0 ? (
                metrics.followUpReminders.map(({ event, daysUntil }) => (
                  <div
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      setIsUpcomingEventsModalOpen(false);
                      setIsModalOpen(true);
                    }}
                    className="p-4 rounded-lg border border-white/10 dark:border-white/10 light:border-black/10 hover:border-white/20 dark:hover:border-white/20 light:hover:border-black/15 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-black/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="text-base font-medium text-glass-primary line-clamp-2 flex-1">
                        {event.title}
                      </h4>
                      <div className="flex-shrink-0 text-xs font-medium text-glass-tertiary">
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-glass-tertiary">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" weight="regular" />
                        <span>{format(new Date(event.startTime), 'MMM d, yyyy')}</span>
                        <span className="opacity-60">•</span>
                        <span>{format(new Date(event.startTime), 'h:mm a')}</span>
                      </div>
                      {event.location && (
                        <>
                          <span className="opacity-60">•</span>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" weight="regular" />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-glass-tertiary opacity-60 mx-auto mb-3" weight="regular" />
                  <p className="text-sm font-medium text-glass-secondary mb-1">No upcoming events</p>
                  <p className="text-xs text-glass-tertiary">Events you&apos;re attending will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
