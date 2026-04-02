import { describe, expect, it } from "vitest";
import {
  mobileCalendarFeedRequestSchema,
  mobileCalendarFeedSchema,
  mobileCommunityNetworkingHomeSchema,
  mobileDashboardHomeSchema,
  mobileDiscoverFeedSchema,
  mobileDiscoverFeedRequestSchema,
  mobileEventDetailSchema,
  mobileSpeakerDetailSchema,
} from "./mobile";

const eventCard = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Signal Event",
  slug: "signal-event",
  description: "Event description",
  location: "Remote",
  startTime: "2026-04-02T18:00:00.000Z",
  endTime: "2026-04-02T19:00:00.000Z",
  imageUrl: null,
  organizerLogoUrl: null,
  organizerName: "KureCal",
  score: 92,
  engagement: { isBookmarked: true, status: null },
  badges: ["Saved"],
  insight: "Fresh recommendation",
  timeLabel: "Apr 2 • 6:00 PM",
  format: "virtual",
  formatLabel: "Remote",
  priceLabel: "Free",
};

describe("mobile domain contracts", () => {
  it("parses the discover feed payload", () => {
    const payload = mobileDiscoverFeedSchema.parse({
      header: {
        eyebrow: "KureCal mobile",
        title: "Discover",
        subtitle: "Ranked feed",
      },
      controls: {
        rankingModes: [
          {
            id: "best-match",
            label: "Best match",
            description: "Ranked by fit",
          },
          {
            id: "trending",
            label: "Trending",
            description: "Ranked by momentum",
          },
          { id: "soonest", label: "Soonest", description: "Ordered by time" },
        ],
        activeRankingMode: "best-match",
      },
      activeState: {
        resultLabel: "1 ranked pick",
        supportingText: "Server-ranked recommendations.",
      },
      results: {
        returnedCount: 1,
        totalCount: 1,
        hasMore: false,
      },
      filters: {
        searchTerm: "",
        categories: [],
        tags: [],
        location: null,
        dateRange: {
          start: null,
          end: null,
        },
        format: "all",
        cost: "all",
        activeCount: 0,
      },
      availableFilters: {
        categories: [{ id: "cat-1", name: "Conference", count: 2 }],
        tags: [{ value: "ai", label: "AI", count: 3 }],
      },
      counts: {
        format: {
          virtual: 1,
          "in-person": 0,
          hybrid: 0,
        },
        cost: {
          free: 1,
          paid: 0,
        },
        categories: {
          "cat-1": 1,
        },
        tags: {
          ai: 1,
        },
      },
      topPicks: null,
      events: [eventCard],
    });

    expect(payload.events[0]?.title).toBe("Signal Event");
    expect(payload.availableFilters.tags[0]?.label).toBe("AI");
  });

  it("parses a discover feed payload with top picks", () => {
    const payload = mobileDiscoverFeedSchema.parse({
      header: {
        eyebrow: "KureCal mobile",
        title: "Discover",
        subtitle: "Ranked feed",
      },
      controls: {
        rankingModes: [
          {
            id: "best-match",
            label: "Best match",
            description: "Ranked by fit",
          },
          {
            id: "trending",
            label: "Trending",
            description: "Ranked by momentum",
          },
          { id: "soonest", label: "Soonest", description: "Ordered by time" },
        ],
        activeRankingMode: "best-match",
      },
      activeState: {
        resultLabel: "4 ranked picks",
        supportingText: "Server-ranked recommendations.",
      },
      results: {
        returnedCount: 1,
        totalCount: 4,
        hasMore: false,
      },
      filters: {
        searchTerm: "",
        categories: [],
        tags: [],
        location: null,
        dateRange: {
          start: null,
          end: null,
        },
        format: "all",
        cost: "all",
        activeCount: 0,
      },
      availableFilters: {
        categories: [{ id: "cat-1", name: "Conference", count: 4 }],
        tags: [{ value: "ai", label: "AI", count: 3 }],
      },
      counts: {
        format: {
          virtual: 4,
          "in-person": 0,
          hybrid: 0,
        },
        cost: {
          free: 4,
          paid: 0,
        },
        categories: {
          "cat-1": 4,
        },
        tags: {
          ai: 3,
        },
      },
      topPicks: {
        title: "Your Top Picks",
        cards: [
          eventCard,
          {
            ...eventCard,
            id: "22222222-2222-4222-8222-222222222222",
            title: "Second Signal Event",
          },
        ],
      },
      events: [eventCard],
    });

    expect(payload.topPicks?.cards).toHaveLength(2);
    expect(payload.topPicks?.title).toBe("Your Top Picks");
  });

  it("parses the discover request payload with pagination", () => {
    const payload = mobileDiscoverFeedRequestSchema.parse({
      rankingMode: "trending",
      searchTerm: "AI events",
      categories: ["cat-1"],
      tags: ["ai"],
      location: "Calgary",
      dateRange: {
        start: "2026-04-01",
        end: "2026-04-30",
      },
      format: "virtual",
      cost: "free",
      page: 2,
    });

    expect(payload.page).toBe(2);
    expect(payload.rankingMode).toBe("trending");
  });

  it("parses the dashboard home payload", () => {
    const payload = mobileDashboardHomeSchema.parse({
      hero: {
        eyebrow: "Dashboard",
        title: "Your momentum, in one pass.",
        subtitle: "A mobile-first overview.",
        highlight: "Top Career Move",
      },
      metrics: [
        {
          id: "tracked",
          label: "Tracked",
          value: "8",
          detail: "Tracked events",
        },
      ],
      recommendationsLabel: "Recommended next",
      recommendations: [eventCard],
      upcomingLabel: "Planned next",
      upcoming: [eventCard],
      onboardingState: {
        hasCompleted: true,
        title: "Profile calibrated",
        body: "Your ranking model is using the richer profile.",
        ctaLabel: null,
      },
    });

    expect(payload.hero.highlight).toBe("Top Career Move");
  });

  it("parses the speaker detail payload", () => {
    const payload = mobileSpeakerDetailSchema.parse({
      id: "speaker-1",
      name: "Dana Scully",
      title: "AI Research Lead",
      company: "Signal Labs",
      bio: "Leads applied AI research.",
      photoUrl: "https://example.com/dana.jpg",
      linkedinUrl: "https://linkedin.com/in/dana",
      twitterUrl: null,
      websiteUrl: "https://signals.example/dana",
      events: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          slug: "design-review-week",
          title: "Design Review Week",
          startTime: "2026-04-02T18:00:00.000Z",
          location: "Remote",
          format: "virtual",
          isPastEvent: false,
        },
      ],
    });

    expect(payload.name).toBe("Dana Scully");
    expect(payload.events[0]?.title).toBe("Design Review Week");
  });

  it("parses the networking community home payload with richer profile cards", () => {
    const payload = mobileCommunityNetworkingHomeSchema.parse({
      summary: {
        trackedUpcomingCount: 1,
        visibleOpportunityCount: 1,
        followUpCount: 1,
        attendanceVisibilityEnabled: true,
      },
      upcomingMoments: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          slug: "signal-room",
          title: "Signal Room",
          startTime: "2026-04-02T18:00:00.000Z",
          imageUrl: "https://example.com/signal-room.png",
          location: "Remote",
          format: "virtual",
          viewerContext: "attending",
          recentTrackerCount: 3,
          totalAttendeeCount: 5,
          visibleAttendeeCount: 2,
          networkAttendingCount: 1,
          relationshipAttendeeCount: 1,
          attendeePreview: [],
          speakerPreview: [
            {
              id: "speaker-1",
              name: "Ada Lovelace",
              title: "Staff engineer",
              company: "KureCal",
              photoUrl: null,
              linkedinUrl: "https://linkedin.com/in/ada",
              twitterUrl: null,
              websiteUrl: null,
              matchedProfileUsername: null,
            },
          ],
          primaryReason: "Someone you know is already visible here.",
          whyNow: "This is where your network is already taking shape.",
          newVisibleAttendeeCount: 1,
          recommendedAction: "expand_people",
        },
      ],
      peopleToMeet: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          fullName: "Ada Lovelace",
          username: "ada",
          avatarUrl: null,
          headline: "Staff engineer",
          location: "San Francisco, CA",
          currentRole: "Staff engineer",
          industry: "Developer tools",
          companySize: "medium",
          mutualConnectionsCount: 12,
          isInNetwork: false,
          followsViewer: true,
          isMutualFollow: false,
          sharedUpcomingEventCount: 2,
          soonestSharedEventStartTime: "2026-04-02T18:00:00.000Z",
          sharedEvents: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              slug: "signal-room",
              title: "Signal Room",
              startTime: "2026-04-02T18:00:00.000Z",
              location: "Remote",
              format: "virtual",
              viewerContext: "attending",
            },
          ],
          strongestSharedEvent: {
            id: "11111111-1111-4111-8111-111111111111",
            slug: "signal-room",
            title: "Signal Room",
            startTime: "2026-04-02T18:00:00.000Z",
            location: "Remote",
            format: "virtual",
            viewerContext: "attending",
          },
          whyNow:
            "You overlap on more than one room, so the context is already there.",
          recommendedAction: "follow",
        },
      ],
      followUpNow: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          fullName: "Grace Hopper",
          username: "grace",
          avatarUrl: null,
          headline: "Platform lead",
          location: "Calgary, AB",
          currentRole: "Platform lead",
          industry: "Infrastructure",
          companySize: "large",
          mutualConnectionsCount: 3,
          isInNetwork: true,
          followsViewer: false,
          isMutualFollow: false,
          sharedPastEventCount: 1,
          mostRecentSharedEventStartTime: "2026-03-20T18:00:00.000Z",
          sharedEvents: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              slug: "follow-up-room",
              title: "Follow-up Room",
              startTime: "2026-03-20T18:00:00.000Z",
              location: "Calgary",
              format: "in-person",
            },
          ],
          strongestSharedEvent: {
            id: "44444444-4444-4444-8444-444444444444",
            slug: "follow-up-room",
            title: "Follow-up Room",
            startTime: "2026-03-20T18:00:00.000Z",
            location: "Calgary",
            format: "in-person",
          },
          whyNow:
            "You were both in the same room recently enough for a real follow-up.",
          recommendedAction: "expand_context",
        },
      ],
      speakerMatches: [
        {
          speaker: {
            id: "speaker-match-1",
            name: "Jamie Chen",
            title: "AI Product Designer",
            company: "Signal Labs",
            photoUrl: null,
            linkedinUrl: "https://linkedin.com/in/jamie-chen",
            twitterUrl: null,
            websiteUrl: null,
            matchedProfileUsername: null,
          },
          event: {
            id: "66666666-6666-4666-8666-666666666666",
            slug: "ai-product-summit",
            title: "AI Product Summit",
            startTime: "2026-02-10T18:00:00.000Z",
            location: "Remote",
            format: "virtual",
          },
          matchReason: "Aligned with your interest in AI.",
          isPastEvent: true,
        },
      ],
      ambientActivity: {
        publicTrackersToday: 18,
        newPublicProfilesThisWeek: 4,
        roomsWithFreshTrackingCount: 2,
      },
    });

    expect(payload.upcomingMoments[0]?.speakerPreview?.[0]?.name).toBe(
      "Ada Lovelace",
    );
    expect(payload.upcomingMoments[0]?.imageUrl).toBe(
      "https://example.com/signal-room.png",
    );
    expect(payload.speakerMatches?.[0]?.speaker.name).toBe("Jamie Chen");
    expect(payload.peopleToMeet[0]?.mutualConnectionsCount).toBe(12);
    expect(payload.followUpNow[0]?.location).toBe("Calgary, AB");
    expect(payload.ambientActivity?.publicTrackersToday).toBe(18);
  });

  it("parses the calendar feed request payload", () => {
    const payload = mobileCalendarFeedRequestSchema.parse({
      monthStart: "2026-04-01",
      tags: ["ai"],
      location: "Calgary",
      dateRange: {
        start: "2026-04-02",
        end: "2026-04-20",
      },
      cost: "free",
    });

    expect(payload.monthStart).toBe("2026-04-01");
    expect(payload.tags).toEqual(["ai"]);
  });

  it("parses the calendar month feed payload", () => {
    const payload = mobileCalendarFeedSchema.parse({
      month: {
        monthStart: "2026-04-01",
        monthEnd: "2026-04-30",
        label: "April 2026",
      },
      results: {
        returnedCount: 1,
        totalCount: 1,
      },
      filters: {
        tags: ["ai"],
        location: "Calgary",
        dateRange: {
          start: "2026-04-02",
          end: "2026-04-20",
        },
        cost: "free",
        activeCount: 4,
      },
      availableFilters: {
        tags: [{ value: "ai", label: "AI", count: 1 }],
        eventTypes: [
          {
            id: "conference",
            name: "Conference",
            color: "#2563EB",
            description: "Large format events",
          },
        ],
      },
      counts: {
        cost: {
          free: 1,
          paid: 0,
        },
        tags: {
          ai: 1,
        },
      },
      emptyState: {
        title: "No events this month",
        body: "Adjust a filter or move to another month.",
      },
      events: [
        {
          id: eventCard.id,
          title: eventCard.title,
          location: eventCard.location,
          startTime: eventCard.startTime,
          endTime: eventCard.endTime,
          timezone: "America/Edmonton",
          eventTypeId: "conference",
          organizerName: eventCard.organizerName,
          engagement: eventCard.engagement,
          timeLabel: "6:00 PM - 7:00 PM",
          priceLabel: eventCard.priceLabel,
          isFree: true,
        },
      ],
    });

    expect(payload.events[0]?.engagement?.isBookmarked).toBe(true);
    expect(payload.availableFilters.eventTypes[0]?.name).toBe("Conference");
  });

  it("parses the richer mobile event detail payload", () => {
    const payload = mobileEventDetailSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Signal Event",
      metaLabel: "Conference",
      description: "A deep event detail payload.",
      location: "Remote",
      startTime: "2026-04-02T18:00:00.000Z",
      endTime: "2026-04-02T19:00:00.000Z",
      timezone: "America/Edmonton",
      sourceUrl: "https://example.com/events/signal-event",
      registrationUrl: "https://tickets.example.com/signal-event",
      imageUrl: "https://example.com/event.png",
      host: {
        name: "KureCal",
        logoUrl: "https://example.com/logo.png",
      },
      tags: [
        {
          id: "tag-1",
          name: "AI",
          color: "#3B82F6",
          category: "technology",
        },
      ],
      agenda: [
        {
          id: "agenda-1",
          dayNumber: 1,
          startTime: "2026-04-02T18:00:00.000Z",
          endTime: "2026-04-02T18:30:00.000Z",
          title: "Opening keynote",
          description: "Welcome",
          location: "Main stage",
          type: "keynote",
          track: "General",
          topics: ["AI"],
          speakers: [
            {
              id: "speaker-1",
              name: "Ada Lovelace",
              title: "Founder",
              company: "Analytical Engines",
              photoUrl: "https://example.com/ada.png",
            },
          ],
        },
      ],
      speakerLineup: [
        {
          id: "speaker-1",
          name: "Ada Lovelace",
          title: "Founder",
          company: "Analytical Engines",
          photoUrl: "https://example.com/ada.png",
        },
      ],
      engagement: { isBookmarked: true, status: "attending" },
    });

    expect(payload.host.name).toBe("KureCal");
    expect(payload.agenda[0]?.speakers?.[0]?.name).toBe("Ada Lovelace");
    expect(payload.engagement?.status).toBe("attending");
  });
});
