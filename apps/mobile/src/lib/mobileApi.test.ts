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
  createMobileCommunityComment,
  createMobileCommunityPost,
  joinMobileCommunityCircle,
  leaveMobileCommunityCircle,
  loadMobileCalendarFeed,
  completeMobileCareerOnboarding,
  loadMobileDashboardSummary,
  loadMobileCareerOnboardingBootstrap,
  loadMobileCommunityCircle,
  loadMobileCommunityHome,
  loadMobileCommunityPost,
  loadMobileDiscoverFeed,
  loadMobileEventDetail,
  loadMobileProfileState,
  loadMobileSavedEvents,
  skipMobileCareerOnboarding,
  submitMobileCommunityReport,
  submitMobileCommunityVote,
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

  it('loads calendar month feeds through the mobile calendar contract', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            header: {
              eyebrow: 'Calendar',
              title: 'Plan your month',
            },
            month: {
              monthStart: '2026-05-01',
              monthEnd: '2026-05-31',
              label: 'May 2026',
            },
            today: '2026-05-12',
            metrics: {
              totalCount: 1,
              savedCount: 1,
              attendingCount: 1,
            },
            days: Array.from({ length: 42 }, (_, index) => ({
              dateKey:
                index < 31
                  ? `2026-05-${String(index + 1).padStart(2, '0')}`
                  : `2026-06-${String(index - 30).padStart(2, '0')}`,
              dayNumber: index < 31 ? index + 1 : index - 30,
              inCurrentMonth: index < 31,
              isToday: index === 11,
              eventCount: index === 11 ? 1 : 0,
              savedCount: index === 11 ? 1 : 0,
              attendingCount: index === 11 ? 1 : 0,
            })),
            events: [
              {
                id: 'event-1',
                title: 'Calendar event',
                startTime: '2026-05-12T18:00:00.000Z',
                dateKey: '2026-05-12',
              },
            ],
            emptyState: {
              title: 'No events this month',
              description: 'Move to another month.',
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await loadMobileCalendarFeed({
      monthStart: '2026-05-01',
    });

    expect(result.month.label).toBe('May 2026');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/calendar?monthStart=2026-05-01',
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

  it('loads mobile community read models and submits community mutations', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              header: {
                eyebrow: 'Community',
                title: 'Stay close to your circles',
              },
              feed: [],
              circles: [
                {
                  id: 'circle-1',
                  slug: 'ai-builders',
                  name: 'AI Builders',
                  description: 'A circle for AI builders.',
                  memberCount: 42,
                  isJoined: true,
                },
              ],
              upcomingEvents: [],
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
              header: {
                eyebrow: 'Circle',
                title: 'AI Builders',
              },
              circle: {
                id: 'circle-1',
                slug: 'ai-builders',
                name: 'AI Builders',
                description: 'A circle for AI builders.',
                memberCount: 42,
                isJoined: true,
              },
              isJoined: true,
              currentUser: null,
              members: [],
              upcomingEvents: [],
              posts: [],
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
              header: {
                eyebrow: 'Thread',
                title: 'AI Builders',
              },
              circle: {
                id: 'circle-1',
                slug: 'ai-builders',
                name: 'AI Builders',
                description: 'A circle for AI builders.',
                memberCount: 42,
                isJoined: true,
              },
              isJoined: true,
              currentUser: null,
              upcomingEvents: [],
              post: {
                id: 'post-1',
                content: 'What are you building?',
                createdAt: '2026-04-03T00:00:00.000Z',
                author: {
                  id: 'user-2',
                  fullName: 'Grace Hopper',
                  avatarUrl: null,
                },
                comments: [],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockImplementation(() =>
        Promise.resolve(
          new Response(
          JSON.stringify({
            success: true,
            data: {
              success: true,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

    const home = await loadMobileCommunityHome();
    const circle = await loadMobileCommunityCircle('ai-builders');
    const post = await loadMobileCommunityPost('post-1');
    await joinMobileCommunityCircle('circle-1');
    await leaveMobileCommunityCircle('circle-1');
    await createMobileCommunityPost({
      circleId: '11111111-1111-4111-8111-111111111111',
      circleSlug: 'ai-builders',
      content: 'Launching a new thread',
    });
    await createMobileCommunityComment({
      postId: '22222222-2222-4222-8222-222222222222',
      circleSlug: 'ai-builders',
      content: 'Reply from mobile',
    });
    await submitMobileCommunityVote({
      entityType: 'post',
      entityId: '33333333-3333-4333-8333-333333333333',
      circleSlug: 'ai-builders',
      voteType: 1,
    });
    await submitMobileCommunityReport({
      subjectType: 'post',
      subjectId: '44444444-4444-4444-8444-444444444444',
      reason: 'other',
    });

    expect(home.circles[0]?.slug).toBe('ai-builders');
    expect(circle.circle.name).toBe('AI Builders');
    expect(post.post.id).toBe('post-1');
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/community'
    );
    expect(fetchSpy.mock.calls[1]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/community/circles/ai-builders'
    );
    expect(fetchSpy.mock.calls[2]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/community/posts/post-1'
    );
    expect(fetchSpy.mock.calls[3]?.[0]).toBe(
      'https://mobile.kurecal.test/api/community/circles/circle-1/join'
    );
    expect(fetchSpy.mock.calls[8]?.[0]).toBe(
      'https://mobile.kurecal.test/api/community/reports'
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
