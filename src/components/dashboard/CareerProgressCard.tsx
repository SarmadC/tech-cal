'use client';

import React from 'react';
import Link from 'next/link';
import { Target, TrendUp, Users, Lightning, ArrowRight, Fire, Warning, CheckCircle, Lock, Circle } from '@phosphor-icons/react';
import { useDashboardMetrics, type GoalProgress } from '@/hooks/useDashboardMetrics';
import { useSubscriptionContext } from '@/contexts';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader';
import { cn } from '@/lib/utils';
import type { TrackedEventRecord, Event, CareerProfile } from '@/types';

interface CareerProgressCardProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    careerProfile: CareerProfile | null;
    presentation?: 'default' | 'mobile-dashboard';
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

// Calculate status based on progress and next-step readiness
function getGoalStatus(progress: number, eventCount: number, upcomingMatchCount: number): {
    status: 'ahead' | 'on-track' | 'needs-attention' | 'not-started' | 'ready-to-start';
    label: string;
    color: string;
    icon: typeof CheckCircle;
} {
    if (progress >= 100) {
        return { status: 'ahead', label: 'Complete', color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle };
    }
    if (eventCount === 0) {
        if (upcomingMatchCount > 0) {
            return { status: 'ready-to-start', label: 'Ready to Start', color: 'text-indigo-600 dark:text-indigo-400', icon: TrendUp };
        }
        return { status: 'not-started', label: 'Not Started', color: 'text-zinc-400 dark:text-zinc-500', icon: Circle };
    }
    // Simplified: 50%+ progress = on track, <50% = needs attention
    if (progress >= 50) {
        return { status: 'on-track', label: 'On Track', color: 'text-emerald-600 dark:text-emerald-400', icon: Fire };
    }
    if (progress >= 25) {
        return { status: 'on-track', label: 'In Progress', color: 'text-blue-600 dark:text-blue-400', icon: TrendUp };
    }
    return { status: 'needs-attention', label: 'Needs Attention', color: 'text-amber-600 dark:text-amber-400', icon: Warning };
}

// Calculate average impact quality for a goal
function getAverageImpact(goalData: GoalProgress): number | null {
    if (goalData.eventCount === 0 || goalData.impactTotal === 0) return null;
    return Math.round(goalData.impactTotal / goalData.eventCount);
}

