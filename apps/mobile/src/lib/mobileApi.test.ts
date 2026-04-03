import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mocks.getSession(...args),
    },
  },
}));

import {
  completeMobileCareerOnboarding,
  loadMobileDashboardSummary,
  loadMobileCareerOnboardingBootstrap,
  loadMobileDiscoverFeed,
  loadMobileEventDetail,
  loadMobileProfileState,
  loadMobileSavedEvents,
  skipMobileCareerOnboarding,
  updateMobileEventEngagement,
  updateMobileProfile,
} from './mobileApi';

describe('mobile api helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'mobile-token',
        },
      },
    });
    process.env.EXPO_PUBLIC_API_URL = 'https://mobile.kurecal.test';
  });

  it('fails fast when the user is signed out', async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    await expect(loadMobileDashboardSummary()).rejects.toThrow('Sign in required');
  });

  it('posts discover filters with bearer auth and parses the shared contract', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            header: {
              eyebrow: 'Discover',
              title: 'Find your next event',
            },
            totalCount: 12,
            nextPage: 2,
            events: [
              {
                id: 'event-1',
                title: 'Expo Meetup',
                startTime: '2026-04-12T18:00:00.000Z',
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await loadMobileDiscoverFeed({
      searchTerm: 'expo',
      tags: ['expo'],
      page: 1,
    });

    expect(result.totalCount).toBe(12);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/discover',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          searchTerm: 'expo',
          tags: ['expo'],
          page: 1,
        }),
        headers: expect.any(Headers),
      })
    );

    const requestHeaders = fetchSpy.mock.calls[0]?.[1]?.headers as Headers;
    expect(requestHeaders.get('authorization')).toBe('Bearer mobile-token');
    expect(requestHeaders.get('content-type')).toBe('application/json');

    fetchSpy.mockRestore();
  });

  it('loads event detail and surfaces backend errors', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Event not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await expect(loadMobileEventDetail('missing-event')).rejects.toThrow(
      'Event not found'
    );

    fetchSpy.mockRestore();
  });

  it('loads dashboard summaries through the shared mobile contract', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            header: {
              eyebrow: 'Dashboard',
              title: 'Your event runway',
            },
            upcomingCount: 2,
            savedCount: 3,
            recommendationCount: 18,
            heroEvent: {
              id: 'event-hero',
              title: 'Hero event',
              startTime: '2026-04-12T18:00:00.000Z',
            },
            upcomingEvents: [],
            recommendedEvents: [],
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await loadMobileDashboardSummary();

    expect(result.recommendationCount).toBe(18);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/dashboard/summary',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    fetchSpy.mockRestore();
  });

  it('loads the combined mobile profile state', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            profile: {
              id: 'user-1',
              email: 'user@example.com',
              fullName: 'Ada Lovelace',
              avatarUrl: null,
              timezone: 'America/Edmonton',
            },
            socialProfile: {
              id: 'user-1',
              fullName: 'Ada Lovelace',
              avatarUrl: null,
              username: 'ada',
              headline: 'Builder',
              profileVisibility: 'connections',
              showAttendance: true,
            },
            onboarding: {
              onboarded: true,
              source: 'career_profiles',
            },
            careerProfile: null,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await loadMobileProfileState();

    expect(result.socialProfile.username).toBe('ada');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/profile',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    fetchSpy.mockRestore();
  });

  it('supports saved feeds, engagement updates, and profile updates', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              header: { eyebrow: 'Saved', title: 'Your shortlist' },
              totalCount: 1,
              nextPage: null,
              events: [
                {
                  id: 'event-1',
                  title: 'Saved event',
                  startTime: '2026-04-20T18:00:00.000Z',
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              isBookmarked: true,
              status: null,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              profile: {
                id: 'user-1',
                email: 'user@example.com',
                fullName: 'Ada Lovelace',
                avatarUrl: null,
                timezone: 'America/Edmonton',
              },
              socialProfile: {
                id: 'user-1',
                fullName: 'Ada Lovelace',
                avatarUrl: null,
                username: 'ada',
                headline: 'Builder',
                profileVisibility: 'connections',
                showAttendance: true,
              },
              onboarding: {
                onboarded: true,
                source: 'career_profiles',
              },
              careerProfile: null,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const saved = await loadMobileSavedEvents(2);
    const engagement = await updateMobileEventEngagement('event-1', {
      isBookmarked: true,
    });
    const profile = await updateMobileProfile({
      fullName: 'Ada Lovelace',
      username: 'ada',
    });

    expect(saved.totalCount).toBe(1);
    expect(engagement.isBookmarked).toBe(true);
    expect(profile.profile.fullName).toBe('Ada Lovelace');
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/saved?page=2'
    );
    expect(fetchSpy.mock.calls[1]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/events/event-1/engagement'
    );
    expect(fetchSpy.mock.calls[2]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/profile'
    );

    fetchSpy.mockRestore();
  });

  it('loads and submits mobile onboarding payloads', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              status: {
                onboarded: false,
                source: 'none',
              },
              initialData: null,
              taxonomy: {
                roleGroups: [],
                skillOptions: [],
                interestOptions: [],
                roleSuggestions: {},
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              onboarded: true,
              source: 'career_profiles',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              onboarded: true,
              source: 'legacy',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const bootstrap = await loadMobileCareerOnboardingBootstrap();
    const complete = await completeMobileCareerOnboarding({
      step1_role: {
        currentRole: 'Software Engineer',
        seniority: 'mid-level',
        industry: 'Technology',
        companySize: 'medium',
      },
      step2_skills: {
        primarySkills: ['TypeScript', 'React'],
        skillsToLearn: [],
        interests: [],
      },
      step3_goals: {
        careerGoals: ['skill-development'],
        timeframe: 'medium-term',
      },
      step4_preferences: {
        targetPath: '',
        learningStyle: [],
        availableTime: 'moderate',
        budget: 'moderate',
      },
      step5_networking: {
        networkingGoals: [],
        preferredEventTypes: [],
      },
      step6_teamBuilding: {
        teamRole: 'flexible',
        collaborationStyle: [],
        teamSizePreference: 'flexible',
        communicationPreferences: [],
        teamGoals: [],
        mentorshipPreference: 'neither',
        availabilityPattern: null,
        projectTypePreferences: [],
      },
    });
    const skipped = await skipMobileCareerOnboarding();

    expect(bootstrap.status.onboarded).toBe(false);
    expect(complete.source).toBe('career_profiles');
    expect(skipped.source).toBe('legacy');
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/onboarding/career'
    );

    fetchSpy.mockRestore();
  });
});
