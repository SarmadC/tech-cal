'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { Event, TrackedEventRecord } from '@/types';
import { RECOMMENDATION_THRESHOLDS } from '@/config/recommendationThresholds';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { usePastEventAttendancePrompt } from '@/hooks/usePastEventAttendancePrompt';
import { useRecommendationTracking } from '@/hooks/useRecommendationTracking';
import { NavigationUtils } from '@/utils/navigationUtils';
import {
    buildLearningPathQueue,
    getMatchedTargetSkillsForEvent,
    type LearningPathAction,
    type LearningPathActionType,
    type LearningPathQueueItem,
    type LearningPathSkillPlan,
    type LearningPathSkillState,
} from '@/utils/learningPath';
import { sendTelemetryEvent } from '@/utils/telemetryClient';

type ActionSlot = 'tile' | 'queue' | 'alternate';

interface UseLearningPathInteractionsOptions {
    skillPlans: LearningPathSkillPlan[];
    trackedEvents: TrackedEventRecord[];
    getEventMatchedSkills: (event: Event) => string[];
    getEventAlignment: (event: Event) => {
        score: number;
        computed: boolean;
        reason?: string;
    };
    onOpenEvent?: (event: Event) => void;
    detailsMode?: 'sidebar' | 'page';
}

interface RankedEventCandidate {
    event: Event;
    score: number;
    reason?: string;
    isPreferred: boolean;
    eventTime: number;
}

interface LearningPathActionContext {
    skill: string;
    slot: ActionSlot;
}

interface UseLearningPathInteractionsResult {
    expandedSkill: string | null;
    setExpandedSkill: (skill: string | null) => void;
    isActionPending: (eventId: string | undefined, actionType: LearningPathActionType, skill?: string) => boolean;
    handleAction: (action: LearningPathAction, context: LearningPathActionContext) => Promise<void>;
    getSkillEngagementState: (skillPlan: LearningPathSkillPlan) => LearningPathSkillPlan;
    skillPlans: LearningPathSkillPlan[];
    queueItems: LearningPathQueueItem[];
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
    variant: 'primary' | 'secondary' = 'primary',
): LearningPathAction {
    return {
        type,
        label,
        skill,
        event,
        variant,
    };
}

function sortCandidates(a: RankedEventCandidate, b: RankedEventCandidate): number {
    if (Number(b.isPreferred) !== Number(a.isPreferred)) {
        return Number(b.isPreferred) - Number(a.isPreferred);
    }

    if (b.score !== a.score) {
        return b.score - a.score;
    }

    return a.eventTime - b.eventTime;
}

function getPendingKey(eventId: string | undefined, actionType: LearningPathActionType, skill?: string): string {
    return `${eventId ?? skill ?? 'global'}:${actionType}`;
}

