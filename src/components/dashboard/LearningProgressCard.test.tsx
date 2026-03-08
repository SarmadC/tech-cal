import { screen } from '@/utils/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render } from '@/utils/test-utils';
import type { CareerProfile, Event } from '@/types';
import { LearningProgressCard } from './LearningProgressCard';

const mocks = vi.hoisted(() => ({
    setExpandedSkill: vi.fn(),
    handleAction: vi.fn(),
    startTrial: vi.fn(),
    openUpgrade: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
    default: () => () => null,
}));

vi.mock('@/hooks/useDashboardMetrics', () => ({
    useDashboardMetrics: () => ({
        skillsCoveredThisMonth: { uniqueSkills: [], canonicalMatches: 0 },
        allTimeSkillsCovered: { count: 0, skills: [] },
        getEventMatchedSkills: () => ['PostgreSQL'],
        getEventAlignment: () => ({ score: 88, computed: true, reason: 'Strong PostgreSQL match' }),
    }),
}));

vi.mock('@/hooks/useLearningPathInteractions', () => ({
    useLearningPathInteractions: () => ({
        expandedSkill: 'PostgreSQL',
        setExpandedSkill: mocks.setExpandedSkill,
        isActionPending: () => false,
        handleAction: mocks.handleAction,
        getSkillEngagementState: (skillPlan: unknown) => skillPlan,
        skillPlans: [{
            skill: 'PostgreSQL',
            practicedRecently: false,
            coveredAllTime: false,
            matchingUpcomingCount: 4,
            candidateEvents: [],
            topEvent: {
                id: 'postgres-event',
                title: 'Data Saturday Chicago 2026',
                startTime: '2026-03-14T18:00:00.000Z',
            },
            topEventScore: 88,
            alternativeEvents: [],
            state: 'recommended',
            primaryAction: {
                type: 'rsvp',
                label: 'RSVP',
                skill: 'PostgreSQL',
                event: {
                    id: 'postgres-event',
                    title: 'Data Saturday Chicago 2026',
                    startTime: '2026-03-14T18:00:00.000Z',
                },
                variant: 'primary',
            },
            secondaryActions: [
                {
                    type: 'save',
                    label: 'Save',
                    skill: 'PostgreSQL',
                    event: {
                        id: 'postgres-event',
                        title: 'Data Saturday Chicago 2026',
                        startTime: '2026-03-14T18:00:00.000Z',
                    },
                    variant: 'secondary',
                },
            ],
            priority: 3,
            matchReason: 'Strong PostgreSQL match',
            requiresAttention: true,
        }],
        queueItems: [{
            skill: 'PostgreSQL',
            state: 'recommended',
            event: {
                id: 'postgres-event',
                title: 'Data Saturday Chicago 2026',
                startTime: '2026-03-14T18:00:00.000Z',
            },
            primaryAction: {
                type: 'rsvp',
                label: 'RSVP',
                skill: 'PostgreSQL',
                event: {
                    id: 'postgres-event',
                    title: 'Data Saturday Chicago 2026',
                    startTime: '2026-03-14T18:00:00.000Z',
                },
                variant: 'primary',
            },
            secondaryActions: [{
                type: 'save',
                label: 'Save',
                skill: 'PostgreSQL',
                event: {
                    id: 'postgres-event',
                    title: 'Data Saturday Chicago 2026',
                    startTime: '2026-03-14T18:00:00.000Z',
                },
                variant: 'secondary',
            }],
            priority: 3,
            matchReason: 'Strong PostgreSQL match',
            topEventScore: 88,
        }],
    }),
}));

vi.mock('@/contexts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/contexts')>();
    return {
        ...actual,
        useSubscriptionContext: () => ({
            isPro: true,
            isTrialing: false,
            hasUsedTrial: false,
            startTrial: mocks.startTrial,
            openUpgrade: mocks.openUpgrade,
        }),
    };
});

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

const careerProfile: CareerProfile = {
    userId: 'user-1',
    profileId: 'career-profile-1',
    lastUpdated: '2026-03-01T00:00:00.000Z',
    currentRole: 'Software Engineer',
    seniority: 'mid-level',
    industry: 'Technology',
    companySize: 'medium',
    primarySkills: [],
    skillsToLearn: ['PostgreSQL'],
    interests: [],
    careerGoals: ['skill-development'],
    timeframe: 'short-term',
    learningStyle: ['hands-on'],
    availableTime: 'moderate',
    budget: 'moderate',
    networkingGoals: [],
    preferredEventTypes: ['workshop'],
};

describe('LearningProgressCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders inline RSVP actions for actionable skills', () => {
        render(
            <LearningProgressCard
                trackedEvents={[]}
                upcomingEvents={[createEvent({ id: 'postgres-event', title: 'Data Saturday Chicago 2026' })]}
                careerProfile={careerProfile}
                eventTypes={[]}
            />
        );

        expect(screen.getByText('Ready to book')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'RSVP' }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: 'Save' }).length).toBeGreaterThan(0);
        expect(screen.getByText('Next Actions')).toBeInTheDocument();
    });

    it('toggles the skill accordion through the interaction hook', async () => {
        const user = userEvent.setup();

        render(
            <LearningProgressCard
                trackedEvents={[]}
                upcomingEvents={[createEvent({ id: 'postgres-event', title: 'Data Saturday Chicago 2026' })]}
                careerProfile={careerProfile}
                eventTypes={[]}
            />
        );

        await user.click(screen.getByRole('button', { name: /PostgreSQL/i }));
        expect(mocks.setExpandedSkill).toHaveBeenCalled();
    });
});
