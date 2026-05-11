import { beforeEach, describe, expect, it, vi } from "vitest";

import { MobileCommunityPulseService } from "@/services/mobileCommunityPulseService";

const mocks = vi.hoisted(() => ({
  getBlockedUserIdsForViewer: vi.fn(),
}));

vi.mock("@/services/blockService", () => ({
  BlockService: {
    getBlockedUserIdsForViewer: (...args: unknown[]) =>
      mocks.getBlockedUserIdsForViewer(...args),
  },
}));

function createQuery(data: unknown[] | null, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & {
    then: Promise<{ data: unknown[] | null; error: unknown }>["then"];
  } = {} as never;
  const result = { data, error };

  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(async () => result);
  chain.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return chain;
}

function createReadClient(
  tables: Record<string, Array<ReturnType<typeof createQuery>>>,
) {
  return {
    from: vi.fn((table: string) => {
      const next = tables[table]?.shift();
      if (!next) {
        throw new Error(`Unexpected table ${table}`);
      }

      return next;
    }),
  } as any;
}

describe("MobileCommunityPulseService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("limits previews, filters blocked feed authors, and keeps circle slugs explicit", async () => {
    mocks.getBlockedUserIdsForViewer.mockResolvedValue(
      new Set(["blocked-user"]),
    );

    const circleRows = Array.from({ length: 8 }, (_, index) => ({
      id: `circle-${index + 1}`,
      slug: `circle-${index + 1}`,
      name: `Circle ${index + 1}`,
      description: `Circle ${index + 1} description`,
      member_count: 100 - index,
    }));
    const posts = Array.from({ length: 5 }, (_, index) => ({
      id: `post-${index + 1}`,
      content: `Post ${index + 1}`,
      created_at: `2026-04-0${index + 1}T18:00:00.000Z`,
      author_id: index === 1 ? "blocked-user" : `author-${index + 1}`,
      circle_id: `circle-${index + 1}`,
      moderation_status: "active",
    }));
    const comments = [
      {
        id: "comment-1",
        post_id: "post-1",
        content: "Helpful reply",
        created_at: "2026-04-01T18:05:00.000Z",
        author_id: "comment-author",
      },
      {
        id: "comment-2",
        post_id: "post-1",
        content: "Blocked reply",
        created_at: "2026-04-01T18:04:00.000Z",
        author_id: "blocked-user",
      },
    ];
    const events = Array.from({ length: 6 }, (_, index) => ({
      id: `event-${index + 1}`,
      slug: `event-${index + 1}`,
      title: `Event ${index + 1}`,
      start_time: `2026-05-1${index}T18:00:00.000Z`,
      location: "Remote",
      format: "virtual",
    }));
    const commentsQuery = createQuery(comments);
    const circlesMapQuery = createQuery(circleRows);
    const circlesPreviewQuery = createQuery(circleRows);
    const eventsQuery = createQuery(events);
    const readClient = createReadClient({
      circle_members: [
        createQuery([{ circle_id: "circle-1" }]),
        createQuery([{ circle_id: "circle-1" }]),
      ],
      circles: [circlesMapQuery, circlesPreviewQuery],
      circle_posts: [createQuery(posts)],
      circle_comments: [commentsQuery],
      profiles: [
        createQuery([
          { id: "author-1", full_name: "Author 1", avatar_url: null },
          { id: "author-3", full_name: "Author 3", avatar_url: null },
          { id: "author-4", full_name: "Author 4", avatar_url: null },
          { id: "author-5", full_name: "Author 5", avatar_url: null },
          {
            id: "comment-author",
            full_name: "Comment Author",
            avatar_url: null,
          },
        ]),
      ],
      user_events: [
        createQuery(events.map((event) => ({ event_id: event.id }))),
      ],
      events: [eventsQuery],
    });

    const result = await MobileCommunityPulseService.getPulsePreview({
      viewerId: "viewer-1",
      readClient,
    });

    expect(result.feed).toHaveLength(3);
    expect(result.feed.map((post) => post.id)).toEqual([
      "post-1",
      "post-3",
      "post-4",
    ]);
    expect(result.feed[0]?.commentCount).toBe(1);
    expect(result.feed[0]?.recentComments?.[0]?.id).toBe("comment-1");
    expect(result.circles).toHaveLength(6);
    expect(result.circles[0]?.slug).toBe("circle-1");
    expect("href" in result.circles[0]!).toBe(false);
    expect(result.communityUpcomingEvents).toHaveLength(5);
    expect(commentsQuery.limit).toHaveBeenCalledWith(120);
    expect([
      ...circlesMapQuery.limit.mock.calls,
      ...circlesPreviewQuery.limit.mock.calls,
    ]).toContainEqual([6]);
    expect(eventsQuery.limit).toHaveBeenCalledWith(5);
  });

  it("returns empty optional previews when pulse queries fail", async () => {
    mocks.getBlockedUserIdsForViewer.mockResolvedValue(new Set());
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const readClient = {
      from: vi.fn(() => {
        throw new Error("database unavailable");
      }),
    } as any;

    const result = await MobileCommunityPulseService.getPulsePreview({
      viewerId: "viewer-1",
      readClient,
    });

    expect(result).toEqual({
      feed: [],
      circles: [],
      communityUpcomingEvents: [],
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
