import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  searchProfiles: vi.fn(),
  getBlockedUserIdsForViewer: vi.fn(),
}));

vi.mock("@/services/communityDirectoryService", () => ({
  CommunityDirectoryService: {
    searchProfiles: (...args: unknown[]) => mocks.searchProfiles(...args),
  },
}));

vi.mock("@/services/blockService", () => ({
  BlockService: {
    getBlockedUserIdsForViewer: (...args: unknown[]) =>
      mocks.getBlockedUserIdsForViewer(...args),
  },
}));

import {
  CommunityNetworkingHomeService,
  buildCommunityNetworkingHomeData,
  rankFollowUps,
  rankMeetPeople,
  rankPriorityEvents,
  type CommunityNetworkingAttendeeInput,
  type CommunityNetworkingEventInput,
} from "@/services/communityNetworkingHomeService";

function createEvent(
  overrides: Partial<CommunityNetworkingEventInput> &
    Pick<CommunityNetworkingEventInput, "id">,
): CommunityNetworkingEventInput {
  return {
    id: overrides.id,
    slug: overrides.slug || overrides.id,
    title: overrides.title || overrides.id,
    startTime: overrides.startTime || "2026-04-10T18:00:00.000Z",
    location: overrides.location || "Calgary",
    format: overrides.format || "in_person",
    viewerContext: overrides.viewerContext || "saved",
  };
}

function createAttendee(
  overrides: Partial<CommunityNetworkingAttendeeInput> &
    Pick<CommunityNetworkingAttendeeInput, "id" | "eventId">,
): CommunityNetworkingAttendeeInput {
  return {
    eventId: overrides.eventId,
    id: overrides.id,
    fullName: overrides.fullName || overrides.id,
    username: Object.prototype.hasOwnProperty.call(overrides, "username")
      ? (overrides.username ?? null)
      : overrides.id,
    avatarUrl: overrides.avatarUrl || null,
    headline: overrides.headline || null,
    location: overrides.location || null,
    currentRole: overrides.currentRole || null,
    industry: overrides.industry || null,
    companySize: overrides.companySize || null,
    mutualConnectionsCount: overrides.mutualConnectionsCount ?? 0,
    isInNetwork: overrides.isInNetwork || false,
    followsViewer: overrides.followsViewer || false,
    isMutualFollow: overrides.isMutualFollow || false,
    isVisibleToViewer: overrides.isVisibleToViewer ?? true,
  };
}

type QueryOperation = {
  type: string;
  args: unknown[];
};

function hasOperation(
  operations: QueryOperation[],
  type: string,
  column?: string,
  value?: unknown,
): boolean {
  return operations.some((operation) => {
    if (operation.type !== type) {
      return false;
    }

    if (column !== undefined && operation.args[0] !== column) {
      return false;
    }

    if (value !== undefined && operation.args[1] !== value) {
      return false;
    }

    return true;
  });
}

function getSelectClause(operations: QueryOperation[]): string | undefined {
  const selectOperation = operations.find(
    (operation) => operation.type === "select",
  );
  return typeof selectOperation?.args[0] === "string"
    ? selectOperation.args[0]
    : undefined;
}

