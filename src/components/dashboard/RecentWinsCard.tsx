'use client';

import React, { useState, useCallback } from 'react';
import { CheckCircle, TrendUp, BookOpen, Target, CaretRight } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { getImpactBucketLabel } from '@/config/recommendationThresholds';
import type { TrackedEventRecord, Event, CareerProfile, EventType } from '@/types';
import dynamic from 'next/dynamic';

// Dynamically import event detail modal
const DashboardEventDetailModal = dynamic(
  () => import('@/components/dashboard/DashboardEventDetailModal'),
  { ssr: false }
);

interface RecentWinsCardProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  careerProfile: CareerProfile | null;
  eventTypes?: EventType[];
}

export function RecentWinsCard({
  trackedEvents,
  upcomingEvents,
  careerProfile,
  eventTypes = [],
}: RecentWinsCardProps) {
  const metrics = useDashboardMetrics({
    trackedEvents,
    upcomingEvents,
    careerProfile,
  });

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedWin, setExpandedWin] = useState<string | null>(null);

  const handleEventClick = useCallback((event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

  return (
    <div className="glass-card glass-glow p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <TrendUp className="w-5 h-5 text-glass-secondary" weight="regular" />
        <div className="flex-1">
          <h3 className="text-base font-medium text-glass-primary">Recent Attendance</h3>
          <p className="text-sm text-glass-tertiary">Your impact from attended events</p>
        </div>
      </div>

      {metrics.recentWins.length > 0 ? (
        <div className="space-y-3">
          {metrics.recentWins.map((win) => {
            const bucket = getImpactBucketLabel(win.score);
            const isExpanded = expandedWin === win.event.id;
            
            return (
              <div
                key={win.event.id}
                className="p-4 rounded-xl border border-white/10 dark:border-white/10 light:border-black/10 hover:border-white/20 dark:hover:border-white/20 light:hover:border-black/15 transition-all group"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h4
                      className="text-sm font-semibold text-glass-primary line-clamp-2 mb-1 cursor-pointer hover:opacity-80 transition-colors"
                      onClick={() => handleEventClick(win.event)}
                    >
                      {win.event.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-glass-tertiary">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" weight="fill" />
                      <span>{format(new Date(win.attendedDate), 'MMM d, yyyy')}</span>
                      {win.rsvpToAttendDelta !== undefined && (
                        <>
                          <span className="text-glass-tertiary opacity-60">•</span>
                          <span className="text-glass-tertiary">
                            RSVP&apos;d {win.rsvpToAttendDelta} days before
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full border text-xs font-medium ${bucket.bgColor} ${bucket.color} ${bucket.borderColor}`}
                  >
                    {bucket.label}
                  </div>
                </div>

                {(win.matchedSkills.length > 0 || win.matchedGoals.length > 0) && (
                  <div className="mb-3">
                    <button
                      onClick={() => setExpandedWin(isExpanded ? null : win.event.id)}
                      className="flex items-center gap-2 text-xs text-glass-secondary hover:opacity-80 transition-colors"
                    >
                      <span>View impact details</span>
                      <CaretRight
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        weight="bold"
                      />
                    </button>
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/10 dark:border-white/10 light:border-black/10 space-y-3 animate-in fade-in duration-200">
                    {win.matchedSkills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" weight="regular" />
                          <span className="text-xs font-medium text-glass-secondary">Skills Addressed</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {win.matchedSkills.slice(0, 6).map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-xs border border-blue-400/30"
                            >
                              {skill}
                            </span>
                          ))}
                          {win.matchedSkills.length > 6 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 dark:bg-white/10 light:bg-black/5 text-glass-tertiary text-xs">
                              +{win.matchedSkills.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {win.matchedGoals.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-3.5 h-3.5 text-purple-400" weight="regular" />
                          <span className="text-xs font-medium text-glass-secondary">Career Goals Advanced</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {win.matchedGoals.map((goal, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-xs border border-purple-400/30 capitalize"
                            >
                              {goal.replace(/-/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-glass-tertiary opacity-60 mx-auto mb-3" weight="regular" />
          <p className="text-sm text-glass-tertiary mb-1">No events attended yet</p>
          <p className="text-xs text-glass-tertiary">Start attending events to see your impact here</p>
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
