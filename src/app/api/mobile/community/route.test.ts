import { beforeEach, describe, expect, it, vi } from "vitest";

import { mobileCommunityHomeSchema } from "@kurecal/domain";

import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  getCircles: vi.fn(),
  getFeedPageData: vi.fn(),
  getHomeData: vi.fn(),
}));

vi.mock("@/utils/supabase/requestAuth", () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock("@/utils/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}));

vi.mock("@/services/communityNetworkingHomeService", () => ({
  CommunityNetworkingHomeService: {
    getHomeData: (...args: unknown[]) => mocks.getHomeData(...args),
  },
}));

vi.mock("@/services/communityCirclesService", () => ({
  CommunityCirclesService: {
    getCircles: (...args: unknown[]) => mocks.getCircles(...args),
  },
}));

vi.mock("@/services/communityHubService", () => ({
  CommunityHubService: {
    getFeedPageData: (...args: unknown[]) => mocks.getFeedPageData(...args),
  },
}));

describe("/api/mobile/community", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    mocks.createServiceClient.mockReturnValue({ kind: "read-supabase" });
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: "bearer",
      supabase: { kind: "viewer-supabase" },
      user: { id: "22222222-2222-4222-8222-222222222222" },
    });
    mocks.getHomeData.mockResolvedValue({
      summary: {
        trackedUpcomingCount: 2,
        visibleOpportunityCount: 1,
        followUpCount: 1,
        attendanceVisibilityEnabled: true,
      },
      priorityEvents: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          slug: "design-review-week",
          title: "Design Review Week",
          startTime: "2026-04-02T18:00:00.000Z",
          imageUrl: "https://example.com/design-review-week.png",
          location: "Remote",
          format: "virtual",
          viewerContext: "attending",
          recentTrackerCount: 3,
          totalAttendeeCount: 12,
          visibleAttendeeCount: 4,
          networkAttendingCount: 2,
          relationshipAttendeeCount: 1,
          attendeePreview: [
            {
              id: "99999999-9999-4999-8999-999999999999",
              fullName: "Jordan",
              username: "jordan",
              avatarUrl: null,
              isInNetwork: false,
              followsViewer: false,
              isMutualFollow: false,
            },
          ],
          speakers: [
            {
              id: "speaker-1",
              name: "Jamie Chen",
              title: "AI Product Designer",
              company: "Signal Labs",
              photoUrl: null,
              linkedinUrl: null,
              twitterUrl: null,
              websiteUrl: null,
            },
          ],
        },
      ],
      meetPeople: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          fullName: "Ada Lovelace",
          username: "ada",
          avatarUrl: null,
          headline: "Staff engineer",
          location: "Remote",
          currentRole: "Staff engineer",
          industry: "Developer tools",
          companySize: "medium",
          mutualConnectionsCount: 4,
          isInNetwork: true,
          followsViewer: false,
          isMutualFollow: false,
          sharedUpcomingEventCount: 2,
          soonestSharedEventStartTime: "2026-04-02T18:00:00.000Z",
          sharedEvents: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              slug: "design-review-week",
              title: "Design Review Week",
              startTime: "2026-04-02T18:00:00.000Z",
              location: "Remote",
              format: "virtual",
              viewerContext: "attending",
            },
          ],
        },
      ],
      followUps: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          fullName: "Grace Hopper",
          username: "grace",
          avatarUrl: null,
          headline: "Platform lead",
          location: "Calgary",
          currentRole: "Platform lead",
          industry: "Infrastructure",
          companySize: "large",
          mutualConnectionsCount: 2,
          isInNetwork: false,
          followsViewer: true,
          isMutualFollow: false,
          sharedPastEventCount: 1,
          mostRecentSharedEventStartTime: "2026-03-20T18:00:00.000Z",
          sharedEvents: [
            {
              id: "55555555-5555-4555-8555-555555555555",
              slug: "spring-summit",
              title: "Spring Summit",
              startTime: "2026-03-20T18:00:00.000Z",
              location: "Calgary",
              format: "in-person",
            },
          ],
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
        roomsWithFreshTrackingCount: 1,
      },
    });
    mocks.getCircles.mockResolvedValue([
      {
        id: "circle-1",
        slug: "mobile-devs",
        name: "Mobile Devs",
        description: "Mobile builders.",
        isJoined: true,
        memberCount: 88,
      },
    ]);
    mocks.getFeedPageData.mockResolvedValue({
      feed: [
        {
          id: "post-1",
          title: "Local AI evals",
          content: "What are people using for local AI evals?",
          createdAt: "2026-04-01T18:00:00.000Z",
          author: {
            id: "author-1",
            fullName: "Maya Patel",
            avatarUrl: null,
          },
          circle: {
            slug: "ai-builders",
            name: "AI Builders",
          },
          commentCount: 9,
          isTrending: true,
          recentComments: [],
        },
      ],
      circles: [],
      upcomingEvents: [],
    });
  });

  it("returns the typed mobile community hub contract", async () => {
    const response = await GET(
      new Request("http://localhost/api/mobile/community", {
        headers: { Authorization: "Bearer mobile-token" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    const parsed = mobileCommunityHomeSchema.parse(payload.data);
    expect(parsed.upcomingMoments).toHaveLength(1);
    expect(parsed.upcomingMoments[0]?.recentTrackerCount).toBe(3);
    expect(parsed.upcomingMoments[0]?.speakerPreview?.[0]?.name).toBe(
      "Jamie Chen",
    );
    expect(parsed.peopleToMeet[0]?.whyNow).toBeTruthy();
    expect(parsed.followUpNow[0]?.strongestSharedEvent?.title).toBe(
      "Spring Summit",
    );
    expect(parsed.speakerMatches?.[0]?.speaker.name).toBe("Jamie Chen");
    expect(parsed.ambientActivity).toBeUndefined();
    expect(parsed.feed?.[0]?.circle.slug).toBe("ai-builders");
    expect(parsed.circles?.[0]?.slug).toBe("mobile-devs");
    expect(parsed.communityUpcomingEvents).toBeUndefined();
    expect(mocks.createServiceClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key",
    );
    expect(mocks.getHomeData).toHaveBeenCalledWith({
      viewerId: "22222222-2222-4222-8222-222222222222",
      readClient: { kind: "read-supabase" },
    });
    expect(mocks.getCircles).toHaveBeenCalledWith({
      viewerId: "22222222-2222-4222-8222-222222222222",
      readClient: { kind: "read-supabase" },
    });
    expect(mocks.getFeedPageData).toHaveBeenCalledWith({
      viewerId: "22222222-2222-4222-8222-222222222222",
      readClient: { kind: "read-supabase" },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request("http://localhost/api/mobile/community"),
    );

    expect(response.status).toBe(401);
  });

  it("returns networking data when circles fail", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.getCircles.mockRejectedValueOnce(new Error("circles unavailable"));

    const response = await GET(
      new Request("http://localhost/api/mobile/community", {
        headers: { Authorization: "Bearer mobile-token" },
      }),
    );
    const payload = await response.json();
    const parsed = mobileCommunityHomeSchema.parse(payload.data);

    expect(response.status).toBe(200);
    expect(parsed.upcomingMoments).toHaveLength(1);
    expect(parsed.circles).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("returns networking data when feed fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.getFeedPageData.mockRejectedValueOnce(new Error("feed unavailable"));

    const response = await GET(
      new Request("http://localhost/api/mobile/community", {
        headers: { Authorization: "Bearer mobile-token" },
      }),
    );
    const payload = await response.json();
    const parsed = mobileCommunityHomeSchema.parse(payload.data);

    expect(response.status).toBe(200);
    expect(parsed.upcomingMoments).toHaveLength(1);
    expect(parsed.feed).toEqual([]);
    expect(parsed.circles?.[0]?.slug).toBe("mobile-devs");
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
