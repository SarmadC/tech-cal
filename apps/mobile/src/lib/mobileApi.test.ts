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
  blockMobileUser,
  checkMobileUsernameAvailability,
  bulkSyncMobileGoogleCalendar,
  createMobileCommunityComment,
  createMobileCommunityPost,
  disconnectMobileGoogleCalendar,
  joinMobileCommunityCircle,
  leaveMobileCommunityCircle,
  loadMobileCalendarFeed,
  loadMobileBlockedUsers,
  loadMobileGoogleCalendarStatus,
  completeMobileCareerOnboarding,
  loadMobileDashboardSummary,
  loadMobileCareerOnboardingBootstrap,
  loadMobileCommunityCircle,
  loadMobileCommunityHome,
  loadMobileCommunityPost,
  loadMobileDiscoverFeed,
  loadMobileEventDetail,
  loadMobileEventNetworkingFeedback,
  loadMobileFollowStatus,
  loadMobileProfileState,
  loadMobilePublicProfile,
  loadMobileSavedEvents,
  loadMobileSpeakerDetail,
  loadMobileSubscriptionOfferings,
  loadMobileSubscriptionStatus,
  followMobileUser,
  reconcileMobileRevenueCatSubscription,
  removeMobileAvatar,
  searchMobileCommunityDirectory,
  skipMobileCareerOnboarding,
  submitMobileCommunityReport,
  submitMobileCommunityVote,
  syncMobileGoogleCalendarEvent,
  unblockMobileUser,
  unfollowMobileUser,
  unsyncMobileGoogleCalendarEvent,
  updateMobileEventAgendaSave,
  updateMobileEventEngagement,
  updateMobileEventNetworkingFeedback,
  uploadMobileAvatar,
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
            controls: {
              rankingModes: [
                {
                  id: 'best-match',
                  label: 'Best match',
                  description: 'Prioritize strongest career alignment.',
                },
              ],
              activeRankingMode: 'best-match',
            },
            activeState: {
              resultLabel: '12 ranked picks',
              supportingText: 'Career-impact ranking tuned to mobile discovery.',
            },
            results: {
              returnedCount: 1,
              totalCount: 12,
              hasMore: true,
            },
            filters: {
              searchTerm: 'expo',
              categories: [],
              tags: ['expo'],
              location: null,
              dateRange: {
                start: null,
                end: null,
              },
              format: 'all',
              cost: 'all',
              activeCount: 2,
            },
            availableFilters: {
              categories: [],
              tags: [
                {
                  value: 'expo',
                  label: 'Expo',
                  count: 8,
                },
              ],
            },
            counts: {
              format: {
                virtual: 2,
                'in-person': 8,
                hybrid: 2,
              },
              cost: {
                free: 6,
                paid: 6,
              },
              categories: {},
              tags: {
                expo: 8,
              },
            },
            topPicks: null,
            events: [
              {
                id: 'event-1',
                title: 'Expo Meetup',
                slug: 'expo-meetup',
                startTime: '2026-04-12T18:00:00.000Z',
                organizerLogoUrl: 'https://example.com/logo.png',
                insight: 'Fits your goals',
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
      rankingMode: 'best-match',
      searchTerm: 'expo',
      tags: ['expo'],
      page: 1,
    });

    expect(result.results.totalCount).toBe(12);
    expect(result.controls.activeRankingMode).toBe('best-match');
    expect(result.events[0]?.slug).toBe('expo-meetup');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/discover',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          rankingMode: 'best-match',
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

  it('saves agenda sessions through the event agenda save endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            eventId: 'event-1',
            agendaItemId: 'agenda-1',
            isSaved: true,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await updateMobileEventAgendaSave(
      'event-1',
      'agenda-1',
      true
    );

    expect(result.isSaved).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/events/event-1/agenda/agenda-1/save',
      expect.objectContaining({
        method: 'POST',
      })
    );

    fetchSpy.mockRestore();
  });

  it('loads and submits an event review rating with optional connections', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              eventId: 'event-1',
              actualValueRating: null,
              connectionsMade: null,
              linkedinRequestsSent: null,
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
              eventId: 'event-1',
              actualValueRating: 5,
              connectionsMade: 2,
              linkedinRequestsSent: null,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const initial = await loadMobileEventNetworkingFeedback('event-1');
    const submitted = await updateMobileEventNetworkingFeedback('event-1', {
      actualValueRating: 5,
      connectionsMade: 2,
    });

    expect(initial.actualValueRating).toBeNull();
    expect(submitted.actualValueRating).toBe(5);
    expect(fetchSpy.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          actualValueRating: 5,
          connectionsMade: 2,
        }),
      })
    );

    fetchSpy.mockRestore();
  });

  it('loads dashboard summaries through the shared mobile contract', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            hero: {
              eyebrow: 'Dashboard',
              title: 'Your momentum, in one pass.',
              subtitle: 'A mobile-first overview of recommendations and plans.',
              highlight: 'Hero event',
            },
            metrics: [
              {
                id: 'saved',
                label: 'Saved',
                value: '3',
                detail: 'Bookmarks ready for calendar review.',
              },
            ],
            recommendationsLabel: 'Recommended next',
            recommendations: [
              {
                id: 'event-rec',
                title: 'Recommended Event',
                slug: 'recommended-event',
                startTime: '2026-04-14T18:00:00.000Z',
              },
            ],
            upcomingLabel: 'Planned next',
            upcoming: [
              {
                id: 'event-hero',
                title: 'Hero event',
                slug: 'hero-event',
                startTime: '2026-04-12T18:00:00.000Z',
              },
            ],
            onboardingState: {
              hasCompleted: true,
              title: 'Profile calibrated',
              body: 'Your ranking model is using the richer career profile.',
              ctaLabel: 'View onboarding',
            },
            topRecommendation: {
              event: {
                id: 'event-rec',
                title: 'Recommended Event',
                slug: 'recommended-event',
                startTime: '2026-04-14T18:00:00.000Z',
                score: 84,
              },
              daysUntil: 4,
              impactLabel: 'High Impact',
              reason: 'Strong fit for your goals',
            },
            upcomingCommitments: [
              {
                trackingId: 'tracking-1',
                daysUntil: 2,
                event: {
                  id: 'event-hero',
                  title: 'Hero event',
                  slug: 'hero-event',
                  startTime: '2026-04-12T18:00:00.000Z',
                },
              },
            ],
            showOpenCommitmentSlot: true,
            insights: {
              pipeline: {
                trackedUpcomingCount: 3,
                scoredUpcomingCount: 2,
                avgScore: 76,
                highFitCount: 1,
                topEvents: [
                  {
                    eventId: 'event-hero',
                    title: 'Hero event',
                    score: 81,
                  },
                ],
              },
              funnel: {
                savedOnly: 2,
                rsvped: 1,
                attended: 1,
              },
            },
            monthlyPulse: {
              currentCount: 2,
              deltaLabel: '+1 vs prev 30d',
              trend: [
                { label: 'W1', value: 0 },
                { label: 'W2', value: 1 },
                { label: 'W3', value: 0 },
                { label: 'W4', value: 1 },
              ],
            },
            performance: {
              summary: {
                attendedCount: 4,
                ratedCount: 3,
                connectionsMade: 7,
              },
              recentWins: [
                {
                  event: {
                    id: 'event-win',
                    title: 'Product Forum',
                    slug: 'product-forum',
                    startTime: '2026-04-01T18:00:00.000Z',
                  },
                  score: 78,
                  trackedAt: '2026-03-18T00:00:00.000Z',
                  attendedDate: '2026-04-01T18:00:00.000Z',
                  matchedSkills: ['Product Strategy'],
                  matchedGoals: ['networking'],
                  bookmarkedLeadDays: 10,
                  feedbackSubmitted: true,
                  actualValueRating: 4,
                },
              ],
              hiddenCount: 0,
            },
            careerImpact: {
              totalEvents: 3,
              skillAlignedCount: 2,
              skillAlignedPercentage: 67,
              goalAlignedCount: 2,
              goalAlignedPercentage: 67,
              networkingCount: 1,
              networkingPercentage: 33,
              skillProgress: [
                {
                  skill: 'Product Strategy',
                  eventsAttended: 2,
                  progressLevel: 'building',
                  nextMilestone: '3 more events to become a regular',
                },
              ],
              insights: [
                {
                  tone: 'success',
                  message:
                    'Product Strategy is showing up consistently across 2 attended events.',
                },
              ],
            },
            careerOutcomes: {
              state: 'mature',
              attendedCount: 3,
              upcomingCount: 1,
              feedbackCount: 5,
              unratedAttendedCount: 1,
              ratingsRemaining: 0,
              nextEventToRate: {
                id: 'event-win',
                title: 'Product Forum',
                slug: 'product-forum',
                startTime: '2026-04-01T18:00:00.000Z',
              },
              nextEventToConfirmConnections: {
                id: 'event-follow-up',
                title: 'AI Mixer',
                slug: 'ai-mixer',
                startTime: '2026-03-20T18:00:00.000Z',
              },
              averageRating: 4.2,
              recommendationRate: 80,
              totalConnectionsMade: 7,
              uniqueSkillsCount: 5,
              teaserMessage: 'You are building expertise in Product Strategy',
            },
            networkPulse: {
              confirmedConnectionCount: 7,
              pendingRequestCount: 2,
              nextContactToConfirm: {
                kind: 'speaker',
                id: 'speaker-1',
                username: null,
                name: 'Jamie Chen',
                avatarUrl: 'https://example.com/jamie.jpg',
                headline: 'Product leader',
                linkedinUrl: 'https://linkedin.com/in/jamie-chen',
                sourceEvent: {
                  id: '11111111-1111-4111-8111-111111111111',
                  slug: 'product-forum',
                  title: 'Product Forum',
                  startTime: '2026-04-01T18:00:00.000Z',
                  location: 'Remote',
                  format: 'Hybrid',
                },
              },
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await loadMobileDashboardSummary();

    expect(result.hero.highlight).toBe('Hero event');
    expect(result.metrics[0]?.value).toBe('3');
    expect(result.recommendations[0]?.id).toBe('event-rec');
    expect(result.topRecommendation?.impactLabel).toBe('High Impact');
    expect(result.upcomingCommitments?.[0]?.trackingId).toBe('tracking-1');
    expect(result.insights?.pipeline.avgScore).toBe(76);
    expect(result.performance?.recentWins[0]?.feedbackSubmitted).toBe(true);
    expect(result.careerImpact?.insights[0]?.tone).toBe('success');
    expect(result.careerOutcomes?.averageRating).toBe(4.2);
    expect(result.networkPulse?.pendingRequestCount).toBe(2);
    expect(result.networkPulse?.nextContactToConfirm?.id).toBe('speaker-1');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/dashboard/summary',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    fetchSpy.mockRestore();
  });

  it('loads blocked members and posts block actions through the shared mobile auth lane', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                fullName: 'Blocked Member',
                avatarUrl: null,
                username: 'blocked-member',
                headline: 'ML Engineer',
                blockedAt: '2026-04-04T00:00:00.000Z',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            message: 'User blocked successfully.',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            message: 'User unblocked successfully.',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

    const blockedUsers = await loadMobileBlockedUsers();
    await blockMobileUser('11111111-1111-4111-8111-111111111111');
    await unblockMobileUser('11111111-1111-4111-8111-111111111111');

    expect(blockedUsers[0]?.username).toBe('blocked-member');
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'https://mobile.kurecal.test/api/blocks',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'https://mobile.kurecal.test/api/blocks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          blockedUserId: '11111111-1111-4111-8111-111111111111',
        }),
        headers: expect.any(Headers),
      })
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'https://mobile.kurecal.test/api/blocks/11111111-1111-4111-8111-111111111111',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.any(Headers),
      })
    );

    fetchSpy.mockRestore();
  });

  it('searches the mobile community directory with pagination', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            people: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                fullName: 'Ada Lovelace',
                avatarUrl: null,
                username: 'ada',
                headline: 'Computing pioneer',
                joinedAt: '2026-04-01T00:00:00.000Z',
                followerCount: 12,
                followingCount: 4,
                activity: {
                  upcomingAttendingCount: 2,
                  attendingThisWeekCount: 1,
                  sharedSavedEventCount: 1,
                  recentFollowerCount: 3,
                  isViewerFollowing: false,
                  sharedCircleCount: 2,
                },
              },
            ],
            nextCursor: null,
            highlights: {
              attendingSavedEvents: [],
              networkAttendingThisWeek: [],
              newMembers: [],
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await searchMobileCommunityDirectory(' ada ', 'cursor-1');

    expect(result.people[0]?.username).toBe('ada');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/community/directory?q=ada&cursor=cursor-1&limit=20',
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
            results: {
              returnedCount: 1,
              totalCount: 1,
            },
            filters: {
              tags: ['expo'],
              location: 'Calgary',
              dateRange: {
                start: '2026-05-10',
                end: '2026-05-20',
              },
              cost: 'free',
              activeCount: 4,
            },
            availableFilters: {
              tags: [
                {
                  value: 'expo',
                  label: 'Expo',
                  count: 1,
                },
              ],
              eventTypes: [
                {
                  id: 'meetup',
                  name: 'Meetup',
                  color: '#2dd4bf',
                },
              ],
            },
            counts: {
              cost: {
                free: 1,
                paid: 0,
              },
              tags: {
                expo: 1,
              },
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
                eventTypeId: 'meetup',
                isFree: true,
              },
            ],
            emptyState: {
              title: 'No events this month',
              description: 'Move to another month.',
              body: 'Move to another month.',
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
      tags: ['expo'],
      location: 'Calgary',
      dateRange: {
        start: '2026-05-10',
        end: '2026-05-20',
      },
      cost: 'free',
    });

    expect(result.month.label).toBe('May 2026');
    expect(result.filters.activeCount).toBe(4);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/calendar',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          monthStart: '2026-05-01',
          tags: ['expo'],
          location: 'Calgary',
          dateRange: {
            start: '2026-05-10',
            end: '2026-05-20',
          },
          cost: 'free',
        }),
        headers: expect.any(Headers),
      })
    );

    fetchSpy.mockRestore();
  });

  it('supports Google Calendar status, sync, unsync, bulk sync, and disconnect helpers', async () => {
    const statusPayload = {
      provider: 'google',
      connected: true,
      isActive: true,
      hasRefreshToken: true,
      status: 'connected',
      calendarId: 'primary',
      lastSyncStatus: 'success',
      lastSyncAt: '2026-05-01T00:00:00.000Z',
      lastSyncError: null,
    };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: statusPayload }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { total: 2, synced: 1, failed: 1, errors: ['retry later'] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              ...statusPayload,
              provider: null,
              connected: false,
              isActive: false,
              hasRefreshToken: false,
              status: 'not_connected',
              calendarId: null,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const status = await loadMobileGoogleCalendarStatus();
    await syncMobileGoogleCalendarEvent('event-1');
    await unsyncMobileGoogleCalendarEvent('event-1');
    const bulkResult = await bulkSyncMobileGoogleCalendar();
    const disconnected = await disconnectMobileGoogleCalendar();

    expect(status.connected).toBe(true);
    expect(bulkResult.failed).toBe(1);
    expect(disconnected.connected).toBe(false);
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      'https://mobile.kurecal.test/api/mobile/calendar/google/status',
      'https://mobile.kurecal.test/api/mobile/calendar/google/sync',
      'https://mobile.kurecal.test/api/mobile/calendar/google/sync',
      'https://mobile.kurecal.test/api/mobile/calendar/google/bulk-sync',
      'https://mobile.kurecal.test/api/mobile/calendar/google/disconnect',
    ]);
    expect(fetchSpy.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ eventId: 'event-1', action: 'sync' }),
      })
    );
    expect(fetchSpy.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ eventId: 'event-1', action: 'delete' }),
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
              bio: 'Unlocking stories through data.',
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
              summary: {
                trackedUpcomingCount: 2,
                visibleOpportunityCount: 1,
                followUpCount: 1,
                attendanceVisibilityEnabled: true,
              },
              upcomingMoments: [
                {
                  id: '11111111-1111-4111-8111-111111111111',
                  slug: 'design-review-week',
                  title: 'Design Review Week',
                  startTime: '2026-04-02T18:00:00.000Z',
                  imageUrl: 'https://example.com/event.png',
                  location: 'Remote',
                  format: 'virtual',
                  viewerContext: 'attending',
                  contextLabel: 'Tracked',
                  recentTrackerCount: 3,
                  totalAttendeeCount: 12,
                  visibleAttendeeCount: 4,
                  networkAttendingCount: 2,
                  relationshipAttendeeCount: 1,
                  attendeePreview: [
                    {
                      id: '99999999-9999-4999-8999-999999999999',
                      fullName: 'Jordan',
                      username: 'jordan',
                      avatarUrl: null,
                      isInNetwork: false,
                      followsViewer: false,
                      isMutualFollow: false,
                    },
                  ],
                  primaryReason: 'Visible attendees are already here.',
                  whyNow: 'The networking context is already warming up.',
                  newVisibleAttendeeCount: 3,
                  recommendedAction: 'expand_people',
                },
              ],
              peopleToMeet: [],
              followUpNow: [],
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
                title: 'What are you building?',
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
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: '22222222-2222-4222-8222-222222222222',
              fullName: 'Ada Lovelace',
              avatarUrl: null,
              username: 'ada',
              headline: 'Staff engineer',
              bio: 'Leads applied AI research.',
              showAttendance: true,
              isViewerOwner: false,
              followerCount: 12,
              followingCount: 8,
              relationship: {
                isFollowing: true,
                isFollowedBy: false,
                isBlockedByUser: false,
                hasBlockedUser: false,
              },
              recentAttendingEvents: [],
              careerProfile: {
                currentRole: 'Engineer',
                companyName: 'KureCal',
                primarySkills: [],
                skillsToLearn: [],
                interests: [],
                careerGoals: [],
                networkingGoals: [],
                preferredEventTypes: [],
              },
              mutualConnections: [],
              mutualConnectionsCount: 0,
              sharedEventsCount: 0,
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
              isFollowing: true,
              isFollowedBy: false,
              isBlockedByUser: false,
              hasBlockedUser: false,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            message: 'Followed',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            message: 'Unfollowed',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'speaker-1',
              name: 'Dana Scully',
              title: 'AI Research Lead',
              company: 'Signal Labs',
              bio: 'Leads applied AI research.',
              photoUrl: null,
              portraitUrl: 'https://example.com/dana-portrait.jpg',
              linkedinUrl: 'https://linkedin.com/in/dana',
              twitterUrl: null,
              websiteUrl: null,
              appearanceCount: 0,
              events: [],
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
              message: 'Mutation applied',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

    const home = await loadMobileCommunityHome();
    const circle = await loadMobileCommunityCircle('ai-builders');
    const post = await loadMobileCommunityPost('post-1');
    const publicProfile = await loadMobilePublicProfile('ada');
    const followStatus = await loadMobileFollowStatus(
      '22222222-2222-4222-8222-222222222222'
    );
    await followMobileUser('22222222-2222-4222-8222-222222222222');
    await unfollowMobileUser('22222222-2222-4222-8222-222222222222');
    const speaker = await loadMobileSpeakerDetail('speaker-1');
    await joinMobileCommunityCircle('circle-1');
    await leaveMobileCommunityCircle('circle-1');
    await createMobileCommunityPost({
      circleId: '11111111-1111-1111-1111-111111111111',
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

    expect(home.upcomingMoments[0]?.slug).toBe('design-review-week');
    expect(circle.circle.name).toBe('AI Builders');
    expect(post.post.id).toBe('post-1');
    expect(publicProfile.username).toBe('ada');
    expect(followStatus.isFollowing).toBe(true);
    expect(speaker.portraitUrl).toBe('https://example.com/dana-portrait.jpg');
    expect(speaker.name).toBe('Dana Scully');
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
      'https://mobile.kurecal.test/api/mobile/profiles/ada'
    );
    expect(fetchSpy.mock.calls[4]?.[0]).toBe(
      'https://mobile.kurecal.test/api/follows/status/22222222-2222-4222-8222-222222222222'
    );
    expect(fetchSpy.mock.calls[5]?.[0]).toBe(
      'https://mobile.kurecal.test/api/follows'
    );
    expect(fetchSpy.mock.calls[6]?.[0]).toBe(
      'https://mobile.kurecal.test/api/follows/22222222-2222-4222-8222-222222222222'
    );
    expect(fetchSpy.mock.calls[7]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/speakers/speaker-1'
    );
    expect(fetchSpy.mock.calls[8]?.[0]).toBe(
      'https://mobile.kurecal.test/api/community/circles/circle-1/join'
    );
    expect(fetchSpy.mock.calls[13]?.[0]).toBe(
      'https://mobile.kurecal.test/api/community/reports'
    );

    fetchSpy.mockRestore();
  });

  it('loads subscription state, offerings, and reconciles RevenueCat payloads', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: '11111111-1111-4111-8111-111111111111',
              userId: '22222222-2222-4222-8222-222222222222',
              provider: 'manual',
              tier: 'free',
              status: 'canceled',
              planType: null,
              entitlements: {
                calendar_sync: false,
                full_history: false,
                full_recommendations: false,
                unlimited_bookmarks: false,
              },
              trialEndsAt: null,
              currentPeriodEnd: null,
              providerCustomerId: null,
              providerProductId: null,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                identifier: 'pro-monthly',
                productIdentifier: 'kurecal_pro_monthly',
                title: 'Pro Monthly',
                description: 'Monthly access',
                tier: 'pro',
                planType: 'monthly',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: '33333333-3333-4333-8333-333333333333',
              userId: '22222222-2222-4222-8222-222222222222',
              provider: 'revenuecat',
              tier: 'pro',
              status: 'active',
              planType: 'monthly',
              entitlements: {
                calendar_sync: true,
                full_history: true,
                full_recommendations: true,
                unlimited_bookmarks: true,
              },
              trialEndsAt: null,
              currentPeriodEnd: '2026-05-01T00:00:00.000Z',
              providerCustomerId: 'customer-1',
              providerProductId: 'kurecal_pro_monthly',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const subscription = await loadMobileSubscriptionStatus();
    const offerings = await loadMobileSubscriptionOfferings();
    const reconciled = await reconcileMobileRevenueCatSubscription({
      customerId: 'customer-1',
      entitlementId: 'kure_cal_pro',
      productId: 'kurecal_pro_monthly',
      tier: 'pro',
      status: 'active',
      planType: 'monthly',
      currentPeriodStart: null,
      currentPeriodEnd: '2026-05-01T00:00:00.000Z',
      trialStartedAt: null,
      trialEndsAt: null,
      pastDueAt: null,
      entitlements: {
        calendar_sync: true,
        full_history: true,
        full_recommendations: true,
        unlimited_bookmarks: true,
      },
    });

    expect(subscription.tier).toBe('free');
    expect(offerings[0]?.identifier).toBe('pro-monthly');
    expect(reconciled.provider).toBe('revenuecat');
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/subscription/status'
    );
    expect(fetchSpy.mock.calls[1]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/subscription/offerings'
    );
    expect(fetchSpy.mock.calls[2]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/subscription/reconcile'
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
                bio: 'Unlocking stories through data.',
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
    expect(fetchSpy.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          fullName: 'Ada Lovelace',
          username: 'ada',
        }),
      })
    );

    fetchSpy.mockRestore();
  });

  it('checks username availability with bearer authentication', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            username: 'ada',
            available: true,
            message: 'Username is available.',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const result = await checkMobileUsernameAvailability('ada');

    expect(result.available).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/profile/username-check?q=ada',
      expect.objectContaining({ headers: expect.any(Headers) })
    );

    fetchSpy.mockRestore();
  });

  it('uploads and removes a mobile profile avatar', async () => {
    const avatarProfileState = {
      profile: {
        id: 'user-1',
        email: 'user@example.com',
        fullName: 'Ada Lovelace',
        avatarUrl: 'https://example.com/avatar.webp',
        timezone: 'America/Edmonton',
      },
      socialProfile: {
        id: 'user-1',
        fullName: 'Ada Lovelace',
        avatarUrl: 'https://example.com/avatar.webp',
        username: 'ada',
        headline: 'Builder',
        bio: null,
        profileVisibility: 'public',
        showAttendance: true,
      },
      onboarding: { onboarded: true, source: 'career_profiles' },
      careerProfile: null,
    };
    const removedProfileState = {
      ...avatarProfileState,
      profile: { ...avatarProfileState.profile, avatarUrl: null },
      socialProfile: { ...avatarProfileState.socialProfile, avatarUrl: null },
    };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: avatarProfileState }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: removedProfileState }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

    const uploaded = await uploadMobileAvatar({
      fileName: 'portrait.jpg',
      mimeType: 'image/jpeg',
      uri: 'file:///portrait.jpg',
    });
    const removed = await removeMobileAvatar();

    expect(uploaded.profile.avatarUrl).toBe('https://example.com/avatar.webp');
    expect(removed.profile.avatarUrl).toBeNull();
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      'https://mobile.kurecal.test/api/mobile/profile/avatar'
    );
    expect(fetchSpy.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
    );
    expect(
      (fetchSpy.mock.calls[0]?.[1]?.headers as Headers).has('Content-Type')
    ).toBe(false);
    expect(fetchSpy.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ method: 'DELETE' })
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
        companyName: 'KureCal',
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
