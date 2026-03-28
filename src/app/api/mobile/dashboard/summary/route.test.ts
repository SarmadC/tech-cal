import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mobileDashboardHomeSchema } from '@kurecal/domain';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  getCareerProfile: vi.fn(),
  fetchPersonalizedRecommendationCandidates: vi.fn(),
  getEvents: vi.fn(),
  getTrackedEvents: vi.fn(),
  loadEngagementMap: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    getCareerProfile: (...args: unknown[]) => mocks.getCareerProfile(...args),
  },
}));

vi.mock('@/services/recommendations/recommendationPipeline', () => ({
  fetchPersonalizedRecommendationCandidates: (...args: unknown[]) =>
    mocks.fetchPersonalizedRecommendationCandidates(...args),
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    getEvents: (...args: unknown[]) => mocks.getEvents(...args),
  },
}));

vi.mock('@/services/userEventService', () => ({
  UserEventService: {
    getTrackedEvents: (...args: unknown[]) => mocks.getTrackedEvents(...args),
  },
}));

vi.mock('@/app/api/mobile/engagement', () => ({
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

const recommendedEvent = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Dashboard Recommendation',
  description: 'A recommendation for testing.',
  location: 'Remote',
  startTime: '2026-04-12T18:00:00.000Z',
  endTime: '2026-04-12T19:00:00.000Z',
  eventImageUrl: null,
  sourceUrl: 'https://example.com/events/dashboard-recommendation',
  organizer: 'KureCal',
  organization: { name: 'KureCal' },
  recommendationMetadata: { alignmentScore: 91 },
};

const trackedRecord = {
  isBookmarked: true,
  status: 'attending',
  event: {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Tracked Event',
    description: 'Tracked event for the dashboard.',
    location: 'Remote',
    startTime: '2026-04-10T18:00:00.000Z',
    endTime: '2026-04-10T19:00:00.000Z',
    eventImageUrl: null,
    sourceUrl: 'https://example.com/events/tracked-event',
    organizer: 'KureCal',
    organization: { name: 'KureCal' },
    recommendationMetadata: null,
  },
};

describe('GET /api/mobile/dashboard/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: { id: '22222222-2222-4222-8222-222222222222' },
    });
    mocks.getCareerProfile.mockResolvedValue({ id: 'profile-1' });
    mocks.fetchPersonalizedRecommendationCandidates.mockResolvedValue({
      events: [recommendedEvent],
    });
    mocks.getTrackedEvents.mockResolvedValue([trackedRecord]);
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([[recommendedEvent.id, { isBookmarked: false, status: null }]])
    );
  });

  it('returns a sectioned dashboard home contract', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/dashboard/summary', {
        method: 'GET',
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileDashboardHomeSchema.parse(payload.data).metrics[0]?.id).toBe('tracked');
    expect(payload.data.upcoming[0]?.badges).toContain('Saved');
    expect(payload.data.upcoming[0]?.badges).toContain('Attending');
  });
});
