import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@/utils/test-utils';
import { useCareerMetrics } from '@/hooks/useCareerMetrics';
import type { CareerProfile, Event, TrackedEventRecord } from '@/types';

const mocks = vi.hoisted(() => ({
    useAuth: vi.fn(),
    useEventFeedback: vi.fn(),
    getCareerProfileFromPreferences: vi.fn(),
    calculateEventAlignment: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: mocks.useAuth,
}));

vi.mock('@/hooks/useEventFeedback', () => ({
    useEventFeedback: mocks.useEventFeedback,
}));

vi.mock('@/services/careerProfileService', () => ({
    CareerProfileService: {
        getCareerProfileFromPreferences: mocks.getCareerProfileFromPreferences,
    },
}));

vi.mock('@/utils/uiScoringAdapter', () => ({
    calculateEventAlignment: mocks.calculateEventAlignment,
}));

function createEvent(overrides: Partial<Event> = {}): Event {
    return {
        id: 'event-1',
        createdAt: '2026-01-01T00:00:00.000Z',
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

function createTrackedEvent(overrides: Partial<TrackedEventRecord> = {}): TrackedEventRecord {
    const event = overrides.event === undefined ? createEvent({ id: `event-${overrides.trackingId ?? 'default'}` }) : overrides.event;

    return {
        trackingId: 'tracking-1',
        userId: 'user-1',
        eventId: event?.id ?? 'event-1',
        status: null,
        notes: null,
        trackedAt: '2026-03-01T09:00:00.000Z',
        isBookmarked: true,
        bookmarkedAt: '2026-03-01T09:00:00.000Z',
        event,
        ...overrides,
    };
}

const careerProfile: CareerProfile = {
    userId: 'user-1',
    profileId: 'career-profile-1',
    lastUpdated: '2026-03-01T00:00:00.000Z',
    currentRole: 'Software Engineer',
    seniority: 'mid-level',
    industry: 'Technology',
    companySize: 'medium',
    primarySkills: ['React'],
    skillsToLearn: ['TypeScript', 'PostgreSQL'],
    interests: [],
    careerGoals: ['skill-development', 'networking'],
    timeframe: 'short-term',
    learningStyle: ['hands-on'],
    availableTime: 'moderate',
    budget: 'moderate',
    networkingGoals: ['find-peers'],
    preferredEventTypes: ['workshop'],
};

describe('useCareerMetrics', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-07T12:00:00.000Z'));

        mocks.useAuth.mockReturnValue({
            profile: { id: 'user-1', preferences: {} },
        });
        mocks.getCareerProfileFromPreferences.mockReturnValue(careerProfile);
        mocks.useEventFeedback.mockReturnValue({
            data: {
                feedback: [],
                aggregates: {
                    totalFeedbackCount: 0,
                    averageRating: null,
                    totalSkillsGained: 0,
                    uniqueSkills: [],
                    totalConnectionsMade: 0,
                    recommendationRate: null,
                    predictionAccuracy: null,
                },
            },
        });
        mocks.calculateEventAlignment.mockImplementation((event: Event) => ({
            alignmentScore: event.id === 'pipeline-unscored' ? 0 : 67,
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('counts tracked upcoming events separately from scored pipeline events and exposes the next feedback task', () => {
        mocks.useEventFeedback.mockReturnValue({
            data: {
                feedback: [
                    {
                        id: 'feedback-1',
                        eventId: 'attended-rated',
                    },
                ],
                aggregates: {
                    totalFeedbackCount: 1,
                    averageRating: 4.2,
                    totalSkillsGained: 2,
                    uniqueSkills: ['TypeScript'],
                    totalConnectionsMade: 3,
                    recommendationRate: 100,
                    predictionAccuracy: 100,
                },
            },
        });

        const trackedEvents = [
            createTrackedEvent({
                trackingId: 'pipeline-high',
                event: createEvent({
                    id: 'pipeline-high',
                    title: 'High Fit Summit',
                    startTime: '2026-03-20T18:00:00.000Z',
                    endTime: '2026-03-20T20:00:00.000Z',
                    careerImpactLite: { overall: 82 },
                } as Event & { careerImpactLite: { overall: number } }),
            }),
            createTrackedEvent({
                trackingId: 'pipeline-unscored',
                status: 'attending',
                event: createEvent({
                    id: 'pipeline-unscored',
                    title: 'Unscored Networking Lunch',
                    startTime: '2026-03-25T18:00:00.000Z',
                    endTime: '2026-03-25T20:00:00.000Z',
                }),
            }),
            createTrackedEvent({
                trackingId: 'attended-recent',
                status: 'attended',
                trackedAt: '2026-03-04T09:00:00.000Z',
                event: createEvent({
                    id: 'attended-recent',
                    title: 'Recent Workshop',
                    startTime: '2026-03-05T18:00:00.000Z',
                    endTime: '2026-03-05T20:00:00.000Z',
                    careerImpactLite: { overall: 74 },
                } as Event & { careerImpactLite: { overall: number } }),
            }),
            createTrackedEvent({
                trackingId: 'attended-rated',
                status: 'attended',
                trackedAt: '2026-02-26T09:00:00.000Z',
                event: createEvent({
                    id: 'attended-rated',
                    title: 'Rated Meetup',
                    startTime: '2026-02-27T18:00:00.000Z',
                    endTime: '2026-02-27T20:00:00.000Z',
                    careerImpactLite: { overall: 68 },
                } as Event & { careerImpactLite: { overall: number } }),
            }),
        ];

        const { result } = renderHook(() => useCareerMetrics([], trackedEvents));

        expect(result.current.pipeline).toMatchObject({
            trackedUpcomingCount: 2,
            scoredUpcomingCount: 1,
            avgScore: 82,
            highFitCount: 1,
            highFitRatio: 50,
        });
        expect(result.current.pipeline.topEvents).toEqual([
            { eventId: 'pipeline-high', title: 'High Fit Summit', score: 82 },
        ]);
        expect(result.current.feedback).toMatchObject({
            feedbackCount: 1,
            averageRating: 4.2,
            recommendationRate: 100,
            unratedAttendedCount: 1,
        });
        expect(result.current.feedback.nextEventToRate?.id).toBe('attended-recent');
        expect(result.current.pipelineFit).toMatchObject({
            value: 82,
            highFitCount: 1,
            totalCount: 2,
        });
    });

    it('uses low-sample monthly attendance deltas and stage-specific 90-day funnel counts', () => {
        const trackedEvents = [
            createTrackedEvent({
                trackingId: 'saved-only',
                status: null,
                trackedAt: '2026-02-28T09:00:00.000Z',
                bookmarkedAt: '2026-02-28T09:00:00.000Z',
                event: createEvent({
                    id: 'saved-only',
                    title: 'Saved Event',
                    startTime: '2026-03-18T18:00:00.000Z',
                    endTime: '2026-03-18T20:00:00.000Z',
                }),
            }),
            createTrackedEvent({
                trackingId: 'rsvp-event',
                status: 'attending',
                trackedAt: '2026-03-03T09:00:00.000Z',
                event: createEvent({
                    id: 'rsvp-event',
                    title: 'RSVP Event',
                    startTime: '2026-03-22T18:00:00.000Z',
                    endTime: '2026-03-22T20:00:00.000Z',
                }),
            }),
            createTrackedEvent({
                trackingId: 'attended-recent',
                status: 'attended',
                trackedAt: '2026-03-05T09:00:00.000Z',
                event: createEvent({
                    id: 'attended-recent',
                    title: 'Attended Event',
                    startTime: '2026-03-06T18:00:00.000Z',
                    endTime: '2026-03-06T20:00:00.000Z',
                    careerImpactLite: { overall: 70 },
                } as Event & { careerImpactLite: { overall: number } }),
            }),
        ];

        const { result } = renderHook(() => useCareerMetrics([], trackedEvents));

        expect(result.current.attendance).toMatchObject({
            last30dCount: 1,
            previous30dCount: 0,
            deltaAbs: 1,
            deltaPct: null,
            isLowSample: true,
        });
        expect(result.current.attendance.trendData).toHaveLength(4);
        expect(result.current.funnel90d).toEqual({
            savedOnly: 1,
            rsvped: 1,
            attended: 1,
        });
    });
});
