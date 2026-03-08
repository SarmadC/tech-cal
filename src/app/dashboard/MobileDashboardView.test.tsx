import { describe, expect, it, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/utils/test-utils';
import MobileDashboardView from './MobileDashboardView';
import type { AppProfile, CareerProfile, Event } from '@/types';

const mocks = vi.hoisted(() => ({
    useCareerMetrics: vi.fn(),
}));

vi.mock('@/hooks/useCareerMetrics', () => ({
    useCareerMetrics: mocks.useCareerMetrics,
}));

vi.mock('@/components/common/ErrorBoundary', () => ({
    SectionErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    PageErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/common/UnifiedMobileNavbar', () => ({
    default: () => <div data-testid="mobile-navbar" />,
}));

vi.mock('@/components/common/MobileBottomNav', () => ({
    default: () => <div data-testid="mobile-bottom-nav" />,
}));

vi.mock('@/components/calendar/mobile/CareerProfilePrompt', () => ({
    default: () => <div data-testid="career-profile-prompt">Career Profile Prompt</div>,
}));

vi.mock('@/components/calendar/mobile/MobileEventDetailPanel', () => ({
    default: ({ event, onClose }: { event: Event; onClose: () => void }) => (
        <div data-testid="mobile-event-detail-panel">
            <span>{event.title}</span>
            <button onClick={onClose}>Close</button>
        </div>
    ),
}));

vi.mock('./MobileTopRecommendationCard', () => ({
    MobileTopRecommendationCard: ({ onSelectEvent }: { onSelectEvent: (event: Event) => void }) => (
        <section data-testid="top-recommendation">
            <button
                onClick={() => onSelectEvent({
                    id: 'recommended-event',
                    createdAt: '2026-03-01T00:00:00.000Z',
                    title: 'Recommended Event',
                    description: 'Recommended',
                    organizer: 'Organizer',
                    location: 'Online',
                    status: 'published',
                    startTime: '2026-03-12T18:00:00.000Z',
                    endTime: '2026-03-12T19:00:00.000Z',
                    sourceUrl: 'https://example.com/recommended',
                    livestreamUrl: null,
                    eventTypeId: 'workshop',
                })}
            >
                Open Recommendation
            </button>
        </section>
    ),
}));

vi.mock('./MobileUpcomingEventsCard', () => ({
    MobileUpcomingEventsCard: ({ onSelectEvent }: { onSelectEvent: (event: Event) => void }) => (
        <section data-testid="upcoming-commitments">
            <button
                onClick={() => onSelectEvent({
                    id: 'commitment-event',
                    createdAt: '2026-03-01T00:00:00.000Z',
                    title: 'Commitment Event',
                    description: 'Commitment',
                    organizer: 'Organizer',
                    location: 'Online',
                    status: 'published',
                    startTime: '2026-03-14T18:00:00.000Z',
                    endTime: '2026-03-14T19:00:00.000Z',
                    sourceUrl: 'https://example.com/commitment',
                    livestreamUrl: null,
                    eventTypeId: 'workshop',
                })}
            >
                Open Commitment
            </button>
        </section>
    ),
}));

vi.mock('./MobileInsightCharts', () => ({
    MobileInsightCharts: () => <section data-testid="summary-insights">Pipeline Health</section>,
}));

vi.mock('./MobileMonthlyPulseCard', () => ({
    MobileMonthlyPulseCard: ({ deltaLabel }: { deltaLabel: string }) => <section data-testid="monthly-pulse">{deltaLabel}</section>,
}));

vi.mock('@/components/dashboard/RecentWinsCard', () => ({
    RecentWinsCard: ({ presentation }: { presentation?: string }) => <div data-testid="recent-wins-card" data-presentation={presentation}>Recent Wins</div>,
}));

vi.mock('@/components/dashboard/CareerImpactInsightsCard', () => ({
    CareerImpactInsightsCard: ({ presentation }: { presentation?: string }) => <div data-testid="career-impact-insights" data-presentation={presentation}>Career Impact Insights</div>,
}));

vi.mock('@/components/dashboard/CareerOutcomesCard', () => ({
    CareerOutcomesCard: ({ presentation }: { presentation?: string }) => <div data-testid="career-outcomes-card" data-presentation={presentation}>Career Outcomes</div>,
}));

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
    careerGoals: ['skill-development'],
    timeframe: 'short-term',
    learningStyle: ['hands-on'],
    availableTime: 'moderate',
    budget: 'moderate',
    networkingGoals: [],
    preferredEventTypes: ['workshop'],
};

const profile: AppProfile = {
    id: 'user-1',
    fullName: 'Test User',
    avatarUrl: null,
    timezone: 'UTC',
    preferences: {},
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
};

