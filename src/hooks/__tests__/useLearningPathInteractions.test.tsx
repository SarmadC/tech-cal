import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Event, TrackedEventRecord } from '@/types';
import type { LearningPathSkillPlan } from '@/utils/learningPath';
import { useLearningPathInteractions } from '../useLearningPathInteractions';

const mocks = vi.hoisted(() => ({
    routerPush: vi.fn(),
    isBookmarked: vi.fn(),
    getAttendanceStatus: vi.fn(),
    toggleBookmark: vi.fn(),
    setAttendanceStatus: vi.fn(),
    markAttended: vi.fn(),
    markNotAttended: vi.fn(),
    trackInteraction: vi.fn(),
    trackRecommendationDisplay: vi.fn(),
    sendTelemetryEvent: vi.fn(),
    trackedEvents: [] as TrackedEventRecord[],
    pendingEvents: [] as TrackedEventRecord[],
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mocks.routerPush,
    }),
}));

vi.mock('@/hooks/useEventEngagement', () => ({
    useEventEngagement: () => ({
        trackedEvents: mocks.trackedEvents,
        isLoading: false,
        isBookmarked: mocks.isBookmarked,
        getAttendanceStatus: mocks.getAttendanceStatus,
        toggleBookmark: mocks.toggleBookmark,
        setAttendanceStatus: mocks.setAttendanceStatus,
    }),
}));

vi.mock('@/hooks/usePastEventAttendancePrompt', () => ({
    usePastEventAttendancePrompt: () => ({
        pendingEvents: mocks.pendingEvents,
        markAttended: mocks.markAttended,
        markNotAttended: mocks.markNotAttended,
    }),
}));

vi.mock('@/hooks/useRecommendationTracking', () => ({
    useRecommendationTracking: () => ({
        trackInteraction: mocks.trackInteraction,
        trackRecommendationDisplay: mocks.trackRecommendationDisplay,
    }),
}));

vi.mock('@/utils/telemetryClient', () => ({
    sendTelemetryEvent: mocks.sendTelemetryEvent,
}));

function createEvent(overrides: Partial<Event> = {}): Event {
    return {
        id: 'event-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        title: 'Sample Event',
        description: 'Sample description',
        organizer: 'Tech Calendar',
        location: 'Online',
        status: 'published',
        startTime: '2026-03-10T18:00:00.000Z',
        endTime: '2026-03-10T20:00:00.000Z',
        sourceUrl: 'https://example.com/event',
        livestreamUrl: null,
        eventTypeId: 'conference',
        ...overrides,
    };
}

function createTrackedEvent(
    event: Event,
    overrides: Partial<TrackedEventRecord> = {},
): TrackedEventRecord {
    return {
        trackingId: `track-${event.id}`,
        userId: 'user-1',
        eventId: event.id,
        status: null,
        notes: null,
        trackedAt: event.startTime,
        isBookmarked: true,
        bookmarkedAt: event.startTime,
        event,
        ...overrides,
    };
}

function createSkillPlan(overrides: Partial<LearningPathSkillPlan> = {}): LearningPathSkillPlan {
    const topEvent = overrides.topEvent;

    return {
        skill: 'PostgreSQL',
        practicedRecently: false,
        coveredAllTime: false,
        matchingUpcomingCount: topEvent ? 1 : 0,
        candidateEvents: topEvent ? [{ event: topEvent, score: 82, reason: 'Strong PostgreSQL match' }] : [],
        topEvent,
        topEventScore: topEvent ? 82 : undefined,
        alternativeEvents: [],
        state: topEvent ? 'recommended' : 'no_matches',
        primaryAction: {
            type: topEvent ? 'rsvp' : 'find_events',
            label: topEvent ? 'RSVP' : 'Find events',
            skill: 'PostgreSQL',
            event: topEvent,
            variant: 'primary',
        },
        secondaryActions: topEvent
            ? [{ type: 'save', label: 'Save', skill: 'PostgreSQL', event: topEvent, variant: 'secondary' }]
            : [{ type: 'edit_skills', label: 'Edit skills', skill: 'PostgreSQL', variant: 'secondary' }],
        priority: topEvent ? 3 : 6,
        matchReason: topEvent ? 'Strong PostgreSQL match' : undefined,
        requiresAttention: Boolean(topEvent),
        ...overrides,
    };
}

