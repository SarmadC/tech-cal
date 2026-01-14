'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { GraduationCap, ArrowUpRight, Circle, CheckCircle, Fire, TrendUp, TrendDown, Minus, ArrowRight, Lock } from '@phosphor-icons/react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useSubscriptionContext } from '@/contexts';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import type { TrackedEventRecord, Event, CareerProfile, EventType } from '@/types';
import { getCanonicalSkillMeta, mapSkillsToCanonical } from '@/utils/skillTaxonomy';
import dynamic from 'next/dynamic';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader';

// Dynamically import event detail panel
const EventDetailPanel = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { ssr: false }
);

// Calculate learning streak (consecutive months with skill events)
function calculateLearningStreak(trackedEvents: TrackedEventRecord[]): {
    currentStreak: number;
    trend: 'improving' | 'stable' | 'declining';
    lastMonthEvents: number;
    thisMonthEvents: number;
} {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Count events per month (last 6 months)
    const monthlyEvents: number[] = [];
    for (let i = 0; i < 6; i++) {
        const targetMonth = new Date(thisYear, thisMonth - i, 1);
        const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
        const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

        const eventsInMonth = trackedEvents.filter(te => {
            if (te.status !== 'attended' || !te.event) return false;
            const eventDate = new Date(te.event.startTime);
            return eventDate >= monthStart && eventDate <= monthEnd;
        }).length;

        monthlyEvents.push(eventsInMonth);
    }

    // Calculate streak (consecutive months with at least 1 event, starting from current month)
    let streak = 0;
    for (const count of monthlyEvents) {
        if (count > 0) {
            streak++;
        } else {
            break;
        }
    }

    // Trend: compare this month to last month
    const thisMonthEvents = monthlyEvents[0];
    const lastMonthEvents = monthlyEvents[1];

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (thisMonthEvents > lastMonthEvents) {
        trend = 'improving';
    } else if (thisMonthEvents < lastMonthEvents && lastMonthEvents > 0) {
        trend = 'declining';
    }

    return { currentStreak: streak, trend, lastMonthEvents, thisMonthEvents };
}

interface LearningProgressCardProps {
    trackedEvents: TrackedEventRecord[];
    upcomingEvents: Event[];
    careerProfile: CareerProfile | null;
    eventTypes?: EventType[];
}