describe('MobileDashboardView', () => {
    beforeEach(() => {
        mocks.useCareerMetrics.mockReturnValue({
            attendance: {
                last30dCount: 4,
                previous30dCount: 2,
                deltaAbs: 2,
                deltaPct: null,
                isLowSample: true,
                trendData: [
                    { name: 'W1', value: 0 },
                    { name: 'W2', value: 1 },
                    { name: 'W3', value: 1 },
                    { name: 'W4', value: 2 },
                ],
            },
            pipeline: {
                trackedUpcomingCount: 3,
                scoredUpcomingCount: 2,
                avgScore: 78,
                highFitCount: 2,
                highFitRatio: 67,
                topEvents: [
                    { eventId: 'event-1', title: 'Strong Match Event', score: 82 },
                ],
            },
            funnel90d: {
                savedOnly: 2,
                rsvped: 1,
                attended: 1,
            },
            feedback: {
                feedbackCount: 1,
                averageRating: 4.5,
                recommendationRate: 100,
                unratedAttendedCount: 1,
                nextEventToRate: null,
            },
            pipelineFit: {
                value: 78,
                highFitCount: 2,
                totalCount: 3,
            },
            learningStreak: {
                months: 2,
                isActive: true,
                lastActivity: '2026-02',
            },
            outcomeSignals: {
                averageRating: 4.5,
                feedbackCount: 1,
                recommendationRate: 100,
                totalConnectionsMade: 2,
                uniqueSkillsCount: 1,
            },
        });
    });

    it('renders the action-first mobile sequence for onboarded users', () => {
        const { container } = render(
            <MobileDashboardView
                state="ready"
                profile={profile}
                hasCompletedOnboarding={true}
                careerProfile={careerProfile}
                trackedEvents={[]}
                allUpcomingEvents={[]}
                initialEventTypes={[]}
            />
        );

        const topRecommendation = screen.getByTestId('top-recommendation');
        const upcomingCommitments = screen.getByTestId('upcoming-commitments');
        const summaryInsights = screen.getByTestId('summary-insights');

        expect(topRecommendation.compareDocumentPosition(upcomingCommitments) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(upcomingCommitments.compareDocumentPosition(summaryInsights) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByTestId('monthly-pulse')).toHaveTextContent('+2 vs prev 30d');
        expect(screen.getByTestId('career-outcomes-card')).toBeInTheDocument();
        expect(screen.getByTestId('career-impact-insights')).toHaveAttribute('data-presentation', 'mobile-dashboard');
        expect(screen.getByTestId('recent-wins-card')).toHaveAttribute('data-presentation', 'mobile-dashboard');
        expect(screen.getByTestId('career-outcomes-card')).toHaveAttribute('data-presentation', 'mobile-dashboard');
        expect(container.querySelector('.mobile-dashboard-page')).toBeTruthy();
    });

    it('keeps the profile prompt ahead of recommendations when onboarding is incomplete', () => {
        render(
            <MobileDashboardView
                state="ready"
                profile={profile}
                hasCompletedOnboarding={false}
                careerProfile={null}
                trackedEvents={[]}
                allUpcomingEvents={[]}
                initialEventTypes={[]}
            />
        );

        expect(screen.getByTestId('career-profile-prompt')).toBeInTheDocument();
        expect(screen.queryByTestId('top-recommendation')).not.toBeInTheDocument();
        expect(screen.getByTestId('upcoming-commitments')).toBeInTheDocument();
        expect(screen.getByTestId('summary-insights')).toBeInTheDocument();
    });

    it('opens the mobile event detail panel instead of navigating away', async () => {
        const user = userEvent.setup();

        render(
            <MobileDashboardView
                state="ready"
                profile={profile}
                hasCompletedOnboarding={true}
                careerProfile={careerProfile}
                trackedEvents={[]}
                allUpcomingEvents={[]}
                initialEventTypes={[]}
            />
        );

        await user.click(screen.getByRole('button', { name: 'Open Recommendation' }));

        expect(screen.getByTestId('mobile-event-detail-panel')).toBeInTheDocument();
        expect(screen.getByText('Recommended Event')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByTestId('mobile-event-detail-panel')).not.toBeInTheDocument();
    });

    it('uses the shared mobile dashboard shell for loading skeletons', () => {
        const { container } = render(
            <MobileDashboardView
                state="loading"
                profile={profile}
                hasCompletedOnboarding={false}
                careerProfile={null}
                trackedEvents={[]}
                allUpcomingEvents={[]}
                initialEventTypes={[]}
            />
        );

        expect(container.querySelector('.mobile-dashboard-stack')).toBeTruthy();
        expect(container.querySelectorAll('.mobile-dashboard-skeletonCard')).toHaveLength(4);
    });
});
