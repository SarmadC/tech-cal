import { beforeEach, describe, expect, it, vi } from "vitest";
import { mobileCommunityNetworkingHomeSchema } from "@kurecal/domain";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  createServiceClient: vi.fn(),
  getHomeData: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
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

describe("GET /api/mobile/community/home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    mocks.createServiceClient.mockReturnValue({ kind: "read-supabase" });
  });

  it("returns the signed-in mobile community home payload", async () => {
    mocks.getApiAuthContext.mockResolvedValue({
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
              format: "in_person",
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

    const response = await GET(
      new Request("http://localhost/api/mobile/community/home"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    const parsed = mobileCommunityNetworkingHomeSchema.parse(payload.data);
    expect(parsed.upcomingMoments).toHaveLength(1);
    expect(parsed.upcomingMoments[0]?.recentTrackerCount).toBe(3);
    expect(parsed.upcomingMoments[0]?.imageUrl).toBe(
      "https://example.com/design-review-week.png",
    );
    expect(parsed.upcomingMoments[0]?.primaryReason).toBeTruthy();
    expect(parsed.upcomingMoments[0]?.primaryReason).not.toMatch(/\brooms?\b/i);
    expect(parsed.upcomingMoments[0]?.whyNow).not.toMatch(/\brooms?\b/i);
    expect(parsed.peopleToMeet[0]?.whyNow).toBeTruthy();
    expect(parsed.followUpNow[0]?.strongestSharedEvent?.title).toBe(
      "Spring Summit",
    );
    expect(parsed.speakerMatches?.[0]?.speaker.name).toBe("Jamie Chen");
    expect(parsed.speakerMatches?.[0]?.isPastEvent).toBe(true);
    expect(parsed.ambientActivity?.publicTrackersToday).toBe(18);
  });

  it("returns 401 when the mobile user is not authenticated", async () => {
    mocks.getApiAuthContext.mockResolvedValue({
      user: null,
    });

    const response = await GET(
      new Request("http://localhost/api/mobile/community/home"),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
  });

  it("serializes real fallback events even when attendee signal is zero", async () => {
    mocks.getApiAuthContext.mockResolvedValue({
      user: { id: "22222222-2222-4222-8222-222222222222" },
    });
    mocks.getHomeData.mockResolvedValue({
      summary: {
        trackedUpcomingCount: 0,
        visibleOpportunityCount: 0,
        followUpCount: 0,
        attendanceVisibilityEnabled: false,
      },
      priorityEvents: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          slug: "mcp-dev-summit",
          title: "MCP Dev Summit",
          startTime: "2026-04-02T00:00:00.000Z",
          imageUrl: null,
          location: "Remote",
          format: "virtual",
          viewerContext: "saved",
          totalAttendeeCount: 0,
          visibleAttendeeCount: 0,
          networkAttendingCount: 0,
          relationshipAttendeeCount: 0,
          attendeePreview: [],
        },
      ],
      meetPeople: [],
      followUps: [],
      ambientActivity: {
        publicTrackersToday: 0,
        newPublicProfilesThisWeek: 0,
        roomsWithFreshTrackingCount: 0,
      },
    });

    const response = await GET(
      new Request("http://localhost/api/mobile/community/home"),
    );
    const payload = await response.json();
    const parsed = mobileCommunityNetworkingHomeSchema.parse(payload.data);

    expect(response.status).toBe(200);
    expect(parsed.upcomingMoments).toHaveLength(1);
    expect(parsed.upcomingMoments[0]?.attendeePreview).toEqual([]);
    expect(parsed.upcomingMoments[0]?.primaryReason).toBeTruthy();
    expect(parsed.upcomingMoments[0]?.whyNow).toBeTruthy();
  });
});
