import type { Event, TrackedEventRecord } from '@/types';
import { RECOMMENDATION_THRESHOLDS } from '@/config/recommendationThresholds';
import { getCanonicalSkillMeta } from '@/utils/skillTaxonomy';

type EventAlignment = {
    score: number;
    computed: boolean;
    reason?: string;
};

type StreakTrend = 'improving' | 'stable' | 'declining';

type ActionVariant = 'primary' | 'secondary';

interface RankedLearningPathEvent {
    event: Event;
    score: number;
    reason?: string;
    isPreferred: boolean;
    eventTime: number;
}

export type LearningPathSkillState =
    | 'needs_confirmation'
    | 'attending'
    | 'saved'
    | 'recommended'
    | 'completed'
    | 'no_matches';

export type LearningPathActionType =
    | 'rsvp'
    | 'save'
    | 'view'
    | 'details'
    | 'confirm_attended'
    | 'confirm_missed'
    | 'add_notes'
    | 'find_events'
    | 'edit_skills';

export interface LearningPathAction {
    type: LearningPathActionType;
    label: string;
    skill: string;
    event?: Event;
    variant: ActionVariant;
}

export interface LearningPathCandidateEvent {
    event: Event;
    score: number;
    reason?: string;
}

export interface LearningPathProgress {
    covered: number;
    total: number;
    percent: number;
}

export interface LearningPathSkillPlan {
    skill: string;
    practicedRecently: boolean;
    coveredAllTime: boolean;
    matchingUpcomingCount: number;
    candidateEvents: LearningPathCandidateEvent[];
    topEvent?: Event;
    topEventScore?: number;
    alternativeEvents: Event[];
    state: LearningPathSkillState;
    primaryAction: LearningPathAction;
    secondaryActions: LearningPathAction[];
    priority: number;
    matchReason?: string;
    requiresAttention: boolean;
}

export interface LearningPathQueueItem {
    skill: string;
    state: LearningPathSkillState;
    event?: Event;
    primaryAction: LearningPathAction;
    secondaryActions: LearningPathAction[];
    priority: number;
    matchReason?: string;
    topEventScore?: number;
}

export interface LearningPathStreak {
    currentStreak: number;
    trend: StreakTrend;
    lastMonthEvents: number;
    thisMonthEvents: number;
}

function getCanonicalSkillName(skill: string): string {
    return getCanonicalSkillMeta(skill)?.name ?? skill;
}

function getEventOccurrenceDate(event: Event): Date {
    return new Date(event.endTime || event.startTime);
}

function getSkillStatePriority(state: LearningPathSkillState): number {
    switch (state) {
        case 'needs_confirmation':
            return 1;
        case 'saved':
            return 2;
        case 'recommended':
            return 3;
        case 'attending':
            return 4;
        case 'completed':
            return 5;
        case 'no_matches':
        default:
            return 6;
    }
}

function createAction(
    skill: string,
    type: LearningPathActionType,
    label: string,
    event?: Event,
    variant: ActionVariant = 'primary',
): LearningPathAction {
    return {
        type,
        label,
        skill,
        event,
        variant,
    };
}

function createBaseActions(params: {
    skill: string;
    state: LearningPathSkillState;
    topEvent?: Event;
}): {
    primaryAction: LearningPathAction;
    secondaryActions: LearningPathAction[];
    requiresAttention: boolean;
} {
    const { skill, state, topEvent } = params;

    switch (state) {
        case 'completed':
            return {
                primaryAction: createAction(skill, 'add_notes', 'Add notes', topEvent),
                secondaryActions: topEvent
                    ? [createAction(skill, 'view', 'View recap', topEvent, 'secondary')]
                    : [],
                requiresAttention: false,
            };
        case 'recommended':
            return {
                primaryAction: createAction(skill, 'rsvp', 'RSVP', topEvent),
                secondaryActions: [
                    ...(topEvent ? [createAction(skill, 'save', 'Save', topEvent, 'secondary')] : []),
                    ...(topEvent ? [createAction(skill, 'details', 'Details', topEvent, 'secondary')] : []),
                ],
                requiresAttention: true,
            };
        case 'no_matches':
        default:
            return {
                primaryAction: createAction(skill, 'find_events', 'Find events'),
                secondaryActions: [createAction(skill, 'edit_skills', 'Edit skills', undefined, 'secondary')],
                requiresAttention: false,
            };
    }
}