describe('useLearningPathInteractions', () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.trackedEvents = [];
        mocks.pendingEvents = [];
        mocks.isBookmarked.mockReturnValue(false);
        mocks.getAttendanceStatus.mockReturnValue(null);
        mocks.toggleBookmark.mockResolvedValue(undefined);
        mocks.setAttendanceStatus.mockResolvedValue(undefined);
        mocks.markAttended.mockResolvedValue(undefined);
        mocks.markNotAttended.mockResolvedValue(undefined);
        mocks.trackInteraction.mockResolvedValue(undefined);
        mocks.trackRecommendationDisplay.mockResolvedValue(undefined);
    });

    it('promotes bookmarked future events into saved state and prioritizes them in the queue', async () => {
        const savedEvent = createEvent({ id: 'saved-event', title: 'PostgreSQL Summit' });
        const trackedEvent = createTrackedEvent(savedEvent);
        mocks.trackedEvents = [trackedEvent];
        mocks.isBookmarked.mockImplementation((eventId: string) => eventId === savedEvent.id);

        const { result } = renderHook(() => useLearningPathInteractions({
            skillPlans: [createSkillPlan({ topEvent: savedEvent })],
            trackedEvents: [trackedEvent],
            getEventMatchedSkills: () => ['PostgreSQL'],
            getEventAlignment: () => ({ score: 82, computed: true, reason: 'Strong PostgreSQL match' }),
            detailsMode: 'page',
        }), { wrapper });

        await waitFor(() => {
            expect(result.current.skillPlans[0].state).toBe('saved');
        });

        expect(result.current.skillPlans[0].primaryAction.type).toBe('rsvp');
        expect(result.current.queueItems[0].state).toBe('saved');
    });

    it('uses pending attendance confirmation before any future opportunity', async () => {
        const pendingEvent = createEvent({
            id: 'pending-event',
            title: 'Past PostgreSQL Meetup',
            startTime: '2026-02-01T18:00:00.000Z',
            endTime: '2026-02-01T20:00:00.000Z',
        });
        const pendingRecord = createTrackedEvent(pendingEvent);
        mocks.pendingEvents = [pendingRecord];

        const { result } = renderHook(() => useLearningPathInteractions({
            skillPlans: [createSkillPlan()],
            trackedEvents: [pendingRecord],
            getEventMatchedSkills: () => ['PostgreSQL'],
            getEventAlignment: () => ({ score: 60, computed: true, reason: 'PostgreSQL match' }),
            detailsMode: 'page',
        }), { wrapper });

        await waitFor(() => {
            expect(result.current.skillPlans[0].state).toBe('needs_confirmation');
        });

        expect(result.current.skillPlans[0].primaryAction.label).toBe('Attended');
        expect(result.current.skillPlans[0].secondaryActions[0].label).toBe('Missed');
    });

    it('handles RSVP and save actions through the engagement API', async () => {
        const event = createEvent({ id: 'action-event', title: 'PostgreSQL Camp' });
        const { result } = renderHook(() => useLearningPathInteractions({
            skillPlans: [createSkillPlan({ topEvent: event })],
            trackedEvents: [],
            getEventMatchedSkills: () => ['PostgreSQL'],
            getEventAlignment: () => ({ score: 88, computed: true, reason: 'Strong PostgreSQL match' }),
            detailsMode: 'page',
        }), { wrapper });

        await act(async () => {
            await result.current.handleAction(result.current.skillPlans[0].primaryAction, {
                skill: 'PostgreSQL',
                slot: 'tile',
            });
        });

        expect(mocks.setAttendanceStatus).toHaveBeenCalledWith(
            event.id,
            'attending',
            undefined,
            expect.objectContaining({ id: event.id }),
        );

        await act(async () => {
            const saveAction = result.current.skillPlans[0].secondaryActions.find((action) => action.type === 'save');
            if (!saveAction) {
                throw new Error('Missing save action');
            }

            await result.current.handleAction(saveAction, {
                skill: 'PostgreSQL',
                slot: 'tile',
            });
        });

        expect(mocks.toggleBookmark).toHaveBeenCalledWith(
            event.id,
            expect.objectContaining({ id: event.id }),
        );
    });

    it('routes no-match fallback actions to calendar search', async () => {
        const { result } = renderHook(() => useLearningPathInteractions({
            skillPlans: [createSkillPlan({ topEvent: undefined, candidateEvents: [], matchingUpcomingCount: 0, state: 'no_matches' })],
            trackedEvents: [],
            getEventMatchedSkills: () => [],
            getEventAlignment: () => ({ score: 0, computed: true }),
            detailsMode: 'page',
        }), { wrapper });

        await act(async () => {
            await result.current.handleAction(result.current.skillPlans[0].primaryAction, {
                skill: 'PostgreSQL',
                slot: 'tile',
            });
        });

        expect(mocks.routerPush).toHaveBeenCalledWith('/calendar?searchTerm=PostgreSQL&view=month');
    });
});
