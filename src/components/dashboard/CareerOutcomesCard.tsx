'use client';

import React from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Rocket, Star, Users, Lightbulb, ChartLineUp, ArrowRight, CheckCircle, Lock } from '@phosphor-icons/react';
import { useEventFeedback, type FeedbackAggregates } from '@/hooks/useEventFeedback';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader';
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
}

// Thresholds for progressive disclosure
const EARLY_THRESHOLD = 3; // events to show "early state"
const MATURE_THRESHOLD = 5; // events with feedback to show full insights

export function CareerOutcomesCard({ trackedEvents, userId, className = '' }: CareerOutcomesCardProps) {
    const { data: feedbackData, isLoading } = useEventFeedback(userId);
    const [feedbackEvent, setFeedbackEvent] = React.useState<Event | null>(null);

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
    const isMatureState = feedbackCount >= MATURE_THRESHOLD;

    // Loading state
    if (isLoading) {
        return (
            <DashboardCard title="" className={`p-5 flex flex-col ${className}`}>
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
            <DashboardCard title="" className={`p-5 flex flex-col ${className}`}>
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
                        <Rocket className="w-6 h-6 text-zinc-400 dark:text-zinc-600" weight="light" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                        Start your journey
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-600 mb-4 max-w-[200px]">
                        Track events to measure your career impact and growth
                    </p>
                    <Link
                        href="/discover"
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

        return (
            <DashboardCard title="" className={`w-full flex flex-col ${className}`}>
                {/* Header */}
                <DashboardSectionHeader
                    icon={Lock}
                    title="Unlock Your Personal Insights"
                    subtitle={`Rate ${MATURE_THRESHOLD} events to reveal skills & impact`}
                    action={(
                        <div className="px-2.5 py-1 rounded-md bg-white/[0.08] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                            {feedbackCount}/{MATURE_THRESHOLD}
                        </div>
                    )}
                />

                <div className="flex flex-col h-full px-5 pb-5">
                    {/* Segmented Progress Bar - Moved below title */}
                    <div className="flex gap-0.5 mb-2 mt-1">
                        {Array.from({ length: MATURE_THRESHOLD }).map((_, headingIndex) => {
                            const isCompleted = headingIndex < feedbackCount;
                            const isActive = headingIndex === feedbackCount;

                            return (
                                <div
                                    key={headingIndex}
                                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${isCompleted
                                        ? 'bg-indigo-500'
                                        : isActive
                                            ? 'bg-zinc-200 dark:bg-zinc-700'
                                            : 'bg-zinc-100 dark:bg-zinc-800'
                                        }`}
                                />
                            );
                        })}
                    </div>

                    {/* Locked Content Preview (The Tease) - Expanded */}
                    <div className="relative flex-1 rounded-lg overflow-hidden border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] mt-4 min-h-[160px]">
                        {/* Blur Filter Overlay */}
                        <div className="absolute inset-0 z-10 backdrop-blur-[4px] bg-white/60 dark:bg-zinc-900/60 flex flex-col items-center justify-center p-4 text-center">

                            {/* Primary Action Button - Dead Center */}
                            {nextEventToRate && (
                                <button
                                    onClick={() => handleRateClick(nextEventToRate)}
                                    className="h-8 pl-3 pr-4 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg flex items-center gap-2 group"
                                >
                                    <div className="w-5 h-5 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center">
                                        <Lock className="w-3 h-3 text-white dark:text-zinc-900" weight="fill" />
                                    </div>
                                    <span className="text-xs font-medium">Unlock with {nextEventToRate.title}</span>
                                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 ml-1" weight="bold" />
                                </button>
                            )}

                            {!nextEventToRate && (
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center mb-3 shadow-sm border border-zinc-200 dark:border-white/10">
                                        <Lock className="w-4 h-4 text-amber-500 dark:text-amber-400" weight="fill" />
                                    </div>
                                    <span className="text-[10px] font-semibold text-zinc-900 dark:text-white uppercase tracking-wide">
                                        Unlock Insights
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Dummy Blurred Content - Full width/height */}
                        <div className="p-4 grid grid-cols-2 gap-4 opacity-30 select-none grayscale h-full">
                            {/* Dummy Rating */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <Star className="w-3 h-3 text-zinc-400" weight="fill" />
                                    <div className="h-2 w-12 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                                </div>
                                <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-600 rounded" />
                            </div>
                            {/* Dummy Skills */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <Lightbulb className="w-3 h-3 text-zinc-400" weight="fill" />
                                    <div className="h-2 w-8 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                                </div>
                                <div className="h-6 w-8 bg-zinc-200 dark:bg-zinc-600 rounded" />
                            </div>
                            {/* Dummy Impact */}
                            <div className="col-span-2 pt-2 border-t border-zinc-200 dark:border-white/10">
                                <div className="flex justify-between items-center">
                                    <div className="h-2 w-24 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                                    <div className="h-2 w-16 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                                </div>
                                <div className="mt-2 h-2 w-32 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                            </div>
                            {/* Extra filler content to fill space */}
                            <div className="col-span-2 space-y-2 mt-2">
                                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                                <div className="h-2 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardCard>
        );
    }

    // Mature state - full insights
    return (
        <DashboardCard title="" className={`p-5 flex flex-col ${className}`}>
            {/* Main metrics grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Average Rating */}
                {aggregates && aggregates.averageRating !== null && (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-white/5">
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
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-white/5">
                    <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" weight="fill" />
                        <span className="text-[10px] text-zinc-500 tracking-wide">Skills</span>
                    </div>
                    <div className="text-2xl font-semibold text-zinc-900 dark:text-white">
                        {aggregates?.uniqueSkills.length ?? 0}
                    </div>
                </div>

                {/* Connections */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-white/5">
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
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-white/5">
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
                <div className="pt-3 border-t border-zinc-100 dark:border-white/5">
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