export function matchSkillToTarget(skill: string, targetSkills: string[]): string | null {
    const canonicalSkill = getCanonicalSkillName(skill).toLowerCase();
    let partialMatch: string | null = null;

    targetSkills.forEach((targetSkill) => {
        const canonicalTarget = getCanonicalSkillName(targetSkill).toLowerCase();

        if (canonicalTarget === canonicalSkill) {
            partialMatch = targetSkill;
            return;
        }

        if (
            partialMatch == null &&
            (canonicalTarget.includes(canonicalSkill) || canonicalSkill.includes(canonicalTarget))
        ) {
            partialMatch = targetSkill;
        }
    });

    return partialMatch;
}

export function getMatchedTargetSkillsForEvent(
    event: Event,
    targetSkills: string[],
    getEventMatchedSkills: (event: Event) => string[],
): string[] {
    const matches = new Set<string>();

    getEventMatchedSkills(event).forEach((skill) => {
        const matchedTarget = matchSkillToTarget(skill, targetSkills);
        if (matchedTarget) {
            matches.add(matchedTarget);
        }
    });

    return Array.from(matches);
}

export function calculateLearningPathStreak(params: {
    trackedEvents: TrackedEventRecord[];
    targetSkills: string[];
    getEventMatchedSkills: (event: Event) => string[];
}): LearningPathStreak {
    const { trackedEvents, targetSkills, getEventMatchedSkills } = params;

    if (targetSkills.length === 0) {
        return {
            currentStreak: 0,
            trend: 'stable',
            lastMonthEvents: 0,
            thisMonthEvents: 0,
        };
    }

    const now = new Date();
    const monthlyEvents: number[] = [];

    for (let i = 0; i < 6; i += 1) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const eventsInMonth = trackedEvents.filter((trackedEvent) => {
            if (trackedEvent.status !== 'attended' || !trackedEvent.event) {
                return false;
            }

            const eventDate = getEventOccurrenceDate(trackedEvent.event);
            if (eventDate < monthStart || eventDate >= nextMonthStart) {
                return false;
            }

            return getMatchedTargetSkillsForEvent(
                trackedEvent.event,
                targetSkills,
                getEventMatchedSkills,
            ).length > 0;
        }).length;

        monthlyEvents.push(eventsInMonth);
    }

    let currentStreak = 0;
    for (const count of monthlyEvents) {
        if (count > 0) {
            currentStreak += 1;
        } else {
            break;
        }
    }

    const thisMonthEvents = monthlyEvents[0] ?? 0;
    const lastMonthEvents = monthlyEvents[1] ?? 0;

    let trend: StreakTrend = 'stable';
    if (thisMonthEvents > lastMonthEvents) {
        trend = 'improving';
    } else if (thisMonthEvents < lastMonthEvents && lastMonthEvents > 0) {
        trend = 'declining';
    }

    return {
        currentStreak,
        trend,
        lastMonthEvents,
        thisMonthEvents,
    };
}

