import { describe, expect, it } from 'vitest';
import type { Event } from '@/types';
import {
    buildLearningPathOverview,
    buildLearningPathQueue,
    calculateLearningPathStreak,
    type LearningPathSkillPlan,
} from './learningPath';

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

describe('learningPath utilities', () => {
    it('prefers recommended-threshold matches over lower-scoring earlier matches', () => {
        const postgresHighFit = createEvent({
            id: 'postgres-high',
            title: 'Postgres Masterclass',
            startTime: '2026-03-20T18:00:00.000Z',
            endTime: '2026-03-20T20:00:00.000Z',
        });
        const postgresLowFit = createEvent({
            id: 'postgres-low',
            title: 'General Data Meetup',
            startTime: '2026-03-12T18:00:00.000Z',
            endTime: '2026-03-12T20:00:00.000Z',
        });

        const matchedSkillsByEventId = new Map<string, string[]>([
            [postgresHighFit.id, ['PostgreSQL']],
            [postgresLowFit.id, ['PostgreSQL']],
        ]);

        const learningPath = buildLearningPathOverview({
            targetSkills: ['PostgreSQL'],
            recentCoveredSkills: [],
            allTimeCoveredSkills: [],
            upcomingEvents: [postgresLowFit, postgresHighFit],
            getEventMatchedSkills: (event) => matchedSkillsByEventId.get(event.id) ?? [],
            getEventAlignment: (event) => ({
                score: event.id === 'postgres-high' ? 84 : 41,
                computed: true,
                reason: event.id === 'postgres-high' ? 'Strong PostgreSQL match' : 'Weak PostgreSQL match',
            }),
        });

        expect(learningPath.skillPlans[0]).toMatchObject({
            skill: 'PostgreSQL',
            state: 'recommended',
            topEvent: { id: 'postgres-high' },
            matchingUpcomingCount: 2,
            alternativeEvents: [{ id: 'postgres-low' }],
            matchReason: 'Strong PostgreSQL match',
        });
    });

    it('keeps no-match skills actionable with fallback actions', () => {
        const learningPath = buildLearningPathOverview({
            targetSkills: ['Python'],
            recentCoveredSkills: [],
            allTimeCoveredSkills: [],
            upcomingEvents: [],
            getEventMatchedSkills: () => [],
            getEventAlignment: () => ({ score: 0, computed: true }),
        });

        expect(learningPath.skillPlans[0]).toMatchObject({
            skill: 'Python',
            state: 'no_matches',
            matchingUpcomingCount: 0,
            primaryAction: { type: 'find_events', label: 'Find events' },
            secondaryActions: [{ type: 'edit_skills', label: 'Edit skills' }],
        });
    });

    it('prioritizes queue items using the learning-path state order', () => {
        const plans: LearningPathSkillPlan[] = [
            {
                skill: 'Python',
                practicedRecently: false,
                coveredAllTime: false,
                matchingUpcomingCount: 0,
                candidateEvents: [],
                alternativeEvents: [],
                state: 'recommended',
                primaryAction: { type: 'rsvp', label: 'RSVP', skill: 'Python', variant: 'primary' },
                secondaryActions: [],
                priority: 3,
                requiresAttention: true,
            },
            {
                skill: 'PostgreSQL',
                practicedRecently: false,
                coveredAllTime: false,
                matchingUpcomingCount: 0,
                candidateEvents: [],
                alternativeEvents: [],
                state: 'saved',
                primaryAction: { type: 'rsvp', label: 'RSVP', skill: 'PostgreSQL', variant: 'primary' },
                secondaryActions: [],
                priority: 2,
                requiresAttention: true,
            },
            {
                skill: 'Pandas',
                practicedRecently: false,
                coveredAllTime: false,
                matchingUpcomingCount: 0,
                candidateEvents: [],
                alternativeEvents: [],
                state: 'needs_confirmation',
                primaryAction: { type: 'confirm_attended', label: 'Attended', skill: 'Pandas', variant: 'primary' },
                secondaryActions: [{ type: 'confirm_missed', label: 'Missed', skill: 'Pandas', variant: 'secondary' }],
                priority: 1,
                requiresAttention: true,
            },
        ];

        const queueItems = buildLearningPathQueue(plans, 3);

        expect(queueItems.map((item) => item.skill)).toEqual(['Pandas', 'PostgreSQL', 'Python']);
    });

    it('counts streaks only from events that match target skills', () => {
        const currentMonthNetworking = createEvent({
            id: 'networking-event',
            title: 'Tech Networking Night',
            startTime: '2026-03-03T18:00:00.000Z',
            endTime: '2026-03-03T20:00:00.000Z',
        });
        const lastMonthPython = createEvent({
            id: 'python-event',
            title: 'Python Workshop',
            startTime: '2026-02-10T18:00:00.000Z',
            endTime: '2026-02-10T20:00:00.000Z',
        });

        const matchedSkillsByEventId = new Map<string, string[]>([
            [currentMonthNetworking.id, ['Leadership']],
            [lastMonthPython.id, ['Python']],
        ]);

        const streak = calculateLearningPathStreak({
            trackedEvents: [
                {
                    trackingId: 'track-networking',
                    userId: 'user-1',
                    eventId: currentMonthNetworking.id,
                    status: 'attended',
                    notes: null,
                    trackedAt: currentMonthNetworking.startTime,
                    isBookmarked: true,
                    bookmarkedAt: currentMonthNetworking.startTime,
                    event: currentMonthNetworking,
                },
                {
                    trackingId: 'track-python',
                    userId: 'user-1',
                    eventId: lastMonthPython.id,
                    status: 'attended',
                    notes: null,
                    trackedAt: lastMonthPython.startTime,
                    isBookmarked: true,
                    bookmarkedAt: lastMonthPython.startTime,
                    event: lastMonthPython,
                },
            ],
            targetSkills: ['Python'],
            getEventMatchedSkills: (event) => matchedSkillsByEventId.get(event.id) ?? [],
        });

        expect(streak.thisMonthEvents).toBe(0);
        expect(streak.lastMonthEvents).toBe(1);
        expect(streak.currentStreak).toBe(0);
        expect(streak.trend).toBe('declining');
    });
});
