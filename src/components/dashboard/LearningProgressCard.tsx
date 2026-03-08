'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    ArrowRight,
    ArrowUpRight,
    BookmarkSimple,
    CaretDown,
    CaretUp,
    CheckCircle,
    Circle,
    GraduationCap,
    Minus,
    NotePencil,
    TrendDown,
    TrendUp,
    WarningCircle,
} from '@phosphor-icons/react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useLearningPathInteractions } from '@/hooks/useLearningPathInteractions';
import { useSubscriptionContext } from '@/contexts';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import type { TrackedEventRecord, Event, CareerProfile, EventType } from '@/types';
import { mapSkillsToCanonical } from '@/utils/skillTaxonomy';
import {
    buildLearningPathOverview,
    calculateLearningPathStreak,
    type LearningPathAction,
    type LearningPathQueueItem,
    type LearningPathSkillPlan,
    type LearningPathSkillState,
} from '@/utils/learningPath';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader';

const EventDetailSidebar = dynamic(
    () => import('@/components/calendar/EventDetailSidebar'),
    { ssr: false }
);

interface LearningProgressCardProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    careerProfile: CareerProfile | null;
    eventTypes?: EventType[];
}

function getSkillStateLabel(state: LearningPathSkillState): string {
    switch (state) {
        case 'needs_confirmation':
            return 'Needs confirmation';
        case 'attending':
            return 'Attending soon';
        case 'saved':
            return 'Saved, not RSVP’d';
        case 'recommended':
            return 'Ready to book';
        case 'completed':
            return 'Practiced this month';
        case 'no_matches':
        default:
            return 'Not started';
    }
}

function getOpportunityLabel(count: number): string {
    if (count === 0) {
        return 'No upcoming matches';
    }

    return `${count} upcoming match${count === 1 ? '' : 'es'}`;
}

function getActionTone(action: LearningPathAction): string {
    if (action.variant === 'primary') {
        if (action.type === 'confirm_missed') {
            return 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200';
        }

        return 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200';
    }

    if (action.type === 'save') {
        return 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-200';
    }

    if (action.type === 'confirm_missed') {
        return 'border border-amber-300 bg-transparent text-amber-700 hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-500/10';
    }

    return 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10';
}

function getActionIcon(action: LearningPathAction) {
    switch (action.type) {
        case 'save':
            return <BookmarkSimple className="w-3.5 h-3.5" weight="bold" />;
        case 'add_notes':
            return <NotePencil className="w-3.5 h-3.5" weight="bold" />;
        case 'confirm_attended':
        case 'confirm_missed':
            return <WarningCircle className="w-3.5 h-3.5" weight="bold" />;
        case 'view':
        case 'details':
            return <ArrowUpRight className="w-3.5 h-3.5" weight="bold" />;
        default:
            return null;
    }
}

