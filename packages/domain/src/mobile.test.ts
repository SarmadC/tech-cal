import { describe, expect, it } from 'vitest';

import {
  mobileCalendarConnectionStatusSchema,
  mobileCalendarFeedSchema,
  mobileCalendarSyncStateSchema,
  mobileCareerOnboardingBootstrapSchema,
  mobileDashboardSummarySchema,
  mobileDiscoverFeedSchema,
  mobileEventDetailSchema,
  mobileEventNetworkingFeedbackSchema,
  mobileEventNetworkingFeedbackUpdateSchema,
  mobileEventEngagementUpdateSchema,
  mobileProfileUpdateSchema,
  mobileProfileStateSchema,
  mobileSavedEventsFeedSchema,
} from './mobile';

describe('mobile domain contracts', () => {
  it('parses mobile profile updates without user-editable timezone', () => {
    const parsed = mobileProfileUpdateSchema.parse({
      fullName: 'Ada Lovelace',
      timezone: 'America/Edmonton',
      username: 'ada',
      headline: 'Builder',
      bio: 'Unlocking stories through data.',
    });

    expect(parsed).toEqual({
      fullName: 'Ada Lovelace',
      username: 'ada',
      headline: 'Builder',
      bio: 'Unlocking stories through data.',
    });
  });

  it('parses discover feeds with event engagement metadata', () => {
    expect(
      mobileDiscoverFeedSchema.parse({
        header: {
          eyebrow: 'KureCal mobile',
          title: 'Discover',
          subtitle: 'The mobile web discovery hierarchy, translated into the native app shell.',
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
          supportingText: 'Career-impact ranking tuned to the same mobile web discovery hierarchy.',
        },
        results: {
          returnedCount: 1,
          totalCount: 12,
          hasMore: true,
        },
        filters: {
          searchTerm: '',
          categories: [],
          tags: ['expo'],
          location: null,
          dateRange: {
            start: null,
            end: null,
          },
          format: 'all',
          cost: 'all',
          activeCount: 1,
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
        topPicks: {
          title: 'Your Top Picks',
          cards: [
            {
              id: 'hero-1',
              title: 'Top pick',
              slug: 'top-pick',
              startTime: '2026-04-09T18:00:00.000Z',
              organizerLogoUrl: 'https://example.com/logo.png',
              insight: 'Fits your goals',
            },
          ],
        },
        events: [
          {
            id: 'event-1',
            title: 'Expo Jam',
            slug: 'expo-jam',
            startTime: '2026-04-10T18:00:00.000Z',
            endTime: '2026-04-10T19:00:00.000Z',
            organizerName: 'KureCal',
            organizerLogoUrl: 'https://example.com/logo.png',
            badges: ['Saved'],
            insight: 'Fits your goals',
            format: 'hybrid',
            engagement: {
              isBookmarked: true,
              status: 'attending',
            },
          },
        ],
      }).events[0]?.engagement?.status
    ).toBe('attending');
  });

  it('parses calendar connection and event sync state contracts', () => {
    expect(
      mobileCalendarConnectionStatusSchema.parse({
        provider: 'google',
        connected: true,
        isActive: true,
        hasRefreshToken: true,
        status: 'connected',
        calendarId: 'primary',
        lastSyncStatus: 'success',
        lastSyncAt: '2026-05-01T00:00:00.000Z',
        lastSyncError: null,
      }).status
    ).toBe('connected');

    expect(
      mobileCalendarSyncStateSchema.parse({
        provider: 'google',
        status: 'synced',
        syncedAt: '2026-05-01T00:00:00.000Z',
        externalEventId: 'google-event-1',
      }).externalEventId
    ).toBe('google-event-1');
  });

  it('parses dashboard summaries with hero and section cards', () => {
    const parsed = mobileDashboardSummarySchema.parse({
      hero: {
        eyebrow: 'Dashboard',
        title: 'Your momentum, in one pass.',
        subtitle: 'A mobile-first overview of recommendations and plans.',
        highlight: 'AI Builders Night',
      },
      metrics: [
        {
          id: 'tracked',
          label: 'Tracked',
          value: '3',
          detail: 'Events connected to your planning flow.',
        },
      ],
      recommendationsLabel: 'Recommended next',
      recommendations: [
        {
          id: 'event-hero',
          title: 'AI Builders Night',
          slug: 'ai-builders-night',
          startTime: '2026-04-12T18:00:00.000Z',
          organizerName: 'KureCal',
        },
      ],
      upcomingLabel: 'Planned next',
      upcoming: [
        {
          id: 'event-1',
          title: 'Upcoming event',
          slug: 'upcoming-event',
          startTime: '2026-04-15T18:00:00.000Z',
        },
      ],
      onboardingState: {
        hasCompleted: false,
        title: 'Career profile incomplete',
        body: 'Finish onboarding to improve recommendations and planning quality.',
        ctaLabel: 'Finish onboarding',
      },
      topRecommendation: {
        event: {
          id: 'event-hero',
          title: 'AI Builders Night',
          slug: 'ai-builders-night',
          startTime: '2026-04-12T18:00:00.000Z',
          organizerName: 'KureCal',
          score: 88,
        },
        daysUntil: 7,
        impactLabel: 'High Impact',
        reason: 'Strong alignment with your current goals',
      },
      upcomingCommitments: [
        {
          trackingId: 'tracking-1',
          daysUntil: 3,
          event: {
            id: 'event-1',
            title: 'Upcoming event',
            slug: 'upcoming-event',
            startTime: '2026-04-15T18:00:00.000Z',
          },
        },
      ],
      showOpenCommitmentSlot: true,
      insights: {
        pipeline: {
          trackedUpcomingCount: 4,
          scoredUpcomingCount: 3,
          avgScore: 76,
          highFitCount: 2,
          topEvents: [
            {
              eventId: 'event-hero',
              title: 'AI Builders Night',
              score: 88,
            },
          ],
        },
        funnel: {
          savedOnly: 2,
          rsvped: 3,
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
          attendedCount: 3,
          ratedCount: 2,
          connectionsMade: 7,
        },
        recentWins: [
          {
            event: {
              id: 'event-attended',
              title: 'Product Forum',
              slug: 'product-forum',
              startTime: '2026-04-02T18:00:00.000Z',
            },
            score: 78,
            trackedAt: '2026-03-18T00:00:00.000Z',
            attendedDate: '2026-04-02T18:00:00.000Z',
            matchedSkills: ['Product Strategy'],
            matchedGoals: ['networking'],
            bookmarkedLeadDays: 12,
            feedbackSubmitted: true,
            actualValueRating: 4,
          },
        ],
        hiddenCount: 0,
      },
      engagementStreak: {
        currentWeekStreak: 2,
        longestWeekStreak: 5,
        recentWeeks: [
          { weekKey: '2026-02-16', active: false },
          { weekKey: '2026-02-23', active: true },
          { weekKey: '2026-03-02', active: true },
          { weekKey: '2026-03-09', active: false },
          { weekKey: '2026-03-16', active: true },
          { weekKey: '2026-03-23', active: true },
          { weekKey: '2026-03-30', active: false },
          { weekKey: '2026-04-06', active: true },
        ],
        nudgeMessage: 'One event next week extends your streak to 3.',
      },
      discoveryBreadth: {
        categoryCount: 3,
        organizerCount: 2,
        formatCounts: {
          virtual: 1,
          'in-person': 1,
          hybrid: 1,
        },
        breadthLabel: 'balanced',
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
            startTime: '2026-04-02T18:00:00.000Z',
            location: 'Remote',
            format: 'Hybrid',
          },
        },
      },
      predictionAccuracy: {
        accuracy: 82,
        sampleSize: 4,
        confidenceLabel: 'learning',
        state: 'ready',
        unlockMessage: null,
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
          id: 'event-attended',
          title: 'Product Forum',
          slug: 'product-forum',
          startTime: '2026-04-02T18:00:00.000Z',
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
    });

    expect(parsed.hero.highlight).toBe('AI Builders Night');
    expect(parsed.upcoming.length).toBe(1);
    expect(parsed.recommendations.length).toBe(1);
    expect(parsed.topRecommendation?.impactLabel).toBe('High Impact');
    expect(parsed.insights?.pipeline.avgScore).toBe(76);
    expect(parsed.monthlyPulse?.trend.length).toBe(4);
    expect(parsed.performance?.recentWins[0]?.feedbackSubmitted).toBe(true);
    expect(parsed.careerImpact?.skillProgress[0]?.progressLevel).toBe('building');
    expect(parsed.careerOutcomes?.state).toBe('mature');
    expect(parsed.networkPulse?.pendingRequestCount).toBe(2);
    expect(parsed.networkPulse?.nextContactToConfirm?.name).toBe('Jamie Chen');
  });

  it('parses calendar month feeds with grid days and agenda events', () => {
    const parsed = mobileCalendarFeedSchema.parse({
      header: {
        eyebrow: 'Calendar',
        title: 'Plan your month',
        subtitle: 'A month view for your tracked and upcoming events',
      },
      month: {
        monthStart: '2026-05-01',
        monthEnd: '2026-05-31',
        label: 'May 2026',
      },
      today: '2026-05-12',
      metrics: {
        totalCount: 2,
        savedCount: 1,
        attendingCount: 1,
      },
      results: {
        returnedCount: 2,
        totalCount: 2,
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
            count: 2,
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
          free: 2,
          paid: 0,
        },
        tags: {
          expo: 2,
        },
      },
      days: Array.from({ length: 42 }, (_, index) => ({
        dateKey: `2026-05-${String((index % 31) + 1).padStart(2, '0')}`,
        dayNumber: (index % 31) + 1,
        inCurrentMonth: true,
        isToday: index === 11,
        eventCount: index === 11 ? 2 : 0,
        savedCount: index === 11 ? 1 : 0,
        attendingCount: index === 11 ? 1 : 0,
      })),
      events: [
        {
          id: 'event-1',
          title: 'May kickoff',
          startTime: '2026-05-12T18:00:00.000Z',
          endTime: '2026-05-12T20:00:00.000Z',
          dateKey: '2026-05-12',
          timezone: 'America/Edmonton',
          eventTypeId: 'meetup',
          eventTypeName: 'Meetup',
          eventTypeColor: '#2dd4bf',
          isAllDay: false,
          isFree: true,
          engagement: {
            isBookmarked: true,
            status: 'attending',
          },
        },
      ],
      emptyState: {
        title: 'No events this month',
        description: 'Move to another month to keep exploring.',
        body: 'Move to another month to keep exploring.',
      },
    });

    expect(parsed.days).toHaveLength(42);
    expect(parsed.events[0]?.dateKey).toBe('2026-05-12');
    expect(parsed.metrics.attendingCount).toBe(1);
    expect(parsed.filters.location).toBe('Calgary');
  });

  it('parses rich event detail payloads for mobile detail screens', () => {
    const parsed = mobileEventDetailSchema.parse({
      event: {
        id: 'event-1',
        title: 'Expo Ship Week',
        startTime: '2026-04-20T18:00:00.000Z',
        endTime: '2026-04-20T20:00:00.000Z',
        registrationUrl: 'https://example.com/register',
        sourceUrl: 'https://example.com/event',
        metaLabel: 'Conference',
      },
      host: {
        name: 'KureCal',
        logoUrl: 'https://example.com/logo.png',
      },
      tags: ['expo', 'react-native'],
      speakerLineup: [
        {
          id: 'speaker-1',
          name: 'Ada Lovelace',
          title: 'Founder',
        },
      ],
      agenda: [
        {
          id: 'agenda-1',
          dayNumber: 1,
          startTime: '2026-04-20T18:00:00.000Z',
          endTime: '2026-04-20T18:30:00.000Z',
          title: 'Opening keynote',
          topics: ['Expo'],
          isSaved: true,
          speakers: [],
        },
      ],
      networkingPulse: {
        state: 'active',
        trendingTopic: {
          label: 'Expo',
          activityLabel: 'Highly active',
        },
        mostSavedSession: {
          agendaItemId: 'agenda-1',
          title: 'Opening keynote',
          saveCount: 12,
        },
      },
    });

    expect(parsed.host?.name).toBe('KureCal');
    expect(parsed.speakerLineup?.[0]?.name).toBe('Ada Lovelace');
    expect(parsed.agenda?.[0]?.title).toBe('Opening keynote');
    expect(parsed.agenda?.[0]?.isSaved).toBe(true);
    expect(parsed.networkingPulse?.trendingTopic?.label).toBe('Expo');
  });

  it('parses saved feeds and profile state payloads for phase 3 surfaces', () => {
    const saved = mobileSavedEventsFeedSchema.parse({
      header: {
        eyebrow: 'Saved',
        title: 'Your shortlist',
      },
      totalCount: 1,
      nextPage: null,
      events: [
        {
          id: 'event-1',
          title: 'Saved event',
          startTime: '2026-04-20T18:00:00.000Z',
          engagement: {
            isBookmarked: true,
            status: null,
          },
        },
      ],
    });
    const profile = mobileProfileStateSchema.parse({
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
      careerProfile: {
        currentRole: 'Software Engineer',
        seniority: 'senior',
        industry: 'Technology',
        primarySkills: ['TypeScript', 'React'],
        skillsToLearn: ['AI'],
        interests: ['Developer tools'],
        careerGoals: ['skill-development'],
        timeframe: 'medium-term',
        learningStyle: ['hands-on'],
        networkingGoals: ['find-peers'],
        preferredEventTypes: ['conference'],
      },
    });

    expect(saved.events[0]?.engagement?.isBookmarked).toBe(true);
    expect(profile.socialProfile.username).toBe('ada');
  });

  it('parses onboarding bootstrap payloads and engagement mutations', () => {
    const bootstrap = mobileCareerOnboardingBootstrapSchema.parse({
      status: {
        onboarded: false,
        source: 'none',
      },
      initialData: null,
      taxonomy: {
        roleGroups: [
          {
            key: 'engineering',
            label: 'Engineering',
            roles: ['Software Engineer'],
          },
        ],
        skillOptions: [
          {
            value: 'TypeScript',
            label: 'TypeScript',
            category: 'Programming Languages',
          },
        ],
        interestOptions: [
          {
            value: 'Developer tools',
            label: 'Developer tools',
          },
        ],
        roleSuggestions: {
          'Software Engineer': {
            current: ['TypeScript'],
            learn: ['AI'],
          },
        },
      },
    });
    const mutation = mobileEventEngagementUpdateSchema.parse({
      isBookmarked: true,
    });

    expect(bootstrap.taxonomy.roleGroups[0]?.roles[0]).toBe('Software Engineer');
    expect(mutation.isBookmarked).toBe(true);
  });

  it('parses mobile networking feedback payloads', () => {
    const parsed = mobileEventNetworkingFeedbackSchema.parse({
      eventId: 'event-1',
      actualValueRating: 4,
      connectionsMade: 2,
      linkedinRequestsSent: 4,
    });

    expect(parsed.actualValueRating).toBe(4);
    expect(parsed.connectionsMade).toBe(2);
    expect(parsed.linkedinRequestsSent).toBe(4);
  });

  it('accepts a review rating and requires at least one field when updating mobile feedback', () => {
    expect(
      mobileEventNetworkingFeedbackUpdateSchema.parse({ actualValueRating: 5 })
        .actualValueRating
    ).toBe(5);
    expect(() => mobileEventNetworkingFeedbackUpdateSchema.parse({})).toThrow(
      'At least one feedback field must be provided.'
    );
  });
});