export function buildLearningPathOverview(params: {
    targetSkills: string[];
    recentCoveredSkills: string[];
    allTimeCoveredSkills: string[];
    upcomingEvents: Event[];
    getEventMatchedSkills: (event: Event) => string[];
    getEventAlignment: (event: Event) => EventAlignment;
}): {
    progress: LearningPathProgress;
    skillPlans: LearningPathSkillPlan[];
} {
    const {
        targetSkills,
        recentCoveredSkills,
        allTimeCoveredSkills,
        upcomingEvents,
        getEventMatchedSkills,
        getEventAlignment,
    } = params;

    const recentCoveredSet = new Set<string>();
    recentCoveredSkills.forEach((skill) => {
        const matchedTarget = matchSkillToTarget(skill, targetSkills);
        if (matchedTarget) {
            recentCoveredSet.add(matchedTarget);
        }
    });

    const allTimeCoveredSet = new Set<string>();
    allTimeCoveredSkills.forEach((skill) => {
        const matchedTarget = matchSkillToTarget(skill, targetSkills);
        if (matchedTarget) {
            allTimeCoveredSet.add(matchedTarget);
        }
    });

    const opportunitiesBySkill = new Map<string, RankedLearningPathEvent[]>();
    targetSkills.forEach((skill) => {
        opportunitiesBySkill.set(skill, []);
    });

    upcomingEvents.forEach((event) => {
        const alignment = getEventAlignment(event);
        const rankedEvent: RankedLearningPathEvent = {
            event,
            score: alignment.score,
            reason: alignment.reason,
            isPreferred: alignment.score >= RECOMMENDATION_THRESHOLDS.RECOMMENDED,
            eventTime: getEventOccurrenceDate(event).getTime(),
        };

        const matchedTargets = getMatchedTargetSkillsForEvent(event, targetSkills, getEventMatchedSkills);
        matchedTargets.forEach((skill) => {
            opportunitiesBySkill.get(skill)?.push(rankedEvent);
        });
    });

    opportunitiesBySkill.forEach((events, skill) => {
        const deduped = new Map<string, RankedLearningPathEvent>();
        events.forEach((event) => {
            const existing = deduped.get(event.event.id);
            if (!existing) {
                deduped.set(event.event.id, event);
                return;
            }

            const isBetterCandidate =
                Number(event.isPreferred) > Number(existing.isPreferred) ||
                (event.isPreferred === existing.isPreferred && event.score > existing.score) ||
                (
                    event.isPreferred === existing.isPreferred &&
                    event.score === existing.score &&
                    event.eventTime < existing.eventTime
                );

            if (isBetterCandidate) {
                deduped.set(event.event.id, event);
            }
        });

        opportunitiesBySkill.set(
            skill,
            Array.from(deduped.values()).sort((a, b) => {
                if (Number(b.isPreferred) !== Number(a.isPreferred)) {
                    return Number(b.isPreferred) - Number(a.isPreferred);
                }

                if (b.score !== a.score) {
                    return b.score - a.score;
                }

                return a.eventTime - b.eventTime;
            }),
        );
    });

    const skillPlans = targetSkills.map((skill) => {
        const rankedEvents = opportunitiesBySkill.get(skill) ?? [];
        const topCandidate = rankedEvents[0];
        const alternativeEvents = rankedEvents
            .slice(1, 3)
            .map((candidate) => candidate.event);
        const candidateEvents = rankedEvents.map((candidate) => ({
            event: candidate.event,
            score: candidate.score,
            reason: candidate.reason,
        }));
        const state: LearningPathSkillState = recentCoveredSet.has(skill)
            ? 'completed'
            : topCandidate
                ? 'recommended'
                : 'no_matches';
        const baseActions = createBaseActions({
            skill,
            state,
            topEvent: topCandidate?.event,
        });

        return {
            skill,
            practicedRecently: recentCoveredSet.has(skill),
            coveredAllTime: allTimeCoveredSet.has(skill),
            matchingUpcomingCount: rankedEvents.length,
            candidateEvents,
            topEvent: topCandidate?.event,
            topEventScore: topCandidate?.score,
            alternativeEvents,
            state,
            primaryAction: baseActions.primaryAction,
            secondaryActions: baseActions.secondaryActions,
            priority: getSkillStatePriority(state),
            matchReason: topCandidate?.reason ?? (topCandidate ? `Best match for ${skill}` : undefined),
            requiresAttention: baseActions.requiresAttention,
        };
    });

    return {
        progress: {
            covered: recentCoveredSet.size,
            total: targetSkills.length,
            percent: targetSkills.length > 0
                ? Math.round((recentCoveredSet.size / targetSkills.length) * 100)
                : 0,
        },
        skillPlans,
    };
}

export function buildLearningPathQueue(
    skillPlans: LearningPathSkillPlan[],
    limit: number = 3,
): LearningPathQueueItem[] {
    return skillPlans
        .slice()
        .sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }

            const aTime = a.topEvent ? getEventOccurrenceDate(a.topEvent).getTime() : Number.POSITIVE_INFINITY;
            const bTime = b.topEvent ? getEventOccurrenceDate(b.topEvent).getTime() : Number.POSITIVE_INFINITY;
            if (aTime !== bTime) {
                return aTime - bTime;
            }

            return a.skill.localeCompare(b.skill);
        })
        .slice(0, limit)
        .map((skillPlan) => ({
            skill: skillPlan.skill,
            state: skillPlan.state,
            event: skillPlan.topEvent,
            primaryAction: skillPlan.primaryAction,
            secondaryActions: skillPlan.secondaryActions,
            priority: skillPlan.priority,
            matchReason: skillPlan.matchReason,
            topEventScore: skillPlan.topEventScore,
        }));
}
