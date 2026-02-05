'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TrendUp, ArrowRight, CaretRight, Circle, Star, CheckCircle, Lock, ClockCounterClockwise } from '@phosphor-icons/react';
import { format, subDays, isAfter } from 'date-fns';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useEventFeedback } from '@/hooks/useEventFeedback';
import { useAuth, useSubscriptionContext } from '@/contexts';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import { getImpactBucketLabel } from '@/config/recommendationThresholds';
import { FREE_TIER_LIMITS } from '@/types/subscription';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader';
import type { TrackedEventRecord, Event, CareerProfile, EventType } from '@/types';
import dynamic from 'next/dynamic';

// Dynamically import components
const EventDetailPanel = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { ssr: false }
);

const EventFeedbackForm = dynamic(
    () => import('@/components/events/EventFeedbackForm').then(mod => ({ default: mod.EventFeedbackForm })),
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
    const { user } = useAuth();
    const { isPro, isTrialing, startTrial, openUpgrade, hasUsedTrial } = useSubscriptionContext();
    const hasPremiumAccess = isPro || isTrialing;

    const metrics = useDashboardMetrics({
        trackedEvents,
        upcomingEvents,
        careerProfile,
    });

    // Get feedback data to know which events have been rated
    const { data: feedbackData } = useEventFeedback(user?.id);
    const feedbackEventIds = new Set(feedbackData?.feedback.map(f => f.eventId) || []);

    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedWin, setExpandedWin] = useState<string | null>(null);
    const [feedbackEvent, setFeedbackEvent] = useState<Event | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Filter wins by date for free tier (30 days)
    const { visibleWins, hiddenCount } = useMemo(() => {
        if (hasPremiumAccess) {
            return { visibleWins: metrics.recentWins, hiddenCount: 0 };
        }

        const cutoffDate = subDays(new Date(), FREE_TIER_LIMITS.historyDays);
        const visible = metrics.recentWins.filter(win =>
            isAfter(new Date(win.attendedDate), cutoffDate)
        );
        const hidden = metrics.recentWins.length - visible.length;

        return { visibleWins: visible, hiddenCount: hidden };
    }, [metrics.recentWins, hasPremiumAccess]);

    const handleEventClick = useCallback((event: Event) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    }, []);

    const handleModalClose = useCallback(() => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    }, []);

    const handleFeedbackClick = useCallback((event: Event, e: React.MouseEvent) => {
        e.stopPropagation();
        setFeedbackEvent(event);
    }, []);

    const handleFeedbackClose = useCallback(() => {
        setFeedbackEvent(null);
    }, []);

    // Handle escape key press and body scroll lock
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) {
                handleModalClose();
            }
        };

        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleEscape);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isModalOpen, handleModalClose]);

    return (
        <DashboardCard title="" className="w-full h-fit flex flex-col">
            {/* Header */}
            <DashboardSectionHeader
                title="Performance"
                subtitle="Recent Activity"
                action={(
                    <button className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1 group">
                        History <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                )}
            />

            {visibleWins.length > 0 ? (
                <div className="relative flex flex-col space-y-0 text-sm">
                    {visibleWins.map((win, index) => {
                        const bucket = getImpactBucketLabel(win.score);
                        const isLast = index === visibleWins.length - 1 && hiddenCount === 0;
                        const isExpanded = expandedWin === win.event.id;

                        return (
                            <div key={win.event.id} className="relative pl-6 pb-6 last:pb-0 group">
                                {/* Timeline Node */}
                                {/* Vertical Line */}
                                {!isLast && (
                                    <div className="absolute left-[7px] top-2.5 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
                                )}

                                {/* Dot */}
                                <div className="absolute left-[3px] top-2 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-black z-10" />

                                {/* Content */}
                                <div className="flex flex-col">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-col">
                                            <h4
                                                className="text-sm font-medium text-zinc-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer leading-none"
                                                onClick={() => handleEventClick(win.event)}
                                            >
                                                {win.event.title}
                                            </h4>
                                            <div className="text-xs text-zinc-500 mt-1.5 flex flex-wrap gap-1">
                                                <span>{format(new Date(win.attendedDate), 'MMM d, yyyy')}</span>
                                                {win.rsvpToAttendDelta !== undefined && (
                                                    <>
                                                        <span className="text-zinc-700">•</span>
                                                        <span>RSVP&apos;d {win.rsvpToAttendDelta} days before</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Trailing Action / Badge */}
                                        <div className="flex items-center gap-2">
                                            {/* Feedback status / Rate button */}
                                            <button
                                                onClick={(e) => handleFeedbackClick(win.event, e)}
                                                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors border ${feedbackEventIds.has(win.event.id)
                                                    ? 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                                                    : 'text-amber-400 border-amber-500/20 hover:bg-amber-500/10'
                                                    }`}
                                            >
                                                {feedbackEventIds.has(win.event.id) ? (
                                                    <>
                                                        <CheckCircle className="w-3 h-3" weight="fill" />
                                                        <span>Edit rating</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Star className="w-3 h-3" />
                                                        <span>Rate</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Impact badge */}
                                            <div className={`
                                                flex-shrink-0 px-2 py-0.5 rounded text-[10px] tracking-wide font-medium border
                                                ${bucket.label === 'High Impact' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : ''}
                                                ${bucket.label === 'Medium Impact' ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400' : ''}
                                                ${bucket.label === 'Low Impact' ? 'border-zinc-700 bg-zinc-800/50 text-zinc-400' : ''}
                                                ${bucket.label !== 'High Impact' && bucket.label !== 'Medium Impact' ? 'border-zinc-700 bg-zinc-800/50 text-zinc-400' : ''}
                                            `}>
                                                {bucket.label}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expandable Details */}
                                    {(win.matchedSkills.length > 0 || win.matchedGoals.length > 0) && (
                                        <div className="mt-2">
                                            <button
                                                onClick={() => setExpandedWin(isExpanded ? null : win.event.id)}
                                                className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400 transition-colors"
                                            >
                                                <span>{isExpanded ? 'Hide' : 'View'} impact</span>
                                                <CaretRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                            </button>

                                            {isExpanded && (
                                                <div className="mt-2 pl-2 border-l border-zinc-800 ml-0.5 space-y-2 animate-in fade-in duration-200">
                                                    {win.matchedSkills.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {win.matchedSkills.map(s => (
                                                                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Hidden history CTA for free tier */}
                    {hiddenCount > 0 && (
                        <div className="relative pl-6 pt-2">
                            {/* Continuation line */}
                            <div className="absolute left-[7px] top-0 h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
                            <div className="absolute left-[3px] top-4 w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700 ring-4 ring-white dark:ring-black" />

                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors mt-2"
                            >
                                <ClockCounterClockwise className="w-4 h-4" weight="fill" />
                                <span className="text-xs font-medium">
                                    +{hiddenCount} more from your full history
                                </span>
                                <Lock className="w-3 h-3 ml-auto" />
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 min-h-[100px]">
                    <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
                        <Circle className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">No recent activity</p>
                </div>
            )}

            {/* Event Detail Modal */}
            {isModalOpen && selectedEvent && createPortal(
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in-0 duration-300"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-lg transition-opacity duration-300"
                        onClick={handleModalClose}
                        aria-hidden="true"
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-2xl max-h-[90vh] animate-in zoom-in-95 fade-in-0 duration-300 ease-out drop-shadow-2xl">
                        <EventDetailPanel
                            event={selectedEvent}
                            onClose={handleModalClose}
                            categories={eventTypes}
                            variant="modal"
                        />
                    </div>
                </div>,
                document.body
            )}

            {/* Feedback Modal */}
            {feedbackEvent && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={handleFeedbackClose}
                    />
                    <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-lg p-6 animate-in zoom-in-95 duration-200">
                        <div className="mb-4">
                            <h4 className="text-sm text-zinc-400 mb-1">Rate your experience at</h4>
                            <h3 className="text-lg font-medium text-white">{feedbackEvent.title}</h3>
                        </div>
                        <EventFeedbackForm
                            event={feedbackEvent}
                            onClose={handleFeedbackClose}
                            onSuccess={handleFeedbackClose}
                        />
                    </div>
                </div>
            )}

            {/* Upgrade Modal for History */}
            <UpgradeModal
                open={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                variant={hasUsedTrial ? 'upgradePrompt' : 'trialStart'}
                featureName="Full History"
                onStartTrial={async () => {
                    await startTrial();
                    setShowUpgradeModal(false);
                }}
                onUpgrade={async () => {
                    await openUpgrade();
                    setShowUpgradeModal(false);
                }}
            />
        </DashboardCard>
    );
}
