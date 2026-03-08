import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@/utils/test-utils';
import { CareerProgressCard } from './CareerProgressCard';
import type { CareerProfile, Event } from '@/types';

const mocks = vi.hoisted(() => ({
    useDashboardMetrics: vi.fn(),
    startTrial: vi.fn(),
    openUpgrade: vi.fn(),
}));

vi.mock('@/hooks/useDashboardMetrics', () => ({
    useDashboardMetrics: mocks.useDashboardMetrics,
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

const careerProfile: CareerProfile = {
    userId: 'user-1',
    profileId: 'career-profile-1',
    lastUpdated: '2026-03-01T00:00:00.000Z',
    currentRole: 'Software Engineer',
    seniority: 'mid-level',
    industry: 'Technology',
    companySize: 'medium',
    primarySkills: ['React'],
    skillsToLearn: ['TypeScript'],
    interests: [],
    careerGoals: ['skill-development', 'networking'],
    timeframe: 'short-term',
    learningStyle: ['hands-on'],
    availableTime: 'moderate',
    budget: 'moderate',
    networkingGoals: ['find-peers'],
    preferredEventTypes: ['workshop'],
};

function createEvent(overrides: Partial<Event> = {}): Event {
    return {
        id: 'event-1',
        createdAt: '2026-03-01T00:00:00.000Z',
        title: 'Sample Event',
        description: 'Sample description',
        organizer: 'Tech Calendar',
        location: 'Online',
        status: 'published',
        startTime: '2026-03-14T18:00:00.000Z',
        endTime: '2026-03-14T19:00:00.000Z',
        sourceUrl: 'https://example.com/event',
        livestreamUrl: null,
        eventTypeId: 'workshop',
        ...overrides,
    };
}

describe('CareerProgressCard', () => {
    beforeEach(() => {
        mocks.useDashboardMetrics.mockReturnValue({
            goalProgress: [
                {
                    goal: 'skill-development',
                    eventCount: 0,
                    impactTotal: 0,
                    progress: 0,
                    targetEventCount: 12,
                    upcomingMatchCount: 0,
                    matchedEvents: [],
                    suggestedAction: 'Add your first skill development event to your pipeline',
                },
                {
                    goal: 'networking',
                    eventCount: 0,
                    impactTotal: 0,
                    progress: 0,
                    targetEventCount: 10,
                    upcomingMatchCount: 1,
                    nextRecommendedEventTitle: 'Data Saturday Chicago 2026',
                    matchedEvents: [],
                    suggestedAction: 'Start this goal with "Data Saturday Chicago 2026"',
                },
            ],
        });
    });

    it('shows action-oriented zero states instead of 0% progress', () => {
        render(
            <CareerProgressCard
                trackedEvents={[]}
                upcomingEvents={[createEvent({ title: 'Data Saturday Chicago 2026' })]}
                careerProfile={careerProfile}
            />
        );

        expect(screen.getByText('Goal Progress')).toBeInTheDocument();
        expect(screen.getByText('1 Ready to Start')).toBeInTheDocument();
        expect(screen.getByText('recommended next')).toBeInTheDocument();
        expect(screen.getByText('1 strong upcoming match')).toBeInTheDocument();
        expect(screen.getByText('Start this goal with "Data Saturday Chicago 2026"')).toBeInTheDocument();
        expect(screen.queryByText('0%')).not.toBeInTheDocument();
        expect(screen.getByText('Target 12 events')).toBeInTheDocument();
    });
});