export function useLearningPathInteractions({
    skillPlans,
    trackedEvents,
    getEventMatchedSkills,
    getEventAlignment,
    onOpenEvent,
    detailsMode = 'page',
}: UseLearningPathInteractionsOptions): UseLearningPathInteractionsResult {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
    const [pendingActionKeys, setPendingActionKeys] = useState<Set<string>>(new Set());

    const {
        trackedEvents: liveTrackedEvents,
        isLoading: isEngagementLoading,
        isBookmarked,
        getAttendanceStatus,
        toggleBookmark,
        setAttendanceStatus,
    } = useEventEngagement();
    const {
        pendingEvents,
        markAttended,
        markNotAttended,
    } = usePastEventAttendancePrompt({ maxPrompts: 24 });
    const tracking = useRecommendationTracking({ enableTracking: true });

    const effectiveTrackedEvents = useMemo(() => {
        if (isEngagementLoading) {
            return trackedEvents;
        }

        return liveTrackedEvents;
    }, [isEngagementLoading, liveTrackedEvents, trackedEvents]);

    const openEvent = useCallback((event: Event) => {
        if (detailsMode === 'sidebar' && onOpenEvent) {
            onOpenEvent(event);
            return;
        }

        router.push(NavigationUtils.goToEvent(event.id, event.title));
    }, [detailsMode, onOpenEvent, router]);

    const enrichSkillPlan = useCallback((basePlan: LearningPathSkillPlan): LearningPathSkillPlan => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const pendingMatch = pendingEvents
            .filter((record) => record.event)
            .find((record) => {
                return getMatchedTargetSkillsForEvent(
                    record.event!,
                    [basePlan.skill],
                    getEventMatchedSkills,
                ).includes(basePlan.skill);
            });

        const trackedSkillEvents = effectiveTrackedEvents
            .filter((record) => {
                if (!record.event) {
                    return false;
                }

                return getMatchedTargetSkillsForEvent(
                    record.event,
                    [basePlan.skill],
                    getEventMatchedSkills,
                ).includes(basePlan.skill);
            });

        const trackedFutureCandidates = trackedSkillEvents
            .filter((record) => {
                if (!record.event) {
                    return false;
                }

                return getEventOccurrenceDate(record.event) >= now;
            })
            .map((record) => {
                const alignment = getEventAlignment(record.event!);
                return {
                    event: record.event!,
                    score: alignment.score,
                    reason: alignment.reason,
                    isPreferred: alignment.score >= RECOMMENDATION_THRESHOLDS.RECOMMENDED,
                    eventTime: getEventOccurrenceDate(record.event!).getTime(),
                };
            });

        const upcomingCandidates = [
            ...basePlan.candidateEvents.map((candidate) => ({
                event: candidate.event,
                score: candidate.score,
                reason: candidate.reason,
                isPreferred: candidate.score >= RECOMMENDATION_THRESHOLDS.RECOMMENDED,
                eventTime: getEventOccurrenceDate(candidate.event).getTime(),
            })),
            ...trackedFutureCandidates,
        ];

        const uniqueCandidates = new Map<string, RankedEventCandidate>();
        upcomingCandidates.forEach((candidate) => {
            const existing = uniqueCandidates.get(candidate.event.id);
            if (!existing || sortCandidates(candidate, existing) < 0) {
                uniqueCandidates.set(candidate.event.id, candidate);
            }
        });

        const rankedCandidates = Array.from(uniqueCandidates.values()).sort(sortCandidates);

        const attendingCandidate = rankedCandidates.find((candidate) =>
            getAttendanceStatus(candidate.event.id) === 'attending'
        );
        const savedCandidate = rankedCandidates.find((candidate) =>
            getAttendanceStatus(candidate.event.id) == null && isBookmarked(candidate.event.id)
        );
        const recommendedCandidate = rankedCandidates[0];

        const attendedThisMonth = trackedSkillEvents
            .filter((record) => record.event && record.status === 'attended')
            .sort((a, b) => getEventOccurrenceDate(b.event!).getTime() - getEventOccurrenceDate(a.event!).getTime())
            .find((record) => {
                return getEventOccurrenceDate(record.event!) >= monthStart;
            });

        let state: LearningPathSkillState;
        let topEvent: Event | undefined;
        let topEventScore: number | undefined;
        let matchReason: string | undefined;
        let primaryAction: LearningPathAction;
        let secondaryActions: LearningPathAction[];
        let requiresAttention = false;

        if (pendingMatch?.event) {
            state = 'needs_confirmation';
            topEvent = pendingMatch.event;
            topEventScore = getEventAlignment(topEvent).score;
            matchReason = `Confirm whether you attended this ${basePlan.skill} event`;
            primaryAction = createAction(basePlan.skill, 'confirm_attended', 'Attended', topEvent);
            secondaryActions = [
                createAction(basePlan.skill, 'confirm_missed', 'Missed', topEvent, 'secondary'),
            ];
            requiresAttention = true;
        } else if (attendingCandidate) {
            state = 'attending';
            topEvent = attendingCandidate.event;
            topEventScore = attendingCandidate.score;
            matchReason = attendingCandidate.reason ?? `You are already attending a ${basePlan.skill} match`;
            primaryAction = createAction(basePlan.skill, 'view', 'View', topEvent);
            secondaryActions = [
                createAction(basePlan.skill, 'find_events', 'Change event', topEvent, 'secondary'),
            ];
        } else if (savedCandidate) {
            state = 'saved';
            topEvent = savedCandidate.event;
            topEventScore = savedCandidate.score;
            matchReason = savedCandidate.reason ?? `Saved for ${basePlan.skill} but not RSVP’d yet`;
            primaryAction = createAction(basePlan.skill, 'rsvp', 'RSVP', topEvent);
            secondaryActions = [
                createAction(basePlan.skill, 'details', 'Details', topEvent, 'secondary'),
            ];
            requiresAttention = true;
        } else if (recommendedCandidate) {
            state = 'recommended';
            topEvent = recommendedCandidate.event;
            topEventScore = recommendedCandidate.score;
            matchReason = recommendedCandidate.reason ?? `Best match for ${basePlan.skill}`;
            primaryAction = createAction(basePlan.skill, 'rsvp', 'RSVP', topEvent);
            secondaryActions = [
                createAction(basePlan.skill, 'save', 'Save', topEvent, 'secondary'),
                createAction(basePlan.skill, 'details', 'Details', topEvent, 'secondary'),
            ];
            requiresAttention = true;
        } else if (attendedThisMonth?.event) {
            state = 'completed';
            topEvent = attendedThisMonth.event;
            topEventScore = getEventAlignment(topEvent).score;
            matchReason = `You practiced ${basePlan.skill} this month`;
            primaryAction = createAction(basePlan.skill, 'add_notes', 'Add notes', topEvent);
            secondaryActions = [
                createAction(basePlan.skill, 'view', 'View recap', topEvent, 'secondary'),
            ];
        } else {
            state = 'no_matches';
            topEvent = undefined;
            topEventScore = undefined;
            matchReason = undefined;
            primaryAction = createAction(basePlan.skill, 'find_events', 'Find events');
            secondaryActions = [
                createAction(basePlan.skill, 'edit_skills', 'Edit skills', undefined, 'secondary'),
            ];
        }

        const alternativeEvents = rankedCandidates
            .filter((candidate) => candidate.event.id !== topEvent?.id)
            .slice(0, 2)
            .map((candidate) => candidate.event);

        return {
            ...basePlan,
            topEvent,
            topEventScore,
            alternativeEvents,
            state,
            primaryAction,
            secondaryActions,
            priority: getSkillStatePriority(state),
            matchReason,
            requiresAttention,
        };
    }, [
        effectiveTrackedEvents,
        getAttendanceStatus,
        getEventAlignment,
        getEventMatchedSkills,
        isBookmarked,
        pendingEvents,
    ]);

    const enrichedSkillPlans = useMemo(() => {
        return skillPlans.map((skillPlan) => enrichSkillPlan(skillPlan));
    }, [enrichSkillPlan, skillPlans]);

    const skillPlanMap = useMemo(() => {
        return new Map(enrichedSkillPlans.map((skillPlan) => [skillPlan.skill, skillPlan]));
    }, [enrichedSkillPlans]);

    const queueItems = useMemo(() => {
        return buildLearningPathQueue(enrichedSkillPlans);
    }, [enrichedSkillPlans]);

    useEffect(() => {
        const queueRecommendations = queueItems
            .filter((item) => item.event)
            .map((item, position) => ({
                eventId: item.event!.id,
                score: item.topEventScore ?? 0,
                position: position + 1,
            }));

        if (queueRecommendations.length > 0) {
            void tracking.trackRecommendationDisplay('learning_path', queueRecommendations);
        }
    }, [queueItems, tracking]);

    useEffect(() => {
        if (!expandedSkill) {
            return;
        }

        const activeSkillPlan = skillPlanMap.get(expandedSkill);
        if (!activeSkillPlan?.topEvent) {
            return;
        }

        void tracking.trackInteraction(
            activeSkillPlan.topEvent.id,
            'view',
            'learning_path',
            1,
            {
                skill: activeSkillPlan.skill,
                surface: 'dashboard_learning_path',
                slot: 'tile_primary',
                state: activeSkillPlan.state,
                eventState: getAttendanceStatus(activeSkillPlan.topEvent.id) ?? (isBookmarked(activeSkillPlan.topEvent.id) ? 'saved' : 'recommended'),
            },
        );

        activeSkillPlan.alternativeEvents.forEach((event, index) => {
            void tracking.trackInteraction(
                event.id,
                'view',
                'learning_path',
                index + 2,
                {
                    skill: activeSkillPlan.skill,
                    surface: 'dashboard_learning_path',
                    slot: 'alternate',
                    state: activeSkillPlan.state,
                    eventState: getAttendanceStatus(event.id) ?? (isBookmarked(event.id) ? 'saved' : 'recommended'),
                },
            );
        });
    }, [expandedSkill, getAttendanceStatus, isBookmarked, skillPlanMap, tracking]);

    const isActionPending = useCallback((
        eventId: string | undefined,
        actionType: LearningPathActionType,
        skill?: string,
    ) => {
        return pendingActionKeys.has(getPendingKey(eventId, actionType, skill));
    }, [pendingActionKeys]);

    const handleAction = useCallback(async (
        action: LearningPathAction,
        context: LearningPathActionContext,
    ) => {
        const pendingKey = getPendingKey(action.event?.id, action.type, action.skill);
        const currentSkillPlan = skillPlanMap.get(context.skill);
        const slotLabel = context.slot === 'alternate'
            ? 'alternate'
            : `${context.slot}_${action.variant}`;

        const emitNavigationTelemetry = () => {
            void sendTelemetryEvent({
                eventType: 'learning_path_action',
                context: {
                    surface: 'dashboard_learning_path',
                    slot: slotLabel,
                },
                metadata: {
                    actionType: action.type,
                    skill: context.skill,
                    state: currentSkillPlan?.state ?? null,
                    eventId: action.event?.id ?? null,
                },
            });
        };

        if (pendingActionKeys.has(pendingKey)) {
            return;
        }

        const trackAction = async (interactionType: 'click' | 'bookmark' | 'attend') => {
            if (!action.event) {
                emitNavigationTelemetry();
                return;
            }

            await tracking.trackInteraction(
                action.event.id,
                interactionType,
                'learning_path',
                undefined,
                {
                    skill: context.skill,
                    surface: 'dashboard_learning_path',
                    slot: slotLabel,
                    state: currentSkillPlan?.state ?? null,
                    eventState: getAttendanceStatus(action.event.id) ?? (isBookmarked(action.event.id) ? 'saved' : 'recommended'),
                },
            );
        };

        const withPending = async (callback: () => Promise<void>) => {
            setPendingActionKeys((previous) => {
                const next = new Set(previous);
                next.add(pendingKey);
                return next;
            });

            try {
                await callback();
            } finally {
                setPendingActionKeys((previous) => {
                    const next = new Set(previous);
                    next.delete(pendingKey);
                    return next;
                });
            }
        };

        try {
            switch (action.type) {
                case 'rsvp':
                    await withPending(async () => {
                        if (!action.event) {
                            return;
                        }

                        await setAttendanceStatus(action.event.id, 'attending', undefined, action.event as unknown as Record<string, unknown>);
                        await queryClient.invalidateQueries({ queryKey: ['dashboardTrackedEvents'] });
                        await trackAction('attend');
                    });
                    return;
                case 'save':
                    await withPending(async () => {
                        if (!action.event) {
                            return;
                        }

                        await toggleBookmark(action.event.id, action.event as unknown as Record<string, unknown>);
                        await queryClient.invalidateQueries({ queryKey: ['dashboardTrackedEvents'] });
                        await trackAction('bookmark');
                    });
                    return;
                case 'confirm_attended':
                    await withPending(async () => {
                        if (!action.event) {
                            return;
                        }

                        await markAttended(action.event.id);
                        await queryClient.invalidateQueries({ queryKey: ['dashboardTrackedEvents'] });
                        await trackAction('attend');
                    });
                    return;
                case 'confirm_missed':
                    await withPending(async () => {
                        if (!action.event) {
                            return;
                        }

                        await markNotAttended(action.event.id);
                        await queryClient.invalidateQueries({ queryKey: ['dashboardTrackedEvents'] });
                        await trackAction('attend');
                    });
                    return;
                case 'details':
                case 'view':
                case 'add_notes':
                    if (action.event) {
                        openEvent(action.event);
                    }
                    await trackAction('click');
                    return;
                case 'find_events':
                    router.push(NavigationUtils.goToCalendarSearch(action.skill));
                    emitNavigationTelemetry();
                    return;
                case 'edit_skills':
                    router.push(NavigationUtils.goToSettings());
                    emitNavigationTelemetry();
                    return;
                default:
                    return;
            }
        } catch {
            // Mutation errors are already surfaced by the underlying hooks.
        }
    }, [
        getAttendanceStatus,
        isBookmarked,
        markAttended,
        markNotAttended,
        openEvent,
        pendingActionKeys,
        queryClient,
        router,
        setAttendanceStatus,
        skillPlanMap,
        toggleBookmark,
        tracking,
    ]);

    const getSkillEngagementState = useCallback((skillPlan: LearningPathSkillPlan) => {
        return skillPlanMap.get(skillPlan.skill) ?? skillPlan;
    }, [skillPlanMap]);

    return {
        expandedSkill,
        setExpandedSkill,
        isActionPending,
        handleAction,
        getSkillEngagementState,
        skillPlans: enrichedSkillPlans,
        queueItems,
    };
}
