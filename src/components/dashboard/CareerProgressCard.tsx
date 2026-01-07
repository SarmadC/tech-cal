'use client';

import React from 'react';
import Link from 'next/link';
import { Target, TrendUp, Users, Lightning, ArrowRight, Fire, Warning, CheckCircle } from '@phosphor-icons/react';
import { useDashboardMetrics, type GoalProgress } from '@/hooks/useDashboardMetrics';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader';
import type { TrackedEventRecord, Event, CareerProfile } from '@/types';

interface CareerProgressCardProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    careerProfile: CareerProfile | null;
}

const GOAL_CONFIG = {
    'skill-development': {
        label: 'Skill Development',
        icon: Lightning,
        color: 'bg-indigo-500',
        action: 'workshops or courses'
    },
    'role-transition': {
        label: 'Role Transition',
        icon: TrendUp,
        color: 'bg-amber-500',
        action: 'career-focused events'
    },
    'leadership-growth': {
        label: 'Leadership',
        icon: Target,
        color: 'bg-pink-500',
        action: 'leadership events'
    },
    'networking': {
        label: 'Networking',
        icon: Users,
        color: 'bg-emerald-500',
        action: 'networking events'
    },
} as const;

// Calculate status based on progress and time through quarter
function getGoalStatus(progress: number, eventCount: number): {
    status: 'ahead' | 'on-track' | 'needs-attention' | 'not-started';
    label: string;
    color: string;
    icon: typeof CheckCircle;
} {
    if (progress >= 100) {
        return { status: 'ahead', label: 'Complete', color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle };
    }
    if (eventCount === 0) {
        return { status: 'not-started', label: 'Not Started', color: 'text-zinc-500', icon: Target };
    }
    // Simplified: 50%+ progress = on track, <50% = needs attention
    if (progress >= 50) {
        return { status: 'on-track', label: 'On Track', color: 'text-emerald-600 dark:text-emerald-400', icon: Fire };
    }
    if (progress >= 25) {
        return { status: 'on-track', label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', icon: TrendUp };
    }
    return { status: 'needs-attention', label: 'Needs Attention', color: 'text-amber-600 dark:text-amber-400', icon: Warning };
}

// Calculate average impact quality for a goal
function getAverageImpact(goalData: GoalProgress): number | null {
    if (goalData.eventCount === 0) return null;
    return Math.round(goalData.impactTotal / goalData.eventCount);
}

// Get suggested action based on status
function getSuggestedAction(goalData: GoalProgress, goalKey: string): string | null {
    const config = GOAL_CONFIG[goalKey as keyof typeof GOAL_CONFIG];
    const eventsNeeded = goalData.targetEventCount - goalData.eventCount;

    if (goalData.progress >= 100) return null;
    if (eventsNeeded <= 0) return null;

    return `Attend ${eventsNeeded} more ${config?.action || 'events'}`;
}

export function CareerProgressCard({
    trackedEvents,
    upcomingEvents,
    careerProfile,
}: CareerProgressCardProps) {
    const metrics = useDashboardMetrics({
        trackedEvents,
        upcomingEvents,
        careerProfile,
    });

    // Total attended count for the header pill
    const totalAttended = trackedEvents.filter(e => e.status === 'attended').length;

    if (!careerProfile || metrics.goalProgress.length === 0) {
        return (
            <DashboardCard title="" className="w-full h-full min-h-[200px] flex flex-col">
                <DashboardSectionHeader
                    title="Goals & Impact"
                    subtitle="Your Career Goals"
                />
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
                        <Target className="w-6 h-6 text-zinc-400 dark:text-zinc-600" weight="light" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                        Set your career goals
                    </p>
                    <p className="text-xs text-zinc-600 mb-4 max-w-[220px]">
                        Define goals in your profile to track progress and get personalized recommendations
                    </p>
                    <Link
                        href="/dashboard/settings"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                    >
                        Update Profile
                        <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                    </Link>
                </div>
            </DashboardCard>
        );
    }

    // Calculate overall status
    const goalsWithProgress = metrics.goalProgress.filter(g => g.eventCount > 0);
    const totalGoalEvents = metrics.goalProgress.reduce((sum, g) => sum + g.eventCount, 0);

    return (
        <DashboardCard title="" className="w-full flex flex-col">
            {/* Header */}
            <DashboardSectionHeader
                title="Goals & Impact"
                action={(
                    <div className="flex flex-col items-end gap-1">
                        <div className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                            {totalGoalEvents} {totalGoalEvents === 1 ? 'Event' : 'Events'} Matched
                        </div>
                        {/* Show note if events attended but none matched any goals */}
                        {totalAttended > 0 && totalGoalEvents === 0 && (
                            <span className="text-[10px] text-zinc-600 italic">
                                {totalAttended} attended, none matched goals
                            </span>
                        )}
                    </div>
                )}
            />

            {/* Goals Grid (Key Value Layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-y-0">
                {metrics.goalProgress.map((goalData, index) => {
                    const config = GOAL_CONFIG[goalData.goal as keyof typeof GOAL_CONFIG] || {
                        label: goalData.goal,
                        icon: Target,
                        color: 'bg-indigo-500',
                        action: 'events'
                    };
                    const Icon = config.icon;

                    const segments = 8;
                    const progress = Math.min(100, Math.max(0, goalData.progress));
                    const filledSegments = Math.round((progress / 100) * segments);

                    // Status calculation
                    const status = getGoalStatus(progress, goalData.eventCount);
                    const StatusIcon = status.icon;

                    // Quality metrics
                    const avgImpact = getAverageImpact(goalData);
                    const suggestedAction = getSuggestedAction(goalData, goalData.goal);

                    // Add border-r to the first item (left column) in desktop view
                    const isLeftColumn = index % 2 === 0;
                    const isTopRow = index < 2;

                    return (
                        <div
                            key={goalData.goal}
                            className={`flex flex-col ${isLeftColumn
                                ? 'md:border-r md:border-zinc-100 dark:md:border-white/5 md:pr-6'
                                : 'md:pl-6'
                                } ${!isTopRow ? 'md:pt-6 md:border-t md:border-zinc-100 dark:md:border-white/5' : ''}`}
                        >
                            {/* Top Row: Icon/Title + Status Badge */}
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" weight="regular" />
                                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{config.label}</span>
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] font-medium ${status.color}`}>
                                    <StatusIcon className="w-3 h-3" weight="fill" />
                                    <span>{status.label}</span>
                                </div>
                            </div>

                            {/* Big Metric + Quality Score */}
                            <div className="flex items-baseline gap-3 mb-3">
                                <span className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                                    {Math.round(goalData.progress)}%
                                </span>
                                {avgImpact !== null && (
                                    <span className="text-sm text-zinc-500">
                                        <span className="text-zinc-700 dark:text-zinc-400">{avgImpact}</span> avg impact
                                    </span>
                                )}
                            </div>

                            {/* Segmented Bar */}
                            <div className="flex gap-1 h-2 mb-2">
                                {[...Array(segments)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-[1px] transition-all duration-300 ${i < filledSegments
                                            ? `${config.color} shadow-[0_0_8px_rgba(255,255,255,0.15)]`
                                            : 'bg-zinc-200 dark:bg-zinc-800'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Bottom: Event count + Suggested Action */}
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-medium tracking-wide">
                                    <span>{goalData.eventCount} of {goalData.targetEventCount} events</span>
                                </div>
                                {suggestedAction && (
                                    <p className="text-[10px] text-zinc-600 truncate" title={suggestedAction}>
                                        {suggestedAction}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer: CTA if no progress yet */}
            {goalsWithProgress.length === 0 && (
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5">
                    <Link
                        href="/discover"
                        className="flex items-center justify-center gap-2 text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                    >
                        Find events that match your goals
                        <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                    </Link>
                </div>
            )}
        </DashboardCard>
    );
}
