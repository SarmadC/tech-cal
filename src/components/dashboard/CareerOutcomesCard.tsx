'use client';

import React from 'react';
import Link from 'next/link';
import { Rocket, Star, Users, Lightbulb, ChartLineUp, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { useEventFeedback, type FeedbackAggregates } from '@/hooks/useEventFeedback';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import type { TrackedEventRecord } from '@/types';

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

    // Count attended events from tracked events
    const attendedCount = trackedEvents.filter(e => e.status === 'attended').length;
    const upcomingCount = trackedEvents.filter(e => e.status === 'attending').length;

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

    // Early state - some activity but not enough feedback
    if (isEarlyState) {
        const eventsUntilInsights = Math.max(0, EARLY_THRESHOLD - attendedCount);
        const feedbackNeeded = Math.max(0, MATURE_THRESHOLD - feedbackCount);

        return (
            <DashboardCard title="" className={`p-5 flex flex-col ${className}`}>
                {/* Progress toward insights */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs text-zinc-500">Progress to insights</span>
                                <span className="text-xs text-zinc-400 font-medium">
                                    {feedbackCount}/{MATURE_THRESHOLD}
                                </span>
                            </div>
                            <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, (feedbackCount / MATURE_THRESHOLD) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity summary */}
                <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-white/5">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Events Attended</span>
                        </div>
                        <span className="text-lg font-semibold text-zinc-900 dark:text-white">{attendedCount}</span>
                    </div>

                    {upcomingCount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-white/5">
                            <div className="flex items-center gap-2.5">
                                <ChartLineUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" weight="fill" />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">Upcoming</span>
                            </div>
                            <span className="text-lg font-semibold text-zinc-900 dark:text-white">{upcomingCount}</span>
                        </div>
                    )}
                </div>

                {/* CTA for feedback */}
                {feedbackNeeded > 0 && attendedCount > 0 && (
                    <div className="pt-3 border-t border-zinc-100 dark:border-white/5">
                        <p className="text-xs text-zinc-500 text-center">
                            Rate {feedbackNeeded} more event{feedbackNeeded > 1 ? 's' : ''} to unlock full insights
                        </p>
                    </div>
                )}
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
        </DashboardCard>
    );
}