export function LearningProgressCard({
    trackedEvents,
    upcomingEvents,
    careerProfile,
    eventTypes = [],
}: LearningProgressCardProps) {
    const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
    const { isPro, isTrialing, startTrial, openUpgrade } = useSubscriptionContext();
    const hasPremiumAccess = isPro || isTrialing;

    const metrics = useDashboardMetrics({
        trackedEvents,
        upcomingEvents,
        careerProfile,
    });
    const { getEventMatchedSkills } = metrics;

    const { progress, relevantEvents, coveredSkillNames, skillEventCounts } = React.useMemo(() => {
        if (!careerProfile || careerProfile.skillsToLearn.length === 0) {
            return {
                progress: { covered: 0, total: 0, percent: 0 },
                relevantEvents: [],
                coveredSkillNames: new Set<string>(),
                skillEventCounts: {} as Record<string, number>
            };
        }

        // 1. Target Skills
        const canonicalTargetSkills = mapSkillsToCanonical(careerProfile.skillsToLearn);

        // 2. Covered Skills
        const coveredSet = new Set<string>();
        metrics.skillsCoveredThisMonth.uniqueSkills.forEach(skill => {
            const canonical = getCanonicalSkillMeta(skill);
            if (canonical) {
                const match = canonicalTargetSkills.find(t =>
                    t.toLowerCase() === canonical.name.toLowerCase()
                );
                if (match) coveredSet.add(match);
            }
        });

        // 3. Relevant Events & Skill Counts
        const counts: Record<string, number> = {};
        canonicalTargetSkills.forEach(s => counts[s] = 0);

        const events = upcomingEvents
            .filter(event => {
                const eventMatchedSkills = getEventMatchedSkills(event);
                let isRelevant = false;

                eventMatchedSkills.forEach(skill => {
                    const canonical = getCanonicalSkillMeta(skill);
                    const skillName = canonical?.name || skill;

                    // Check relevance
                    const target = canonicalTargetSkills.find(t =>
                        t.toLowerCase().includes(skillName.toLowerCase()) ||
                        skillName.toLowerCase().includes(t.toLowerCase())
                    );

                    if (target) {
                        isRelevant = true;
                        counts[target] = (counts[target] || 0) + 1;
                    }
                });
                return isRelevant;
            })
            .slice(0, 3); // Top 3

        return {
            progress: {
                covered: coveredSet.size,
                total: canonicalTargetSkills.length,
                percent: canonicalTargetSkills.length > 0
                    ? Math.round((coveredSet.size / canonicalTargetSkills.length) * 100)
                    : 0
            },
            relevantEvents: events,
            coveredSkillNames: coveredSet,
            skillEventCounts: counts
        };
    }, [careerProfile, metrics.skillsCoveredThisMonth, getEventMatchedSkills, upcomingEvents]);

    // Calculate learning streak
    const streakData = React.useMemo(
        () => calculateLearningStreak(trackedEvents),
        [trackedEvents]
    );

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    };

    // Handle escape key press and body scroll lock
    React.useEffect(() => {
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
    }, [isModalOpen]);

    if (!careerProfile || careerProfile.skillsToLearn.length === 0) {
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

    const targetSkills = mapSkillsToCanonical(careerProfile.skillsToLearn).slice(0, 4);

    // Trend icon and color
    const TrendIcon = streakData.trend === 'improving' ? TrendUp :
        streakData.trend === 'declining' ? TrendDown : Minus;
    const trendColor = streakData.trend === 'improving' ? 'text-emerald-600 dark:text-emerald-400' :
        streakData.trend === 'declining' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500';

    // Free tier: Show basic count only with blurred details
    if (!hasPremiumAccess) {
        return (
            <>
                <DashboardCard title="" className="w-full flex flex-col">
                    <DashboardSectionHeader
                        icon={GraduationCap}
                        title="Learning Path"
                        subtitle={`${progress.covered}/${progress.total} skills covered`}
                        action={(
                            <span className="px-2.5 py-1 rounded-md bg-white/[0.08] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                                {progress.percent}% Complete
                            </span>
                        )}
                    />

                    {/* Simple progress bar for free tier */}
                    <div className="mb-4">
                        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress.percent}%` }}
                            />
                        </div>
                    </div>

                    {/* Blurred skill matrix preview */}
                    <div className="relative">
                        <div className="absolute inset-0 z-10 backdrop-blur-[6px] bg-white/40 dark:bg-zinc-900/40 rounded-lg flex flex-col items-center justify-center p-6">
                            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" weight="fill" />
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

                        {/* Blurred placeholder content */}
                        <div className="flex gap-6 opacity-30 select-none pointer-events-none">
                            <div className="w-[60%]">
                                <div className="grid grid-cols-2 gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/40">
                                            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
                                            <div className="h-2 w-12 bg-zinc-200 dark:bg-zinc-700 rounded" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-[40%] border-l border-zinc-100 dark:border-white/5 pl-6">
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </DashboardCard>

                <UpgradeModal
                    open={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    variant="trialStart"
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

    // Pro tier: Full learning path view
    return (
        <DashboardCard title="" className="w-full flex flex-col">
            {/* Header with Streak - using DashboardSectionHeader for consistency */}
            <DashboardSectionHeader
                icon={GraduationCap}
                title="Learning Path"
                subtitle={
                    streakData.currentStreak > 0
                        ? `${streakData.currentStreak} month streak`
                        : "Start your learning streak this month"
                }
                action={(
                    <div className="flex items-center gap-2">
                        {/* Trend indicator */}
                        {streakData.currentStreak > 0 && (
                            <div className={`flex items-center gap-0.5 ${trendColor}`}>
                                <TrendIcon className="w-3 h-3" weight="bold" />
                            </div>
                        )}
                        {/* Unified filled pill badge */}
                        <span className="px-2.5 py-1 rounded-md bg-white/[0.08] dark:bg-white/[0.08] text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                            {progress.covered}/{progress.total} Skills
                        </span>
                    </div>
                )}
            />

            {/* Main Body: 2 Columns */}
            <div className="flex gap-6">
                {/* Left Column (60%): Skill Matrix */}
                <div className="w-[60%] flex flex-col">
                    <h4 className="text-[10px] text-zinc-500 tracking-wide mb-3 font-medium uppercase">Target Skills</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {targetSkills.map(skill => {
                            const isCovered = coveredSkillNames.has(skill);
                            const eventCount = skillEventCounts[skill] || 0;
                            return (
                                <div key={skill} className="flex flex-col p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-white/5 h-full justify-between">
                                    <div className="flex items-center gap-2 mb-1">
                                        {isCovered ? (
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" weight="fill" />
                                        ) : (
                                            <Circle className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 flex-shrink-0" weight="bold" />
                                        )}
                                        <span className={`text-xs font-medium truncate ${isCovered ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-500'}`} title={skill}>
                                            {skill}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-600 pl-5.5">
                                        {eventCount} Event{eventCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Column (40%): Action Center */}
                <div className="w-[40%] flex flex-col border-l border-zinc-100 dark:border-white/5 pl-6">
                    <h4 className="text-[10px] text-zinc-500 tracking-wide mb-3 font-medium uppercase">Recommended</h4>
                    <div className="flex flex-col gap-3">
                        {relevantEvents.length > 0 ? (
                            relevantEvents.map(event => (
                                <div
                                    key={event.id}
                                    className="group cursor-pointer"
                                    onClick={() => handleEventClick(event)}
                                >
                                    <div className="flex items-start gap-2">
                                        <ArrowUpRight className="w-3 h-3 text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="flex flex-col -ml-5 group-hover:ml-0 transition-all duration-200">
                                            <span className="text-xs text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2 leading-tight">
                                                {event.title}
                                            </span>
                                            {event.startTime && (
                                                <span className="text-[10px] text-zinc-500 dark:text-zinc-600 mt-0.5">
                                                    {new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col justify-center items-center text-center opacity-50 py-2">
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-600 italic">No events found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
        </DashboardCard>
    );
}