function createReadClientMock({
  viewerEvents = [],
  trackedEvents = [],
  starterEvents = [],
  pastEvents = [],
  starterAttendanceRows = [],
  speakerRows = [],
  speakerDetails = [],
  attendeeProfiles = [],
  careerProfiles = [],
  viewerCareerProfile = null,
  followingIds = [],
  followedByIds = [],
  candidateFollowingRows = [],
  recentTrackingRows = [],
  publicTrackerIds = ["public-tracker"],
}: {
  viewerEvents?: Array<{
    event_id: string;
    status: "attending" | "attended" | "cancelled" | null;
    is_bookmarked: boolean | null;
  }>;
  trackedEvents?: Array<{
    id: string;
    slug: string;
    title: string | null;
    start_time: string;
    event_image_url?: string | null;
    source_url?: string | null;
    source_domain?: string | null;
    location: string | null;
    attendee_count: number | null;
    event_format: string | null;
    event_type_id: string | null;
    status: string | null;
  }>;
  starterEvents?: Array<{
    id: string;
    slug: string;
    title: string | null;
    start_time: string;
    event_image_url?: string | null;
    source_url?: string | null;
    source_domain?: string | null;
    location: string | null;
    attendee_count: number | null;
    event_format: string | null;
    event_type_id: string | null;
    status: string | null;
  }>;
  pastEvents?: Array<{
    id: string;
    slug: string;
    title: string | null;
    start_time: string;
    event_image_url?: string | null;
    source_url?: string | null;
    source_domain?: string | null;
    location: string | null;
    attendee_count: number | null;
    event_format: string | null;
    event_type_id: string | null;
    status: string | null;
  }>;
  starterAttendanceRows?: Array<{
    event_id: string;
    user_id: string;
    status: "attending" | "attended" | "cancelled" | null;
  }>;
  speakerRows?: Array<{
    event_id: string | null;
    speaker_id: string | null;
    speaker_name: string | null;
  }>;
  speakerDetails?: Array<{
    id: string;
    name: string;
    title: string | null;
    company: string | null;
    photo_url: string | null;
    linkedin_url: string | null;
    twitter_url: string | null;
    website_url: string | null;
  }>;
  attendeeProfiles?: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    headline: string | null;
    location: string | null;
    profile_visibility: string | null;
    show_attendance: boolean | null;
  }>;
  careerProfiles?: Array<{
    user_id: string;
    current_role: string | null;
    industry: string | null;
    company_size: string | null;
  }>;
  viewerCareerProfile?: {
    current_role: string | null;
    industry: string | null;
    interests: string[] | null;
  } | null;
  followingIds?: string[];
  followedByIds?: string[];
  candidateFollowingRows?: Array<{ follower_id: string; following_id: string }>;
  recentTrackingRows?: Array<{ event_id: string; user_id: string }>;
  publicTrackerIds?: string[];
}) {
  class QueryBuilder
    implements
      PromiseLike<{ data?: unknown; error: null; count?: number | null }>
  {
    private operations: QueryOperation[] = [];

    constructor(private readonly table: string) {}

    private record(type: string, args: unknown[]) {
      this.operations.push({ type, args });
      return this;
    }

    select(...args: unknown[]) {
      return this.record("select", args);
    }

    eq(...args: unknown[]) {
      return this.record("eq", args);
    }

    gt(...args: unknown[]) {
      return this.record("gt", args);
    }

    gte(...args: unknown[]) {
      return this.record("gte", args);
    }

    lt(...args: unknown[]) {
      return this.record("lt", args);
    }

    in(...args: unknown[]) {
      return this.record("in", args);
    }

    not(...args: unknown[]) {
      return this.record("not", args);
    }

    or(...args: unknown[]) {
      return this.record("or", args);
    }

    order(...args: unknown[]) {
      return this.record("order", args);
    }

    limit(...args: unknown[]) {
      return this.record("limit", args);
    }

    maybeSingle() {
      return Promise.resolve(resolveQuery(this.table, this.operations)).then(
        (result) => ({
          ...result,
          data: Array.isArray(result.data)
            ? (result.data[0] ?? null)
            : (result.data ?? null),
        }),
      );
    }

    then<
      TResult1 = { data?: unknown; error: null; count?: number | null },
      TResult2 = never,
    >(
      onfulfilled?:
        | ((value: {
            data?: unknown;
            error: null;
            count?: number | null;
          }) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | null,
    ): Promise<TResult1 | TResult2> {
      return Promise.resolve(resolveQuery(this.table, this.operations)).then(
        onfulfilled,
        onrejected,
      );
    }
  }

  function resolveQuery(table: string, operations: QueryOperation[]) {
    const selectClause = getSelectClause(operations);

    if (
      table === "profiles" &&
      selectClause === "show_attendance" &&
      hasOperation(operations, "eq", "id", "viewer-id")
    ) {
      return { data: [{ show_attendance: false }], error: null as null };
    }

    if (
      table === "profiles" &&
      selectClause === "id" &&
      hasOperation(operations, "eq", "profile_visibility", "public") &&
      hasOperation(operations, "gt", "bookmark_count_today", 0)
    ) {
      return { data: null, error: null as null, count: 12 };
    }

    if (
      table === "profiles" &&
      selectClause === "id" &&
      hasOperation(operations, "eq", "profile_visibility", "public") &&
      hasOperation(operations, "gte", "created_at")
    ) {
      return { data: null, error: null as null, count: 3 };
    }

    if (
      table === "profiles" &&
      selectClause === "id" &&
      hasOperation(operations, "eq", "profile_visibility", "public") &&
      hasOperation(operations, "in", "id")
    ) {
      return {
        data: publicTrackerIds.map((id) => ({ id })),
        error: null as null,
      };
    }

    if (
      table === "career_profiles" &&
      selectClause === "current_role, industry, interests" &&
      hasOperation(operations, "eq", "user_id", "viewer-id")
    ) {
      return {
        data: viewerCareerProfile ? [viewerCareerProfile] : [],
        error: null as null,
      };
    }

    if (
      table === "user_events" &&
      selectClause === "event_id, status, is_bookmarked" &&
      hasOperation(operations, "eq", "user_id", "viewer-id")
    ) {
      return { data: viewerEvents, error: null as null };
    }

    if (
      table === "user_events" &&
      selectClause === "event_id, user_id" &&
      hasOperation(operations, "eq", "is_bookmarked", true) &&
      hasOperation(operations, "in", "event_id")
    ) {
      return { data: recentTrackingRows, error: null as null };
    }

    if (
      table === "user_events" &&
      selectClause === "event_id, user_id, status" &&
      hasOperation(operations, "in", "event_id")
    ) {
      return { data: starterAttendanceRows, error: null as null };
    }

    if (
      table === "events" &&
      selectClause ===
        "id, slug, title, start_time, event_image_url, source_url, source_domain, location, attendee_count, event_format, event_type_id, status" &&
      hasOperation(operations, "lt", "start_time") &&
      hasOperation(operations, "gte", "start_time") &&
      !hasOperation(operations, "in", "id")
    ) {
      return { data: pastEvents, error: null as null };
    }

    if (
      table === "events" &&
      selectClause ===
        "id, slug, title, start_time, event_image_url, source_url, source_domain, location, attendee_count, event_format, event_type_id, status" &&
      hasOperation(operations, "gte", "start_time") &&
      !hasOperation(operations, "in", "id")
    ) {
      return { data: starterEvents, error: null as null };
    }

    if (
      table === "events" &&
      selectClause ===
        "id, slug, title, start_time, event_image_url, source_url, source_domain, location, attendee_count, event_format, event_type_id, status" &&
      hasOperation(operations, "in", "id")
    ) {
      return { data: trackedEvents, error: null as null };
    }

    if (
      table === "event_speakers_flat" &&
      selectClause === "event_id, speaker_id, speaker_name" &&
      hasOperation(operations, "in", "event_id")
    ) {
      return { data: speakerRows, error: null as null };
    }

    if (
      table === "speakers" &&
      selectClause ===
        "id, name, title, company, photo_url, linkedin_url, twitter_url, website_url" &&
      hasOperation(operations, "in", "id")
    ) {
      return { data: speakerDetails, error: null as null };
    }

    if (
      table === "profiles" &&
      selectClause ===
        "id, full_name, avatar_url, username, headline, location, profile_visibility, show_attendance" &&
      hasOperation(operations, "in", "id")
    ) {
      return { data: attendeeProfiles, error: null as null };
    }

    if (
      table === "career_profiles" &&
      selectClause === "user_id, current_role, industry, company_size" &&
      hasOperation(operations, "in", "user_id")
    ) {
      return { data: careerProfiles, error: null as null };
    }

    if (
      table === "follows" &&
      selectClause === "following_id" &&
      hasOperation(operations, "eq", "follower_id", "viewer-id")
    ) {
      return {
        data: followingIds.map((following_id) => ({ following_id })),
        error: null as null,
      };
    }

    if (
      table === "follows" &&
      selectClause === "follower_id" &&
      hasOperation(operations, "eq", "following_id", "viewer-id")
    ) {
      return {
        data: followedByIds.map((follower_id) => ({ follower_id })),
        error: null as null,
      };
    }

    if (
      table === "follows" &&
      selectClause === "follower_id, following_id" &&
      hasOperation(operations, "in", "follower_id")
    ) {
      return { data: candidateFollowingRows, error: null as null };
    }

    if (
      table === "profiles" &&
      selectClause === "id, username, profile_visibility" &&
      hasOperation(operations, "in", "id")
    ) {
      return { data: [], error: null as null };
    }

    throw new Error(
      `Unhandled query in test for table ${table}: ${JSON.stringify(operations)}`,
    );
  }

  return {
    from(table: string) {
      return new QueryBuilder(table);
    },
  };
}

beforeEach(() => {
  mocks.searchProfiles.mockReset();
  mocks.searchProfiles.mockResolvedValue({
    profiles: [],
    nextCursor: null,
    totalCount: 0,
    search: "",
  });
  mocks.getBlockedUserIdsForViewer.mockReset();
  mocks.getBlockedUserIdsForViewer.mockResolvedValue(new Set());
});

describe("communityNetworkingHomeService ranking", () => {
  it("ranks priority events by date first, then event networking signal", () => {
    const home = buildCommunityNetworkingHomeData({
      attendanceVisibilityEnabled: true,
      priorityEventInputs: [
        createEvent({
          id: "later-high-signal",
          title: "Later High Signal",
          startTime: "2026-04-12T18:00:00.000Z",
        }),
        createEvent({
          id: "same-date-low",
          title: "Same Date Low",
          startTime: "2026-04-10T18:00:00.000Z",
        }),
        createEvent({
          id: "same-date-high",
          title: "Same Date High",
          startTime: "2026-04-10T18:00:00.000Z",
        }),
      ],
      recentEventInputs: [],
      attendeeInputs: [
        createAttendee({ id: "a1", eventId: "later-high-signal" }),
        createAttendee({
          id: "a2",
          eventId: "later-high-signal",
          isInNetwork: true,
        }),
        createAttendee({ id: "b1", eventId: "same-date-low" }),
        createAttendee({ id: "c1", eventId: "same-date-high" }),
        createAttendee({ id: "c2", eventId: "same-date-high" }),
        createAttendee({
          id: "c3",
          eventId: "same-date-high",
          followsViewer: true,
        }),
      ],
      totalAttendeeCountByEventId: {
        "later-high-signal": 3,
        "same-date-low": 1,
        "same-date-high": 4,
      },
    });

    expect(home.priorityEvents.map((event) => event.id)).toEqual([
      "same-date-high",
      "same-date-low",
      "later-high-signal",
    ]);
    expect(
      rankPriorityEvents(home.priorityEvents[0], home.priorityEvents[1]),
    ).toBeLessThan(0);
  });

  it("dedupes people across upcoming events and excludes hidden attendees", () => {
    const home = buildCommunityNetworkingHomeData({
      attendanceVisibilityEnabled: false,
      priorityEventInputs: [
        createEvent({ id: "event-1", startTime: "2026-04-10T18:00:00.000Z" }),
        createEvent({ id: "event-2", startTime: "2026-04-12T18:00:00.000Z" }),
      ],
      recentEventInputs: [],
      attendeeInputs: [
        createAttendee({
          id: "mutual-person",
          eventId: "event-1",
          isMutualFollow: true,
          isInNetwork: true,
          followsViewer: true,
        }),
        createAttendee({
          id: "mutual-person",
          eventId: "event-2",
          isMutualFollow: true,
          isInNetwork: true,
          followsViewer: true,
        }),
        createAttendee({
          id: "network-person",
          eventId: "event-1",
          isInNetwork: true,
        }),
        createAttendee({
          id: "hidden-person",
          eventId: "event-1",
          isVisibleToViewer: false,
        }),
        createAttendee({
          id: "no-username",
          eventId: "event-2",
          username: null,
        }),
      ],
      totalAttendeeCountByEventId: {
        "event-1": 3,
        "event-2": 2,
      },
    });

    expect(home.summary.attendanceVisibilityEnabled).toBe(false);
    expect(home.meetPeople).toHaveLength(2);
    expect(home.meetPeople[0]).toMatchObject({
      id: "mutual-person",
      sharedUpcomingEventCount: 2,
      isMutualFollow: true,
    });
    expect(home.meetPeople[1]?.id).toBe("network-person");
    expect(home.meetPeople[0]?.sharedEvents.map((event) => event.id)).toEqual([
      "event-1",
      "event-2",
    ]);
    expect(home.meetPeople[0]?.mutualConnectionsCount).toBe(0);
    expect(
      rankMeetPeople(home.meetPeople[0], home.meetPeople[1]!),
    ).toBeLessThan(0);
  });

  it("orders follow-ups by shared overlap, then recency, then relationship strength", () => {
    const home = buildCommunityNetworkingHomeData({
      attendanceVisibilityEnabled: true,
      priorityEventInputs: [],
      recentEventInputs: [
        createEvent({ id: "past-1", startTime: "2026-03-24T18:00:00.000Z" }),
        createEvent({ id: "past-2", startTime: "2026-03-22T18:00:00.000Z" }),
        createEvent({ id: "past-3", startTime: "2026-03-25T18:00:00.000Z" }),
      ],
      attendeeInputs: [
        createAttendee({ id: "overlap-person", eventId: "past-1" }),
        createAttendee({ id: "overlap-person", eventId: "past-2" }),
        createAttendee({
          id: "recent-person",
          eventId: "past-3",
          isMutualFollow: true,
          isInNetwork: true,
          followsViewer: true,
        }),
        createAttendee({
          id: "older-person",
          eventId: "past-2",
          followsViewer: true,
        }),
      ],
    });

    expect(home.followUps.map((person) => person.id)).toEqual([
      "overlap-person",
      "recent-person",
      "older-person",
    ]);
    expect(home.followUps[0]?.sharedPastEventCount).toBe(2);
    expect(home.followUps[1]?.mostRecentSharedEventStartTime).toBe(
      "2026-03-25T18:00:00.000Z",
    );
    expect(rankFollowUps(home.followUps[1], home.followUps[2]!)).toBeLessThan(
      0,
    );
  });

  it("preserves richer attendee context on person cards", () => {
    const home = buildCommunityNetworkingHomeData({
      attendanceVisibilityEnabled: true,
      priorityEventInputs: [createEvent({ id: "event-1" })],
      recentEventInputs: [],
      attendeeInputs: [
        createAttendee({
          id: "person-1",
          eventId: "event-1",
          currentRole: "Staff product designer",
          industry: "Fintech",
          companySize: "medium",
          location: "San Francisco, CA",
          mutualConnectionsCount: 12,
        }),
      ],
    });

    expect(home.meetPeople[0]).toMatchObject({
      id: "person-1",
      currentRole: "Staff product designer",
      industry: "Fintech",
      companySize: "medium",
      location: "San Francisco, CA",
      mutualConnectionsCount: 12,
    });
  });

  it("returns real starter events with visible attendee previews for cold-start users", async () => {
    const readClient = createReadClientMock({
      viewerCareerProfile: {
        current_role: "Product designer",
        industry: "Developer tools",
        interests: ["AI"],
      },
      starterEvents: [
        {
          id: "showcase-event",
          slug: "applied-ai-signal-forum",
          title: "Applied AI Signal Forum",
          start_time: "2026-04-01T18:00:00.000Z",
          event_image_url: null,
          source_url: "https://showcase.kurecal.local/events/applied-ai-signal-forum",
          source_domain: "showcase.kurecal.local",
          location: "Austin",
          attendee_count: 320,
          event_format: "hybrid",
          event_type_id: null,
          status: "confirmed",
        },
        {
          id: "starter-real",
          slug: "mcp-dev-summit",
          title: "MCP Dev Summit",
          start_time: "2026-04-05T18:00:00.000Z",
          event_image_url: "https://example.com/founder-summit.png",
          source_url:
            "https://events.linuxfoundation.org/mcp-dev-summit-north-america",
          source_domain: "events.linuxfoundation.org",
          location: "Toronto",
          attendee_count: 84,
          event_format: "in-person",
          event_type_id: "event-type-networking",
          status: "confirmed",
        },
      ],
      starterAttendanceRows: [
        {
          event_id: "starter-real",
          user_id: "attendee-1",
          status: "attending",
        },
      ],
      speakerRows: [
        {
          event_id: "starter-real",
          speaker_id: "speaker-1",
          speaker_name: "Dana Scully",
        },
        {
          event_id: "starter-real",
          speaker_id: "speaker-1",
          speaker_name: "Dana Scully",
        },
        {
          event_id: "starter-real",
          speaker_id: "speaker-2",
          speaker_name: "Alex Kim",
        },
      ],
      speakerDetails: [
        {
          id: "speaker-1",
          name: "Dana Scully",
          title: "AI Research Lead",
          company: "Signal Labs",
          photo_url: null,
          linkedin_url: "https://linkedin.com/in/dana",
          twitter_url: null,
          website_url: null,
        },
      ],
      attendeeProfiles: [
        {
          id: "attendee-1",
          full_name: "Jordan Lee",
          avatar_url: null,
          username: "jordan",
          headline: "Product designer",
          location: "Toronto",
          profile_visibility: "public",
          show_attendance: true,
        },
      ],
      recentTrackingRows: [
        { event_id: "starter-typed", user_id: "public-tracker" },
      ],
    });

    const home = await CommunityNetworkingHomeService.getHomeData({
      viewerId: "viewer-id",
      readClient: readClient as never,
      now: new Date("2026-03-29T12:00:00.000Z"),
    });

    expect(home.priorityEvents.map((event) => event.id)).toEqual([
      "starter-real",
    ]);
    expect(home.priorityEvents[0]).toMatchObject({
      imageUrl: "https://example.com/founder-summit.png",
      visibleAttendeeCount: 1,
      attendeePreview: [{ username: "jordan" }],
    });
    expect(home.priorityEvents[0]?.speakers).toEqual([
      expect.objectContaining({
        id: "speaker-1",
        name: "Dana Scully",
      }),
    ]);
    expect(home.speakerMatches).toEqual([]);
    expect(home.meetPeople[0]).toMatchObject({
      username: "jordan",
      sharedUpcomingEventCount: 1,
    });
    expect(home.ambientActivity).toMatchObject({
      publicTrackersToday: 12,
      newPublicProfilesThisWeek: 3,
      roomsWithFreshTrackingCount: 0,
    });
  });

  it("treats showcase-tracked events as invalid and falls back to real upcoming events", async () => {
    const readClient = createReadClientMock({
      viewerCareerProfile: {
        current_role: "Engineering manager",
        industry: "Cloud",
        interests: ["Platform engineering"],
      },
      viewerEvents: [
        {
          event_id: "showcase-saved-event",
          status: null,
          is_bookmarked: true,
        },
      ],
      trackedEvents: [
        {
          id: "showcase-saved-event",
          slug: "platform-clarity-summit",
          title: "Platform Clarity Summit",
          start_time: "2026-05-05T15:00:00.000Z",
          source_url:
            "https://showcase.kurecal.local/events/platform-clarity-summit",
          source_domain: "showcase.kurecal.local",
          location: "Seattle",
          attendee_count: 410,
          event_format: "hybrid",
          event_type_id: null,
          status: "confirmed",
        },
      ],
      starterEvents: [
        {
          id: "starter-real",
          slug: "aws-summit-paris",
          title: "AWS Summit Paris",
          start_time: "2026-04-08T18:00:00.000Z",
          source_url: "https://aws.amazon.com/events/summits/paris",
          source_domain: "aws.amazon.com",
          location: "Toronto",
          attendee_count: 91,
          event_format: "in-person",
          event_type_id: "event-type-networking",
          status: "confirmed",
        },
      ],
      starterAttendanceRows: [
        {
          event_id: "starter-real",
          user_id: "attendee-2",
          status: "attending",
        },
      ],
      speakerRows: [
        {
          event_id: "starter-real",
          speaker_id: "speaker-3",
          speaker_name: "Priya Nair",
        },
      ],
      attendeeProfiles: [
        {
          id: "attendee-2",
          full_name: "Taylor Kim",
          avatar_url: null,
          username: "taylor",
          headline: "Engineering manager",
          location: "Toronto",
          profile_visibility: "public",
          show_attendance: true,
        },
      ],
    });

    const home = await CommunityNetworkingHomeService.getHomeData({
      viewerId: "viewer-id",
      readClient: readClient as never,
      now: new Date("2026-03-29T12:00:00.000Z"),
    });

    expect(home.summary.trackedUpcomingCount).toBe(0);
    expect(home.priorityEvents).toHaveLength(1);
    expect(home.priorityEvents[0]?.title).toBe("AWS Summit Paris");
    expect(home.priorityEvents[0]?.visibleAttendeeCount).toBe(1);
    expect(home.priorityEvents[0]?.speakers).toBeUndefined();
    expect(home.speakerMatches).toEqual([]);
  });

  it("returns matched past speakers when upcoming events have no speaker lineups", async () => {
    const readClient = createReadClientMock({
      viewerCareerProfile: {
        current_role: "Product designer",
        industry: "Developer tools",
        interests: ["AI", "Design systems"],
      },
      starterEvents: [
        {
          id: "starter-real",
          slug: "jupyter-workshops-security-tooling-sprint",
          title: "Jupyter Workshops: Security Tooling Sprint",
          start_time: "2026-03-31T00:00:00.000Z",
          source_url: "https://events.linuxfoundation.org/security-tooling-sprint",
          source_domain: "events.linuxfoundation.org",
          location: "Remote",
          attendee_count: null,
          event_format: "virtual",
          event_type_id: "event-type-conference",
          status: "confirmed",
        },
      ],
      starterAttendanceRows: [],
      pastEvents: [
        {
          id: "past-event-ai",
          slug: "ai-product-summit",
          title: "AI Product Summit",
          start_time: "2026-02-10T18:00:00.000Z",
          source_url: "https://example.com/ai-product-summit",
          source_domain: "example.com",
          location: "Remote",
          attendee_count: 120,
          event_format: "virtual",
          event_type_id: "conference",
          status: "confirmed",
        },
        {
          id: "past-event-generic",
          slug: "finance-ops-forum",
          title: "Finance Ops Forum",
          start_time: "2025-12-05T18:00:00.000Z",
          source_url: "https://example.com/finance-ops-forum",
          source_domain: "example.com",
          location: "New York",
          attendee_count: 80,
          event_format: "in-person",
          event_type_id: "conference",
          status: "confirmed",
        },
      ],
      speakerRows: [
        {
          event_id: "past-event-ai",
          speaker_id: "speaker-match-1",
          speaker_name: "Jamie Chen",
        },
        {
          event_id: "past-event-generic",
          speaker_id: "speaker-match-2",
          speaker_name: "Morgan Blake",
        },
      ],
      speakerDetails: [
        {
          id: "speaker-match-1",
          name: "Jamie Chen",
          title: "AI Product Designer",
          company: "Signal Labs",
          photo_url: null,
          linkedin_url: "https://linkedin.com/in/jamie-chen",
          twitter_url: null,
          website_url: null,
        },
        {
          id: "speaker-match-2",
          name: "Morgan Blake",
          title: "Finance Director",
          company: "Ops Corp",
          photo_url: null,
          linkedin_url: null,
          twitter_url: null,
          website_url: null,
        },
      ],
      attendeeProfiles: [],
      recentTrackingRows: [],
    });

    const home = await CommunityNetworkingHomeService.getHomeData({
      viewerId: "viewer-id",
      readClient: readClient as never,
      now: new Date("2026-03-29T12:00:00.000Z"),
    });

    expect(home.priorityEvents).toHaveLength(1);
    expect(home.priorityEvents[0]).toMatchObject({
      id: "starter-real",
      title: "Jupyter Workshops: Security Tooling Sprint",
      visibleAttendeeCount: 0,
      networkAttendingCount: 0,
      relationshipAttendeeCount: 0,
      attendeePreview: [],
      speakers: undefined,
    });
    expect(home.speakerMatches).toEqual([
      expect.objectContaining({
        speaker: expect.objectContaining({
          id: "speaker-match-1",
          name: "Jamie Chen",
        }),
        event: expect.objectContaining({
          id: "past-event-ai",
          title: "AI Product Summit",
        }),
        isPastEvent: true,
      }),
    ]);
    expect(home.speakerMatches?.[0]?.matchReason).toMatch(/role|interest|work/i);
  });

  it("falls back to role and industry when interests are missing", async () => {
    const readClient = createReadClientMock({
      viewerCareerProfile: {
        current_role: "Platform engineer",
        industry: "Infrastructure",
        interests: [],
      },
      pastEvents: [
        {
          id: "past-event-platform",
          slug: "platform-ops-day",
          title: "Platform Ops Day",
          start_time: "2026-01-15T18:00:00.000Z",
          source_url: "https://example.com/platform-ops-day",
          source_domain: "example.com",
          location: "Remote",
          attendee_count: 80,
          event_format: "virtual",
          event_type_id: "conference",
          status: "confirmed",
        },
      ],
      speakerRows: [
        {
          event_id: "past-event-platform",
          speaker_id: "speaker-platform",
          speaker_name: "Riley Stone",
        },
      ],
      speakerDetails: [
        {
          id: "speaker-platform",
          name: "Riley Stone",
          title: "Platform Engineering Lead",
          company: "Infra Co",
          photo_url: null,
          linkedin_url: null,
          twitter_url: null,
          website_url: null,
        },
      ],
    });

    const home = await CommunityNetworkingHomeService.getHomeData({
      viewerId: "viewer-id",
      readClient: readClient as never,
      now: new Date("2026-03-29T12:00:00.000Z"),
    });

    expect(home.speakerMatches?.[0]).toMatchObject({
      speaker: expect.objectContaining({
        id: "speaker-platform",
        name: "Riley Stone",
      }),
      isPastEvent: true,
    });
    expect(home.speakerMatches?.[0]?.matchReason).toMatch(/role|work/i);
  });

  it("skips past speaker matches that cannot resolve to a real speaker record", async () => {
    const readClient = createReadClientMock({
      viewerCareerProfile: {
        current_role: "Data analyst",
        industry: "AI",
        interests: ["analytics"],
      },
      pastEvents: [
        {
          id: "past-event-unresolved",
          slug: "analytics-summit",
          title: "Analytics Summit",
          start_time: "2026-02-14T18:00:00.000Z",
          source_url: "https://example.com/analytics-summit",
          source_domain: "example.com",
          location: "Remote",
          attendee_count: 40,
          event_format: "virtual",
          event_type_id: "conference",
          status: "confirmed",
        },
      ],
      speakerRows: [
        {
          event_id: "past-event-unresolved",
          speaker_id: null,
          speaker_name: "Casey Morgan",
        },
      ],
      speakerDetails: [],
    });

    const home = await CommunityNetworkingHomeService.getHomeData({
      viewerId: "viewer-id",
      readClient: readClient as never,
      now: new Date("2026-03-29T12:00:00.000Z"),
    });

    expect(home.speakerMatches).toEqual([]);
  });
});
