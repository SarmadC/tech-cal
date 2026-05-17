import { describe, expect, it, vi } from "vitest";

import { CommunityRoomThreadService } from "@/services/communityRoomThreadService";

const mocks = vi.hoisted(() => ({
  getBlockedUserIdsForViewer: vi.fn(),
}));

vi.mock("@/services/blockService", () => ({
  BlockService: {
    getBlockedUserIdsForViewer: (...args: unknown[]) =>
      mocks.getBlockedUserIdsForViewer(...args),
  },
}));

function createAwaitableChain<T>(result: T) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & PromiseLike<T> =
    {} as never;

  for (const method of [
    "select",
    "eq",
    "is",
    "order",
    "limit",
    "or",
    "in",
  ]) {
    chain[method] = vi.fn(() => chain);
  }

  chain.maybeSingle = vi.fn(async () => result);
  chain.then = vi.fn((onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected),
  );

  return chain;
}

function profile(id: string, username: string) {
  return {
    id,
    username,
    full_name: username,
    avatar_url: null,
    headline: null,
  };
}

function comment({
  id,
  authorId,
  parentId = null,
  createdAt,
}: {
  id: string;
  authorId: string;
  parentId?: string | null;
  createdAt: string;
}) {
  return {
    id,
    thread_id: "thread-1",
    author_id: authorId,
    body: `body-${id}`,
    created_at: createdAt,
    parent_comment_id: parentId,
    deleted_at: null,
    edited_at: null,
  };
}

describe("CommunityRoomThreadService comment pagination", () => {
  it("returns cursor metadata and preserves root comment branches", async () => {
    mocks.getBlockedUserIdsForViewer.mockResolvedValue(new Set());

    const rootOne = comment({
      id: "root-1",
      authorId: "author-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const rootTwo = comment({
      id: "root-2",
      authorId: "author-2",
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    const rootThree = comment({
      id: "root-3",
      authorId: "author-3",
      createdAt: "2026-01-03T00:00:00.000Z",
    });
    const reply = comment({
      id: "reply-1",
      authorId: "author-3",
      parentId: "root-1",
      createdAt: "2026-01-01T00:05:00.000Z",
    });

    const threadChain = createAwaitableChain({
      data: { author_id: "author-1", deleted_at: null },
      error: null,
    });
    const rootsChain = createAwaitableChain({
      data: [rootOne, rootTwo, rootThree],
      error: null,
    });
    const repliesChain = createAwaitableChain({
      data: [reply],
      error: null,
    });
    const profilesChain = createAwaitableChain({
      data: [
        profile("author-1", "one"),
        profile("author-2", "two"),
        profile("author-3", "three"),
      ],
      error: null,
    });
    const commentChains = [rootsChain, repliesChain];
    const readClient = {
      from: vi.fn((table: string) => {
        if (table === "event_room_threads") return threadChain;
        if (table === "event_room_thread_comments") {
          const next = commentChains.shift();
          if (!next) throw new Error("unexpected comments query");
          return next;
        }
        if (table === "profiles") return profilesChain;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const page = await CommunityRoomThreadService.getThreadCommentsPage({
      threadId: "thread-1",
      viewerId: "viewer-1",
      readClient: readClient as never,
      limit: 2,
      sort: "oldest",
    });

    expect(page.hasMore).toBe(true);
    expect(page.loadedCount).toBe(3);
    expect(page.nextCursor).toBeTruthy();
    expect(
      JSON.parse(Buffer.from(page.nextCursor!, "base64url").toString("utf8")),
    ).toEqual({
      id: "root-2",
      createdAt: "2026-01-02T00:00:00.000Z",
    });
    expect(page.comments.map((item) => item.id)).toEqual(["root-1", "root-2"]);
    expect(page.comments[0]?.replies.map((item) => item.id)).toEqual([
      "reply-1",
    ]);
    expect(page.comments[1]?.replies).toEqual([]);
    expect(repliesChain.in).toHaveBeenCalledWith("parent_comment_id", [
      "root-1",
      "root-2",
    ]);
  });
});
