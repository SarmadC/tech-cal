'use client';

import React from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Rocket, Star, Users, Lightbulb, ChartLineUp, ArrowRight, Lock, Sparkle } from '@phosphor-icons/react';
import { useEventFeedback, type FeedbackAggregates } from '@/hooks/useEventFeedback';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader';
import { useSubscriptionContext } from '@/contexts';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import { cn } from '@/lib/utils';
import type { TrackedEventRecord, Event } from '@/types';
import dynamic from 'next/dynamic';

const EventFeedbackForm = dynamic(
    () => import('@/components/events/EventFeedbackForm').then(mod => ({ default: mod.EventFeedbackForm })),
    { ssr: false }
);

interface CareerOutcomesCardProps {
    trackedEvents: TrackedEventRecord[];
    userId: string | undefined;
    className?: string;
    presentation?: 'default' | 'mobile-dashboard';
}

// Thresholds for progressive disclosure
const MATURE_THRESHOLD = 5; // events with feedback to show full insights

export function CareerOutcomesCard({
    trackedEvents,
    userId,
    className = '',
    presentation = 'default',
}: CareerOutcomesCardProps) {
    const isMobileDashboard = presentation === 'mobile-dashboard';
    const { data: feedbackData, isLoading } = useEventFeedback(userId);
    const [feedbackEvent, setFeedbackEvent] = React.useState<Event | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
    const { isPro, isTrialing, startTrial, openUpgrade, hasUsedTrial } = useSubscriptionContext();
    const hasPremiumAccess = isPro || isTrialing;
    const rootCardClass = cn('flex flex-col', !isMobileDashboard && 'p-5', className);

    const handleRateClick = (event: Event) => {
        setFeedbackEvent(event);
    };

    const handleFeedbackClose = () => {
        setFeedbackEvent(null);
    };

    // Count attended events from tracked events
    const attendedCount = trackedEvents.filter(e => e.status === 'attended').length;
    const upcomingCount = trackedEvents.filter(e => {
        if (e.status !== 'attending' || !e.event) return false;
        return new Date(e.event.startTime) > new Date();
    }).length;

    // Get feedback aggregates
    const aggregates: FeedbackAggregates | null = feedbackData?.aggregates ?? null;
    const feedbackCount = aggregates?.totalFeedbackCount ?? 0;

    // Determine state
    const hasNoActivity = attendedCount === 0 && upcomingCount === 0;
    const isEarlyState = !hasNoActivity && feedbackCount < MATURE_THRESHOLD;
    // Loading state
    if (isLoading) {
        return (
            <DashboardCard title="" className={rootCardClass} presentation={presentation}>
                <div className="animate-pulse">
                    <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
                    <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-6" />
                    <div className="space-y-3">
                        <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                </div>
            </DashboardCard>
        );
    }

    // Empty state - no activity at all
    if (hasNoActivity) {
        return (
            <DashboardCard title="" className={rootCardClass} presentation={presentation}>
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <div className={cn("w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-4", isMobileDashboard && "mobile-dashboard-emptyIcon bg-transparent")}>
                        <Rocket className="w-6 h-6 text-zinc-400 dark:text-zinc-600" weight="light" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                        Start your journey
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-600 mb-4 max-w-[200px]">
                        Track events to measure your career impact and growth
                    </p>
                    <Link
                        href="/events"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                    >
                        Browse Events
                        <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                    </Link>
                </div>
            </DashboardCard>
        );
    }

    // Get feedback data specifically
    const feedbackList = feedbackData?.feedback ?? [];

    // Identify unrated events: Attended but not in feedback list
    const attendedEvents = trackedEvents.filter(e => e.status === 'attended' && e.event);
    const unratedEvents = attendedEvents.filter(e =>
        e.event && !feedbackList.some(f => f.eventId === e.event!.id)
    );

    // Early state - some activity but not enough feedback
    if (isEarlyState) {
        const nextEventToRate = unratedEvents[0]?.event;
        const ratingsRemaining = Math.max(MATURE_THRESHOLD - feedbackCount, 0);

        return (
            <DashboardCard title="" className={cn('w-full flex flex-col', className)} presentation={presentation}>
                <DashboardSectionHeader
                    icon={ChartLineUp}
                    title={nextEventToRate ? 'Rate Your Latest Event' : 'Keep Rating Events'}
                    subtitle={`${ratingsRemaining} more rating${ratingsRemaining === 1 ? '' : 's'} to unlock deeper outcome insights`}
                    presentation={presentation}
                    action={(
                        <div className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
                            {feedbackCount}/{MATURE_THRESHOLD} <span className="text-zinc-400 dark:text-zinc-500 font-medium">rated</span>
                        </div>
                    )}
                />

                <div className={cn("flex flex-col h-full", !isMobileDashboard && "px-5 pb-5", isMobileDashboard && "pt-1")}>
                    <div className="flex gap-1 mb-4 mt-1 opacity-90">
                        {Array.from({ length: MATURE_THRESHOLD }).map((_, headingIndex) => {
                            const isCompleted = headingIndex < feedbackCount;
                            const isActive = headingIndex === feedbackCount;

                            return (
                                <div
                                    key={headingIndex}
                                    className={`h-[2px] rounded-full transition-all duration-300 ${isCompleted
                                        ? 'flex-1 bg-zinc-800 dark:bg-zinc-200'
                                        : isActive
                                            ? 'w-6 bg-indigo-500 dark:bg-indigo-400'
                                            : 'flex-1 bg-zinc-200 dark:bg-white/10'
                                        }`}
                                />
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-6">
                        {nextEventToRate ? (
                            <div className="flex flex-col gap-2.5">
                                <div className="flex flex-col gap-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 mb-0.5">
                                        Next rating task
                                    </p>
                                    <h4 className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white leading-tight">
                                        {nextEventToRate.title}
                                    </h4>
                                    <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        Rate this event to unlock accurate skills and impact insights.
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleRateClick(nextEventToRate)}
                                    className={cn(
                                        "inline-flex h-9 w-max items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 mt-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-zinc-950",
                                        isMobileDashboard && "bg-[var(--mono-text-primary)] text-[var(--mono-text-inverse)] dark:bg-[var(--mono-text-primary)] dark:text-[var(--mono-text-inverse)]"
                                    )}
                                >
                                    <span>Rate event</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <h4 className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white leading-tight">
                                    You&apos;ve rated all your events.
                                </h4>
                                <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                    Attend one more event to unlock insights.
                                </p>
                            </div>
                        )}

                        <div className="flex items-center gap-6 pt-1 mt-auto">
                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500 font-semibold">Unrated</p>
                                <p className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-none">{unratedEvents.length}</p>
                            </div>
                            <div className="h-[14px] w-px bg-zinc-200 dark:bg-white/10" />
                            <div className="flex flex-col gap-1">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500 font-semibold">Latest Signal</p>
                                <p className="text-sm font-medium tracking-tight text-zinc-900 dark:text-zinc-300 leading-none">
                                    {feedbackCount > 0 ? `${feedbackCount} rating${feedbackCount === 1 ? '' : 's'} captured` : 'None yet'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardCard>
        );
    }

    // Mature state - full insights (gated by subscription)
    // Free tier: Show count + one teaser insight
    // Pro tier: Full metrics grid
    if (!hasPremiumAccess) {
        // Free tier: Limited view with teaser
        const topSkill = aggregates?.uniqueSkills?.[0];
        const teaserMessage = topSkill
            ? `You're building expertise in ${topSkill}`
            : feedbackCount > 0
                ? `You've rated ${feedbackCount} events`
                : 'Start tracking your career impact';

        return (
            <>
                <DashboardCard title="" className={rootCardClass} presentation={presentation}>
                    <DashboardSectionHeader
                        icon={ChartLineUp}
                        title="Career Impact"
                        subtitle={`${feedbackCount} events with feedback`}
                        presentation={presentation}
                    />

                    {/* Teaser insight (the one free nugget) */}
                    <div className={cn("mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30", isMobileDashboard && "mobile-dashboard-panel")}>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkle className="w-4 h-4 text-indigo-500 dark:text-indigo-400" weight="fill" />
                            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Your Insight</span>
                        </div>
                        <p className="text-sm text-indigo-900 dark:text-indigo-100">{teaserMessage}</p>
                    </div>

                    {/* Blurred preview of full metrics */}
                    <div className="relative">
                        <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-white/40 dark:bg-zinc-900/40 rounded-lg flex flex-col items-center justify-center p-4">
                            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" weight="fill" />
                            <span className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                                Unlock Detailed Insights
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 text-center">
                                See ratings, skills, connections & more
                            </span>
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="px-4 py-2 rounded-full bg-amber-600 text-white text-xs font-medium hover:bg-amber-500 transition-colors"
                            >
                                Upgrade to Pro
                            </button>
                        </div>

                        {/* Blurred dummy content */}
                        <div className="grid grid-cols-2 gap-4 opacity-30 select-none pointer-events-none">
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md">
                                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
                                <div className="h-6 w-8 bg-zinc-300 dark:bg-zinc-600 rounded" />
                            </div>
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md">
                                <div className="h-3 w-10 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
                                <div className="h-6 w-6 bg-zinc-300 dark:bg-zinc-600 rounded" />
                            </div>
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md">
                                <div className="h-3 w-14 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
                                <div className="h-6 w-10 bg-zinc-300 dark:bg-zinc-600 rounded" />
                            </div>
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md">
                                <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
                                <div className="h-6 w-8 bg-zinc-300 dark:bg-zinc-600 rounded" />
                            </div>
                        </div>
                    </div>
                </DashboardCard>

                <UpgradeModal
                    open={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    variant={hasUsedTrial ? 'upgradePrompt' : 'trialStart'}
                    featureName="Career Insights"
                    onStartTrial={async () => {
                        await startTrial();
                        setShowUpgradeModal(false);
                    }}
                    onUpgrade={async () => {
                        await openUpgrade();
                        setShowUpgradeModal(false);
                    }}
                />
            </>
        );
    }

    // Pro tier: Full insights
    return (
        <DashboardCard title="" className={rootCardClass} presentation={presentation}>
            <DashboardSectionHeader
                icon={ChartLineUp}
                title="Career Impact"
                subtitle={`${feedbackCount} events with feedback`}
                presentation={presentation}
            />

            {/* Main metrics grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Average Rating */}
                {aggregates && aggregates.averageRating !== null && (
                    <div className={cn("p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-white/5", isMobileDashboard && "mobile-dashboard-panel")}>
                        <div className="flex items-center gap-1.5 mb-2">
                            <Star className="w-3.5 h-3.5 text-amber-400" weight="fill" />
                            <span className="text-[10px] text-zinc-500 tracking-wide">Avg Rating</span>
                        </div>
                        <div className="text-2xl font-semibold text-zinc-900 dark:text-white">
                            {aggregates.averageRating.toFixed(1)}
                            <span className="text-sm text-zinc-500 font-normal">/5</span>
                        </div>
                    </div>
                )}

                {/* Skills Gained */}
                <div className={cn("p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-white/5", isMobileDashboard && "mobile-dashboard-panel")}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" weight="fill" />
                        <span className="text-[10px] text-zinc-500 tracking-wide">Skills</span>
                    </div>
                    <div className="text-2xl font-semibold text-zinc-900 dark:text-white">
                        {aggregates?.uniqueSkills.length ?? 0}
                    </div>
                </div>

                {/* Connections */}
                <div className={cn("p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-white/5", isMobileDashboard && "mobile-dashboard-panel")}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Users className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" weight="fill" />
                        <span className="text-[10px] text-zinc-500 tracking-wide">Connections</span>
                    </div>
                    <div className="text-2xl font-semibold text-zinc-900 dark:text-white">
                        {aggregates?.totalConnectionsMade ?? 0}
                    </div>
                </div>

                {/* Prediction Accuracy */}
                {aggregates && aggregates.predictionAccuracy !== null && (
                    <div className={cn("p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-white/5", isMobileDashboard && "mobile-dashboard-panel")}>
                        <div className="flex items-center gap-1.5 mb-2">
                            <ChartLineUp className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" weight="fill" />
                            <span className="text-[10px] text-zinc-500 tracking-wide">Accuracy</span>
                        </div>
                        <div className="text-2xl font-semibold text-zinc-900 dark:text-white">
                            {Math.round(aggregates.predictionAccuracy)}%
                        </div>
                    </div>
                )}
            </div>

            {/* Recommendation rate footer */}
            {aggregates && aggregates.recommendationRate !== null && (
                <div className={cn("pt-3 border-t border-zinc-100 dark:border-white/5", isMobileDashboard && "mobile-dashboard-divider")}>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Would recommend events</span>
                        <span className="text-emerald-400 font-medium">
                            {Math.round(aggregates.recommendationRate)}%
                        </span>
                    </div>
                </div>
            )}
            {/* Feedback Modal */}
            {feedbackEvent && createPortal(
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
                </div>,
                document.body
            )}
        </DashboardCard>
    );
}
