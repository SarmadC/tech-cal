import { describe, expect, it } from 'vitest';

import {
  mobileCalendarFeedSchema,
  mobileCareerOnboardingBootstrapSchema,
  mobileDashboardSummarySchema,
  mobileDiscoverFeedSchema,
  mobileEventDetailSchema,
  mobileEventEngagementUpdateSchema,
  mobileProfileStateSchema,
  mobileSavedEventsFeedSchema,
} from './mobile';

describe('mobile domain contracts', () => {
  it('parses discover feeds with event engagement metadata', () => {
    expect(
      mobileDiscoverFeedSchema.parse({
        header: {
          eyebrow: 'Discover',
          title: 'Find your next event',
          subtitle: 'Fresh events for this week',
        },
        totalCount: 12,
        nextPage: 2,
        events: [
          {
            id: 'event-1',
            title: 'Expo Jam',
            startTime: '2026-04-10T18:00:00.000Z',
            endTime: '2026-04-10T19:00:00.000Z',
            organizerName: 'KureCal',
            engagement: {
              isBookmarked: true,
              status: 'attending',
            },
          },
        ],
      }).events[0]?.engagement?.status
    ).toBe('attending');
  });

  it('parses dashboard summaries with hero and section cards', () => {
    const parsed = mobileDashboardSummarySchema.parse({
      header: {
        eyebrow: 'Dashboard',
        title: 'Your event runway',
      },
      upcomingCount: 3,
      savedCount: 5,
      recommendationCount: 18,
      heroEvent: {
        id: 'event-hero',
        title: 'AI Builders Night',
        startTime: '2026-04-12T18:00:00.000Z',
        organizerName: 'KureCal',
      },
      upcomingEvents: [
        {
          id: 'event-1',
          title: 'Upcoming event',
          startTime: '2026-04-15T18:00:00.000Z',
        },
      ],
      recommendedEvents: [
        {
          id: 'event-2',
          title: 'Recommended event',
          startTime: '2026-04-16T18:00:00.000Z',
        },
      ],
    });

    expect(parsed.heroEvent?.title).toBe('AI Builders Night');
    expect(parsed.upcomingEvents?.length).toBe(1);
    expect(parsed.recommendedEvents?.length).toBe(1);
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
          eventTypeName: 'Meetup',
          eventTypeColor: '#2dd4bf',
          isAllDay: false,
          engagement: {
            isBookmarked: true,
            status: 'attending',
          },
        },
      ],
      emptyState: {
        title: 'No events this month',
        description: 'Move to another month to keep exploring.',
      },
    });

    expect(parsed.days).toHaveLength(42);
    expect(parsed.events[0]?.dateKey).toBe('2026-05-12');
    expect(parsed.metrics.attendingCount).toBe(1);
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
          speakers: [],
        },
      ],
    });

    expect(parsed.host?.name).toBe('KureCal');
    expect(parsed.speakerLineup?.[0]?.name).toBe('Ada Lovelace');
    expect(parsed.agenda?.[0]?.title).toBe('Opening keynote');
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
});