export function LearningProgressCard({
    trackedEvents,
    upcomingEvents,
    careerProfile,
    eventTypes = [],
}: LearningProgressCardProps) {
    const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
    const { isPro, isTrialing, startTrial, openUpgrade, hasUsedTrial } = useSubscriptionContext();
    const hasPremiumAccess = isPro || isTrialing;

    const metrics = useDashboardMetrics({
        trackedEvents,
        upcomingEvents,
        careerProfile,
    });
    const targetSkills = React.useMemo(
        () => mapSkillsToCanonical(careerProfile?.skillsToLearn ?? []).slice(0, 4),
        [careerProfile?.skillsToLearn]
    );
    const learningPath = React.useMemo(() => {
        return buildLearningPathOverview({
            targetSkills,
            recentCoveredSkills: metrics.skillsCoveredThisMonth.uniqueSkills,
            allTimeCoveredSkills: metrics.allTimeSkillsCovered.skills,
            upcomingEvents,
            getEventMatchedSkills: metrics.getEventMatchedSkills,
            getEventAlignment: metrics.getEventAlignment,
        });
    }, [
        targetSkills,
        metrics.skillsCoveredThisMonth,
        metrics.allTimeSkillsCovered,
        upcomingEvents,
        metrics.getEventMatchedSkills,
        metrics.getEventAlignment,
    ]);
    const streakData = React.useMemo(
        () => calculateLearningPathStreak({
            trackedEvents,
            targetSkills,
            getEventMatchedSkills: metrics.getEventMatchedSkills,
        }),
        [trackedEvents, targetSkills, metrics.getEventMatchedSkills]
    );
    const handleEventClick = React.useCallback((event: Event) => {
        setSelectedEvent(event);
    }, []);
    const interactions = useLearningPathInteractions({
        skillPlans: learningPath.skillPlans,
        trackedEvents,
        getEventMatchedSkills: metrics.getEventMatchedSkills,
        getEventAlignment: metrics.getEventAlignment,
        onOpenEvent: handleEventClick,
        detailsMode: 'sidebar',
    });

    const { progress } = learningPath;
    const { skillPlans, queueItems, expandedSkill, setExpandedSkill, handleAction, isActionPending } = interactions;

    const handleEventDetailClose = () => {
        setSelectedEvent(null);
    };

    if (!careerProfile || targetSkills.length === 0) {
        return (
            <DashboardCard title="" className="min-h-[200px] flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
                        <GraduationCap className="w-6 h-6 text-zinc-400 dark:text-zinc-600" weight="light" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                        Define your learning goals
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-600 mb-4 max-w-[220px]">
                        Add skills you want to develop and track your progress over time
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

    const TrendIcon = streakData.trend === 'improving' ? TrendUp :
        streakData.trend === 'declining' ? TrendDown : Minus;
    const trendColor = streakData.trend === 'improving' ? 'text-emerald-600 dark:text-emerald-400' :
        streakData.trend === 'declining' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500';

    const renderActionButton = (
        action: LearningPathAction,
        slot: 'tile' | 'queue' | 'alternate',
        skill: string,
        className: string = '',
    ) => {
        const pending = isActionPending(action.event?.id, action.type, action.skill);

        return (
            <button
                key={`${action.type}-${action.event?.id ?? action.skill}-${slot}`}
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    void handleAction(action, { skill, slot });
                }}
                disabled={pending}
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-60 ${getActionTone(action)} ${className}`}
            >
                {getActionIcon(action)}
                <span>{pending ? 'Working…' : action.label}</span>
            </button>
        );
    };

    const renderSkillCard = (skillPlan: LearningPathSkillPlan) => {
        const isExpanded = expandedSkill === skillPlan.skill;
        const statusTone = skillPlan.state === 'completed'
            ? 'text-emerald-600 dark:text-emerald-400'
            : skillPlan.requiresAttention
                ? 'text-indigo-600 dark:text-indigo-300'
                : 'text-zinc-500 dark:text-zinc-400';

        return (
            <div
                key={skillPlan.skill}
                className={`rounded-xl border transition-all ${isExpanded
                    ? 'border-zinc-300 bg-white dark:border-white/15 dark:bg-white/[0.04] shadow-sm'
                    : 'border-zinc-200 bg-zinc-50 dark:border-white/5 dark:bg-zinc-800/40'
                    }`}
            >
                <button
                    type="button"
                    onClick={() => setExpandedSkill(isExpanded ? null : skillPlan.skill)}
                    className="w-full text-left p-3"
                    aria-expanded={isExpanded}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                                {skillPlan.state === 'completed' ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" weight="fill" />
                                ) : (
                                    <Circle className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 flex-shrink-0" weight="bold" />
                                )}
                                <span className={`text-sm font-semibold truncate ${skillPlan.state === 'completed' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-200'}`}>
                                    {skillPlan.skill}
                                </span>
                                {skillPlan.requiresAttention && (
                                    <span className="inline-flex w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" aria-hidden="true" />
                                )}
                            </div>
                            <div className="pl-5.5 space-y-0.5">
                                <div className={`text-[11px] font-medium ${statusTone}`}>
                                    {getSkillStateLabel(skillPlan.state)}
                                </div>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-500">
                                    {getOpportunityLabel(skillPlan.matchingUpcomingCount)}
                                </div>
                            </div>
                        </div>
                        {isExpanded ? (
                            <CaretUp className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" weight="bold" />
                        ) : (
                            <CaretDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" weight="bold" />
                        )}
                    </div>
                </button>

                {isExpanded && (
                    <div className="px-3 pb-3 border-t border-zinc-200/80 dark:border-white/10">
                        <div className="pt-3 space-y-3">
                            {skillPlan.topEvent ? (
                                <>
                                    <div className="space-y-1">
                                        <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
                                            {skillPlan.state === 'needs_confirmation' ? 'Attendance to Confirm' : 'Best Next Event'}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleEventClick(skillPlan.topEvent!)}
                                            className="text-left text-sm font-medium text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-300 transition-colors"
                                        >
                                            {skillPlan.topEvent.title}
                                        </button>
                                        <div className="text-[11px] text-zinc-500 dark:text-zinc-500">
                                            {new Date(skillPlan.topEvent.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            {' · '}
                                            {skillPlan.matchReason ?? `Best match for ${skillPlan.skill}`}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {renderActionButton(skillPlan.primaryAction, 'tile', skillPlan.skill)}
                                        {skillPlan.secondaryActions.map((action) => renderActionButton(action, 'tile', skillPlan.skill))}
                                    </div>

                                    {skillPlan.alternativeEvents.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
                                                Alternative Matches
                                            </div>
                                            <div className="space-y-2">
                                                {skillPlan.alternativeEvents.map((event) => (
                                                    <div
                                                        key={event.id}
                                                        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleAction({
                                                                type: 'details',
                                                                label: 'View',
                                                                skill: skillPlan.skill,
                                                                event,
                                                                variant: 'secondary',
                                                            }, { skill: skillPlan.skill, slot: 'alternate' })}
                                                            className="min-w-0 text-left"
                                                        >
                                                            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                                                {event.title}
                                                            </div>
                                                            <div className="text-[11px] text-zinc-500 dark:text-zinc-500">
                                                                {new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </div>
                                                        </button>
                                                        {renderActionButton({
                                                            type: 'details',
                                                            label: 'View',
                                                            skill: skillPlan.skill,
                                                            event,
                                                            variant: 'secondary',
                                                        }, 'alternate', skillPlan.skill)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                        No matched events are on the calendar yet for {skillPlan.skill}.
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {renderActionButton(skillPlan.primaryAction, 'tile', skillPlan.skill)}
                                        {skillPlan.secondaryActions.map((action) => renderActionButton(action, 'tile', skillPlan.skill))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderQueueActions = (queueItem: LearningPathQueueItem) => {
        if (queueItem.state === 'needs_confirmation') {
            return (
                <>
                    {renderActionButton(queueItem.primaryAction, 'queue', queueItem.skill)}
                    {queueItem.secondaryActions
                        .filter((action) => action.type === 'confirm_missed')
                        .map((action) => renderActionButton(action, 'queue', queueItem.skill))}
                </>
            );
        }

        if (queueItem.state === 'recommended') {
            return (
                <>
                    {renderActionButton(queueItem.primaryAction, 'queue', queueItem.skill)}
                    {queueItem.secondaryActions
                        .filter((action) => action.type === 'save')
                        .slice(0, 1)
                        .map((action) => renderActionButton(action, 'queue', queueItem.skill))}
                </>
            );
        }

        return renderActionButton(queueItem.primaryAction, 'queue', queueItem.skill);
    };

    if (!hasPremiumAccess) {
        return (
            <>
                <DashboardCard title="" className="w-full flex flex-col">
                    <DashboardSectionHeader
                        icon={GraduationCap}
                        title="Learning Path"
                        subtitle={`${progress.covered}/${progress.total} target skills practiced this month`}
                        action={(
                            <span className="px-2.5 py-1 rounded-md bg-white/[0.08] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                                {progress.percent}% This Month
                            </span>
                        )}
                    />

                    <div className="mb-4">
                        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress.percent}%` }}
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-white/40 dark:bg-zinc-900/40 rounded-lg flex flex-col items-center justify-center p-6">
                            <GraduationCap className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" weight="fill" />
                            <span className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                                Unlock Skill Tracking
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 text-center">
                                See detailed progress, trends & recommendations
                            </span>
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="px-4 py-2 rounded-full bg-amber-600 text-white text-xs font-medium hover:bg-amber-500 transition-colors"
                            >
                                Upgrade to Pro
                            </button>
                        </div>

                        <div className="flex gap-6 opacity-30 select-none pointer-events-none">
                            <div className="w-[60%]">
                                <div className="grid grid-cols-2 gap-2">
                                    {[1, 2, 3, 4].map((index) => (
                                        <div key={index} className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/40">
                                            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
                                            <div className="h-2 w-12 bg-zinc-200 dark:bg-zinc-700 rounded" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-[40%] border-l border-zinc-100 dark:border-white/5 pl-6">
                                <div className="space-y-3">
                                    {[1, 2, 3].map((index) => (
                                        <div key={index} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </DashboardCard>

                <UpgradeModal
                    open={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    variant={hasUsedTrial ? 'upgradePrompt' : 'trialStart'}
                    featureName="Learning Progress"
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

    return (
        <DashboardCard title="" className="w-full flex flex-col">
            <DashboardSectionHeader
                icon={GraduationCap}
                title="Learning Path"
                subtitle={
                    streakData.currentStreak > 0
                        ? `${streakData.currentStreak} month target-skill streak`
                        : 'Practice a target skill this month'
                }
                action={(
                    <div className="flex items-center gap-2">
                        {streakData.currentStreak > 0 && (
                            <div className={`flex items-center gap-0.5 ${trendColor}`}>
                                <TrendIcon className="w-3 h-3" weight="bold" />
                            </div>
                        )}
                        <span className="px-2.5 py-1 rounded-md bg-white/[0.08] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                            {progress.covered}/{progress.total} Practiced
                        </span>
                    </div>
                )}
            />

            <div className="flex gap-6">
                <div className="w-[60%] flex flex-col">
                    <h4 className="text-[10px] text-zinc-500 tracking-wide mb-3 font-medium uppercase">Skill Coverage</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {skillPlans.map((skillPlan) => renderSkillCard(skillPlan))}
                    </div>
                </div>

                <div className="w-[40%] flex flex-col border-l border-zinc-100 dark:border-white/5 pl-6">
                    <h4 className="text-[10px] text-zinc-500 tracking-wide mb-3 font-medium uppercase">Next Actions</h4>
                    <div className="flex flex-col gap-3">
                        {queueItems.length > 0 ? (
                            queueItems.map((queueItem) => (
                                <div
                                    key={`${queueItem.skill}-${queueItem.event?.id ?? queueItem.state}`}
                                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            {queueItem.event ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleEventClick(queueItem.event!)}
                                                    className="text-left text-sm font-medium text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-300 transition-colors"
                                                >
                                                    {queueItem.event.title}
                                                </button>
                                            ) : (
                                                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                    {queueItem.skill}
                                                </div>
                                            )}
                                            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                                                {queueItem.skill}
                                                {queueItem.event && (
                                                    <>
                                                        {' · '}
                                                        {new Date(queueItem.event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {queueItem.state === 'needs_confirmation' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                                                Confirm
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {renderQueueActions(queueItem)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col justify-center items-center text-center opacity-60 py-4">
                                <p className="text-xs text-zinc-500 dark:text-zinc-500 italic">
                                    No learning actions yet
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <EventDetailSidebar
                event={selectedEvent}
                onClose={handleEventDetailClose}
                categories={eventTypes}
            />
        </DashboardCard>
    );
}