// Get suggested action based on status
function getSuggestedAction(goalData: GoalProgress, goalKey: string): string | null {
    if (goalData.suggestedAction) {
        return goalData.suggestedAction;
    }

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
    presentation = 'default',
}: CareerProgressCardProps) {
    const isMobileDashboard = presentation === 'mobile-dashboard';
    const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
    const { isPro, isTrialing, startTrial, openUpgrade, hasUsedTrial } = useSubscriptionContext();
    const hasPremiumAccess = isPro || isTrialing;

    const metrics = useDashboardMetrics({
        trackedEvents,
        upcomingEvents,
        careerProfile,
    });

    // Total attended count for the header pill
    const totalAttended = trackedEvents.filter(e => e.status === 'attended').length;

    if (!careerProfile || metrics.goalProgress.length === 0) {
        return (
            <DashboardCard title="" className="w-full h-full min-h-[200px] flex flex-col" presentation={presentation}>
                <DashboardSectionHeader
                    icon={Target}
                    title="Goal Progress"
                    subtitle="Track your development progress"
                    presentation={presentation}
                />
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                    <div className={cn("w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-4", isMobileDashboard && "mobile-dashboard-emptyIcon bg-transparent")}>
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
    const totalGoalTarget = metrics.goalProgress.reduce((sum, g) => sum + g.targetEventCount, 0);
    const goalsReadyToStart = metrics.goalProgress.filter(g => g.eventCount === 0 && g.upcomingMatchCount > 0).length;
    const shouldPreferCountCopy = totalGoalEvents < 3;

    // Free tier: Show simplified progress overview
    if (!hasPremiumAccess) {
        const overallProgress = metrics.goalProgress.length > 0
            ? Math.round(metrics.goalProgress.reduce((sum, g) => sum + g.progress, 0) / metrics.goalProgress.length)
            : 0;

        return (
            <>
                <DashboardCard title="" className="w-full flex flex-col" presentation={presentation}>
                    <DashboardSectionHeader
                        icon={Target}
                        title="Goal Progress"
                        subtitle={shouldPreferCountCopy
                            ? `${totalGoalEvents} attended matches so far`
                            : `${totalGoalEvents} events matched to your goals`}
                        presentation={presentation}
                        action={(
                            <span className={cn("px-2.5 py-1 rounded-md bg-white/[0.08] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 text-xs font-medium", isMobileDashboard && "mobile-dashboard-pill")}>
                                {totalGoalEvents > 0
                                    ? (shouldPreferCountCopy ? `${totalGoalEvents} matched` : `${overallProgress}% Overall`)
                                    : goalsReadyToStart > 0
                                        ? `${goalsReadyToStart} ready`
                                        : `${metrics.goalProgress.length} tracked`}
                            </span>
                        )}
                    />

                    {/* Simple overall progress bar */}
                    <div className="mb-4">
                        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            {totalGoalEvents === 0
                                ? goalsReadyToStart > 0
                                    ? `${goalsReadyToStart} goal${goalsReadyToStart === 1 ? '' : 's'} have a strong next match`
                                    : `${metrics.goalProgress.length} career goal${metrics.goalProgress.length !== 1 ? 's' : ''} tracked`
                                : shouldPreferCountCopy
                                    ? `${Math.max(totalGoalTarget - totalGoalEvents, 0)} more matched events to build momentum`
                                    : `${metrics.goalProgress.length} career goal${metrics.goalProgress.length !== 1 ? 's' : ''} tracked`}
                        </p>
                    </div>

                    {/* Blurred goals grid preview */}
                    <div className="relative">
                        <div className={cn("absolute inset-0 z-10 backdrop-blur-[6px] bg-white/40 dark:bg-zinc-900/40 rounded-lg flex flex-col items-center justify-center p-6", isMobileDashboard && "mobile-dashboard-panelStrong")}>
                            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" weight="fill" />
                            <span className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                                Unlock Goal Analysis
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 text-center">
                                See detailed progress, impact scores & suggestions
                            </span>
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="px-4 py-2 rounded-full bg-amber-600 text-white text-xs font-medium hover:bg-amber-500 transition-colors"
                            >
                                Upgrade to Pro
                            </button>
                        </div>

                        {/* Blurred placeholder content */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-30 select-none pointer-events-none">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={cn("p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/40", isMobileDashboard && "mobile-dashboard-panel")}>
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
                                        <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
                                    </div>
                                    <div className="h-8 w-16 bg-zinc-300 dark:bg-zinc-600 rounded mb-2" />
                                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </DashboardCard>

                <UpgradeModal
                    open={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    variant={hasUsedTrial ? 'upgradePrompt' : 'trialStart'}
                    featureName="Goal Tracking"
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

    // Pro tier: Full goals view
    return (
        <DashboardCard title="" className="w-full flex flex-col" presentation={presentation}>
            {/* Header */}
            <DashboardSectionHeader
                icon={Target}
                title="Goal Progress"
                subtitle="Move your goals forward"
                presentation={presentation}
                action={(
                    <div className="flex flex-col items-end gap-1">
                        {totalGoalEvents > 0 ? (
                            <div className={cn("px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 text-xs font-medium", isMobileDashboard && "mobile-dashboard-pill")}>
                                {totalGoalEvents} {totalGoalEvents === 1 ? 'Event' : 'Events'} Matched
                            </div>
                        ) : goalsReadyToStart > 0 ? (
                            <div className={cn("px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 text-xs font-medium", isMobileDashboard && "mobile-dashboard-pill mobile-dashboard-pillInfo")}>
                                {goalsReadyToStart} Ready to Start
                            </div>
                        ) : (
                            <div className={cn("px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-white/[0.08] text-zinc-500 dark:text-zinc-400 text-xs font-medium", isMobileDashboard && "mobile-dashboard-pill")}>
                                {metrics.goalProgress.length} Goal{metrics.goalProgress.length !== 1 ? 's' : ''} Tracked
                            </div>
                        )}
                        {/* Show note if events attended but none matched any goals */}
                        {totalAttended > 0 && totalGoalEvents === 0 && (
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-500 italic">
                                {totalAttended} attended, none matched goals
                            </span>
                        )}
                    </div>
                )}
            />

            {/* Goals Grid - Each goal in its own sub-card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {metrics.goalProgress.map((goalData) => {
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
                    const isZeroState = goalData.eventCount === 0;
                    const hasRecommendedStart = goalData.upcomingMatchCount > 0;

                    // Status calculation
                    const status = getGoalStatus(progress, goalData.eventCount, goalData.upcomingMatchCount);
                    const StatusIcon = status.icon;

                    // Quality metrics
                    const avgImpact = getAverageImpact(goalData);
                    const suggestedAction = getSuggestedAction(goalData, goalData.goal);

                    return (
                        <div
                            key={goalData.goal}
                            className={cn(
                                "flex flex-col p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-white/5",
                                isMobileDashboard && "mobile-dashboard-panel"
                            )}
                        >
                            {/* Top Row: Icon/Title + Status Badge */}
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" weight="regular" />
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{config.label}</span>
                                </div>
                                <div className={cn(`flex items-center gap-1 text-[10px] font-medium ${status.color}`, isMobileDashboard && "tracking-[0.08em] uppercase")}>
                                    <StatusIcon className="w-3 h-3" weight="fill" />
                                    <span>{status.label}</span>
                                </div>
                            </div>

                            {/* Big Metric + Quality Score */}
                            <div className="flex items-baseline gap-3 mb-3">
                                {isZeroState ? (
                                    <>
                                        <span className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                                            {hasRecommendedStart ? goalData.upcomingMatchCount : 0}
                                        </span>
                                        <span className="text-sm text-zinc-500">
                                            {hasRecommendedStart ? 'recommended next' : 'attended matches'}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                                            {Math.round(goalData.progress)}%
                                        </span>
                                        {avgImpact !== null && (
                                            <span className="text-sm text-zinc-500">
                                                <span className="text-zinc-700 dark:text-zinc-400">{avgImpact}</span> avg impact
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Segmented Bar */}
                            <div className="flex gap-1 h-2 mb-2">
                                {[...Array(segments)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-[1px] transition-all duration-300 ${i < filledSegments
                                            ? `${config.color} shadow-[0_0_8px_rgba(255,255,255,0.15)]`
                                            : isMobileDashboard ? 'bg-[var(--mobile-dashboard-panel-bg-strong)]' : 'bg-zinc-200 dark:bg-zinc-700'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Bottom: Event count + Suggested Action */}
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-medium tracking-wide">
                                    <span>
                                        {isZeroState
                                            ? hasRecommendedStart
                                                ? `${goalData.upcomingMatchCount} strong upcoming ${goalData.upcomingMatchCount === 1 ? 'match' : 'matches'}`
                                                : `Target ${goalData.targetEventCount} events`
                                            : `${goalData.eventCount} of ${goalData.targetEventCount} events`}
                                    </span>
                                </div>
                                {suggestedAction && (
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate" title={suggestedAction}>
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
                <div className={cn("mt-6 pt-4 border-t border-zinc-100 dark:border-white/5", isMobileDashboard && "mobile-dashboard-divider")}>
                    <Link
                        href="/events"
                        className={cn("flex items-center justify-center gap-2 text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors", isMobileDashboard && "text-[var(--mobile-dashboard-info-text)] hover:text-[var(--mobile-dashboard-text-primary)]")}
                    >
                        Find events that match your goals
                        <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                    </Link>
                </div>
            )}
        </DashboardCard>
    );
}
