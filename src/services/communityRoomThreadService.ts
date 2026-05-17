import type {
  MobileCommunityRoomCommentSort,
  MobileCommunityRoomThread,
  MobileCommunityRoomThreadChildComment,
  MobileCommunityRoomThreadComment,
  MobileCommunityRoomThreadCommentPage,
  MobileCommunityRoomThreadCommentDraft,
  MobileCommunityRoomThreadCommentEditDraft,
  MobileCommunityRoomThreadDetail,
  MobileCommunityRoomThreadDraft,
  MobileCommunityRoomThreadEditDraft,
  MobileCommunityRoomThreadList,
} from "@kurecal/domain";

import { BlockService } from "@/services/blockService";
import type { SupabaseClientType } from "@/types";

const THREAD_LIST_DEFAULT_LIMIT = 20;
const THREAD_LIST_MAX_LIMIT = 50;
const COMMENT_PAGE_DEFAULT_LIMIT = 200;
const COMMENT_PAGE_MAX_LIMIT = 200;

export class CommunityRoomThreadNotFoundError extends Error {
  constructor(threadId: string) {
    super(`Thread not found: ${threadId}`);
    this.name = "CommunityRoomThreadNotFoundError";
  }
}

/**
 * Throw a generic-message Error after logging the raw cause server-side.
 * Used by the thread/comment service so Supabase/Postgres details (column
 * names, constraint hints, RLS reasons) don't leak to the API response.
 */
function fail(operation: string, cause: unknown): never {
  console.error(`[communityRoomThreadService] ${operation} failed`, cause);
  throw new Error(operation);
}

interface ThreadRow {
  id: string;
  event_id: string;
  author_id: string;
  title: string;
  body: string;
  comment_count: number;
  created_at: string;
  last_activity_at: string;
  deleted_at: string | null;
  edited_at: string | null;
}

interface AuthorProfileRow {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  headline: string | null;
}

interface CommentRow {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
  parent_comment_id: string | null;
  deleted_at: string | null;
  edited_at: string | null;
}

const THREAD_COLUMNS =
  "id, event_id, author_id, title, body, comment_count, created_at, last_activity_at, deleted_at, edited_at";

const COMMENT_COLUMNS =
  "id, thread_id, author_id, body, created_at, parent_comment_id, deleted_at, edited_at";

const DELETED_AUTHOR_ID = "00000000-0000-0000-0000-000000000000";
const DELETED_BODY = "[deleted]";

interface CommentCursor {
  createdAt: string;
  id: string;
}

function encodeCommentCursor(cursor: CommentCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCommentCursor(value: string | null | undefined): CommentCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      typeof parsed?.createdAt === "string" &&
      typeof parsed?.id === "string"
    ) {
      return { createdAt: parsed.createdAt, id: parsed.id };
    }
  } catch {
    return null;
  }
  return null;
}

function countRenderedComments(
  comments: MobileCommunityRoomThreadComment[],
): number {
  return comments.reduce(
    (total, comment) => total + 1 + comment.replies.length,
    0,
  );
}

function shapeThread(
  row: ThreadRow,
  author: AuthorProfileRow,
  viewerId: string,
): MobileCommunityRoomThread {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    author: {
      id: author.id,
      fullName: author.full_name,
      username: author.username ?? "",
      avatarUrl: author.avatar_url,
      headline: author.headline,
    },
    isAuthor: row.author_id === viewerId,
    editedAt: row.edited_at,
  };
}

function maskedAuthor(): MobileCommunityRoomThreadComment["author"] {
  return {
    id: DELETED_AUTHOR_ID,
    fullName: null,
    username: "deleted",
    avatarUrl: null,
  };
}

export class CommunityRoomThreadService {
  static async createThread({
    eventId,
    authorId,
    draft,
    writeClient,
  }: {
    eventId: string;
    authorId: string;
    draft: MobileCommunityRoomThreadDraft;
    writeClient: SupabaseClientType;
  }): Promise<MobileCommunityRoomThread> {
    const eventResult = await writeClient
      .from("events")
      .select("id, status")
      .eq("id", eventId)
      .eq("status", "confirmed")
      .maybeSingle();

    if (eventResult.error) {
      throw new Error("Failed to verify event.");
    }
    if (!eventResult.data) {
      throw new Error("Event not found.");
    }

    const insertResult = (await writeClient
      .from("event_room_threads")
      .insert({
        event_id: eventId,
        author_id: authorId,
        title: draft.title.trim(),
        body: draft.body.trim(),
      })
      .select(THREAD_COLUMNS)
      .single()) as { data: unknown; error: { message?: string } | null };

    if (insertResult.error || !insertResult.data) {
      fail("Failed to create thread.", insertResult.error);
    }

    const row = insertResult.data as ThreadRow;

    const authorResult = await writeClient
      .from("profiles")
      .select("id, full_name, avatar_url, username, headline")
      .eq("id", authorId)
      .maybeSingle();

    if (authorResult.error || !authorResult.data) {
      throw new Error("Failed to load thread author profile.");
    }

    const author = authorResult.data as AuthorProfileRow;
    if (!author.username) {
      throw new Error("Author profile is incomplete.");
    }

    return shapeThread(row, author, authorId);
  }

  static async listThreads({
    eventId,
    viewerId,
    readClient,
    cursor,
    limit = THREAD_LIST_DEFAULT_LIMIT,
  }: {
    eventId: string;
    viewerId: string;
    readClient: SupabaseClientType;
    cursor?: string | null;
    limit?: number;
  }): Promise<MobileCommunityRoomThreadList> {
    const cappedLimit = Math.min(Math.max(limit, 1), THREAD_LIST_MAX_LIMIT);

    let query = readClient
      .from("event_room_threads")
      .select(THREAD_COLUMNS)
      .eq("event_id", eventId)
      .is("deleted_at", null)
      .order("last_activity_at", { ascending: false });

    if (cursor) {
      query = query.lt("last_activity_at", cursor);
    }

    const result = (await query.limit(cappedLimit + 1)) as {
      data: unknown;
      error: { message?: string } | null;
    };

    if (result.error) {
      fail("Failed to load threads.", result.error);
    }

    const rows = (result.data ?? []) as ThreadRow[];
    const hasMore = rows.length > cappedLimit;
    const page = hasMore ? rows.slice(0, cappedLimit) : rows;

    if (page.length === 0) {
      return { threads: [], nextCursor: null };
    }

    const authorIds = Array.from(new Set(page.map((row) => row.author_id)));
    const authorsResult = await readClient
      .from("profiles")
      .select("id, full_name, avatar_url, username, headline")
      .in("id", authorIds);

    if (authorsResult.error) {
      throw new Error("Failed to load thread authors.");
    }

    const authorsById = new Map<string, AuthorProfileRow>(
      ((authorsResult.data || []) as AuthorProfileRow[]).map((row) => [
        row.id,
        row,
      ]),
    );

    const threads: MobileCommunityRoomThread[] = [];
    for (const row of page) {
      const author = authorsById.get(row.author_id);
      if (!author || !author.username) continue;
      threads.push(shapeThread(row, author, viewerId));
    }

    return {
      threads,
      nextCursor: hasMore ? page[page.length - 1].last_activity_at : null,
    };
  }

  static async getThreadDetail({
    eventId,
    threadId,
    viewerId,
    readClient,
    sort = "oldest",
  }: {
    eventId: string;
    threadId: string;
    viewerId: string;
    readClient: SupabaseClientType;
    sort?: MobileCommunityRoomCommentSort;
  }): Promise<MobileCommunityRoomThreadDetail> {
    const { row, author } = await this.getThreadRowAndAuthor({
      eventId,
      threadId,
      readClient,
    });
    const commentPage = await this.getThreadCommentsPage({
      threadId,
      viewerId,
      threadAuthorId: row.author_id,
      readClient,
      sort,
    });

    return {
      thread: shapeThread(row, author, viewerId),
      comments: commentPage.comments,
      commentPage,
    };
  }

  static async getThreadCommentsPage({
    eventId,
    threadId,
    viewerId,
    threadAuthorId,
    readClient,
    sort = "oldest",
    cursor,
    limit = COMMENT_PAGE_DEFAULT_LIMIT,
  }: {
    eventId?: string;
    threadId: string;
    viewerId: string;
    threadAuthorId?: string;
    readClient: SupabaseClientType;
    sort?: MobileCommunityRoomCommentSort;
    cursor?: string | null;
    limit?: number;
  }): Promise<MobileCommunityRoomThreadCommentPage> {
    let resolvedThreadAuthorId = threadAuthorId;
    if (!resolvedThreadAuthorId) {
      let threadQuery = readClient
        .from("event_room_threads")
        .select("author_id, deleted_at")
        .eq("id", threadId);
      if (eventId) threadQuery = threadQuery.eq("event_id", eventId);
      const threadResult = (await threadQuery.maybeSingle()) as {
        data: { author_id: string; deleted_at: string | null } | null;
        error: { message?: string } | null;
      };
      if (threadResult.error) {
        fail("Failed to verify comment thread.", threadResult.error);
      }
      if (!threadResult.data || threadResult.data.deleted_at) {
        throw new CommunityRoomThreadNotFoundError(threadId);
      }
      resolvedThreadAuthorId = threadResult.data.author_id;
    }

    const cappedLimit = Math.min(
      Math.max(Math.floor(limit), 1),
      COMMENT_PAGE_MAX_LIMIT,
    );
    const ascending = sort !== "newest";
    const decodedCursor = decodeCommentCursor(cursor);

    let rootsQuery = readClient
      .from("event_room_thread_comments")
      .select(COMMENT_COLUMNS)
      .eq("thread_id", threadId)
      .is("parent_comment_id", null)
      .order("created_at", { ascending })
      .order("id", { ascending })
      .limit(cappedLimit + 1);

    if (decodedCursor) {
      const operator = ascending ? "gt" : "lt";
      rootsQuery = rootsQuery.or(
        `created_at.${operator}.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.${operator}.${decodedCursor.id})`,
      );
    }

    const rootsResult = (await rootsQuery) as {
      data: unknown;
      error: { message?: string } | null;
    };

    if (rootsResult.error) {
      fail("Failed to load thread comment roots.", rootsResult.error);
    }

    const rootRows = (rootsResult.data ?? []) as CommentRow[];
    const hasMore = rootRows.length > cappedLimit;
    const pageRoots = hasMore ? rootRows.slice(0, cappedLimit) : rootRows;
    const rootIds = pageRoots.map((row) => row.id);

    let commentRows = pageRoots;
    if (rootIds.length > 0) {
      const repliesResult = (await readClient
        .from("event_room_thread_comments")
        .select(COMMENT_COLUMNS)
        .eq("thread_id", threadId)
        .in("parent_comment_id", rootIds)
        .order("created_at", { ascending: true })) as {
        data: unknown;
        error: { message?: string } | null;
      };

      if (repliesResult.error) {
        fail("Failed to load thread comment replies.", repliesResult.error);
      }
      commentRows = [...pageRoots, ...((repliesResult.data ?? []) as CommentRow[])];
    }

    const comments = await this.shapeCommentRows({
      commentRows,
      rootIds: new Set(rootIds),
      threadAuthorId: resolvedThreadAuthorId,
      viewerId,
      readClient,
      sort,
      bubbleOrphans: false,
    });

    const nextRoot = hasMore ? pageRoots[pageRoots.length - 1] : null;
    return {
      comments,
      nextCursor: nextRoot
        ? encodeCommentCursor({ createdAt: nextRoot.created_at, id: nextRoot.id })
        : null,
      hasMore,
      loadedCount: countRenderedComments(comments),
    };
  }

  static async getThreadComment({
    eventId,
    threadId,
    commentId,
    viewerId,
    readClient,
  }: {
    eventId?: string;
    threadId: string;
    commentId: string;
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<MobileCommunityRoomThreadComment> {
    const commentResult = (await readClient
      .from("event_room_thread_comments")
      .select(COMMENT_COLUMNS)
      .eq("thread_id", threadId)
      .eq("id", commentId)
      .maybeSingle()) as {
      data: unknown;
      error: { message?: string } | null;
    };

    if (commentResult.error) {
      fail("Failed to load thread comment.", commentResult.error);
    }
    if (!commentResult.data) {
      throw new CommunityRoomThreadNotFoundError(commentId);
    }

    const commentRow = commentResult.data as CommentRow;
    let threadQuery = readClient
      .from("event_room_threads")
      .select("author_id")
      .eq("id", threadId);
    if (eventId) threadQuery = threadQuery.eq("event_id", eventId);
    const threadResult = (await threadQuery.maybeSingle()) as {
      data: { author_id: string } | null;
      error: { message?: string } | null;
    };
    if (threadResult.error || !threadResult.data) {
      fail("Failed to verify comment thread.", threadResult.error);
    }

    const comments = await this.shapeCommentRows({
      commentRows: [commentRow],
      rootIds: new Set(commentRow.parent_comment_id ? [] : [commentRow.id]),
      threadAuthorId: threadResult.data.author_id,
      viewerId,
      readClient,
      sort: "oldest",
      bubbleOrphans: true,
    });
    const shaped = comments[0];
    if (!shaped) {
      throw new CommunityRoomThreadNotFoundError(commentId);
    }
    return shaped;
  }

  private static async getThreadRowAndAuthor({
    eventId,
    threadId,
    readClient,
  }: {
    eventId: string;
    threadId: string;
    readClient: SupabaseClientType;
  }): Promise<{ row: ThreadRow; author: AuthorProfileRow }> {
    const threadResult = (await readClient
      .from("event_room_threads")
      .select(THREAD_COLUMNS)
      .eq("id", threadId)
      .eq("event_id", eventId)
      .maybeSingle()) as {
      data: unknown;
      error: { message?: string } | null;
    };

    if (threadResult.error) {
      fail("Failed to load thread.", threadResult.error);
    }
    if (!threadResult.data) {
      throw new CommunityRoomThreadNotFoundError(threadId);
    }

    const row = threadResult.data as ThreadRow;
    if (row.deleted_at) {
      throw new CommunityRoomThreadNotFoundError(threadId);
    }

    const authorResult = await readClient
      .from("profiles")
      .select("id, full_name, avatar_url, username, headline")
      .eq("id", row.author_id)
      .maybeSingle();

    if (authorResult.error || !authorResult.data) {
      throw new Error("Failed to load thread author.");
    }

    const author = authorResult.data as AuthorProfileRow;
    if (!author.username) {
      throw new Error("Thread author profile is incomplete.");
    }

    return { row, author };
  }

  private static async shapeCommentRows({
    commentRows,
    rootIds,
    threadAuthorId,
    viewerId,
    readClient,
    sort,
    bubbleOrphans,
  }: {
    commentRows: CommentRow[];
    rootIds: Set<string>;
    threadAuthorId: string;
    viewerId: string;
    readClient: SupabaseClientType;
    sort: MobileCommunityRoomCommentSort;
    bubbleOrphans: boolean;
  }): Promise<MobileCommunityRoomThreadComment[]> {
    const commenterIds = Array.from(
      new Set(commentRows.map((c) => c.author_id)),
    );

    const commenterProfilesById = new Map<string, AuthorProfileRow>();
    if (commenterIds.length > 0) {
      const commenterProfilesResult = await readClient
        .from("profiles")
        .select("id, full_name, avatar_url, username, headline")
        .in("id", commenterIds);

      if (commenterProfilesResult.error) {
        throw new Error("Failed to load comment authors.");
      }

      for (const profile of (commenterProfilesResult.data ||
        []) as AuthorProfileRow[]) {
        commenterProfilesById.set(profile.id, profile);
      }
    }

    const blockedIds =
      commenterIds.length > 0
        ? await BlockService.getBlockedUserIdsForViewer(
            viewerId,
            commenterIds,
            readClient,
          )
        : new Set<string>();

    function baseDeleted(commentRow: CommentRow) {
      return {
        id: commentRow.id,
        threadId: commentRow.thread_id,
        body: DELETED_BODY,
        createdAt: commentRow.deleted_at ?? commentRow.created_at,
        author: maskedAuthor(),
        isAuthor: false,
        isOp: false,
        isDeleted: true,
        editedAt: null,
      };
    }

    function buildChild(
      commentRow: CommentRow,
    ): MobileCommunityRoomThreadChildComment | null {
      if (commentRow.deleted_at || blockedIds.has(commentRow.author_id)) {
        return {
          ...baseDeleted(commentRow),
          parentId: commentRow.parent_comment_id,
        };
      }
      const commenter = commenterProfilesById.get(commentRow.author_id);
      if (!commenter || !commenter.username) return null;
      return {
        id: commentRow.id,
        threadId: commentRow.thread_id,
        parentId: commentRow.parent_comment_id,
        body: commentRow.body,
        createdAt: commentRow.created_at,
        author: {
          id: commenter.id,
          fullName: commenter.full_name,
          username: commenter.username,
          avatarUrl: commenter.avatar_url,
        },
        isAuthor: commentRow.author_id === viewerId,
        isOp: commentRow.author_id === threadAuthorId,
        isDeleted: false,
        editedAt: commentRow.edited_at,
      };
    }

    function buildRoot(
      commentRow: CommentRow,
    ): MobileCommunityRoomThreadComment | null {
      if (commentRow.deleted_at || blockedIds.has(commentRow.author_id)) {
        return {
          ...baseDeleted(commentRow),
          parentId: commentRow.parent_comment_id,
          replies: [],
        };
      }
      const commenter = commenterProfilesById.get(commentRow.author_id);
      if (!commenter || !commenter.username) return null;
      return {
        id: commentRow.id,
        threadId: commentRow.thread_id,
        parentId: commentRow.parent_comment_id,
        body: commentRow.body,
        createdAt: commentRow.created_at,
        author: {
          id: commenter.id,
          fullName: commenter.full_name,
          username: commenter.username,
          avatarUrl: commenter.avatar_url,
        },
        isAuthor: commentRow.author_id === viewerId,
        isOp: commentRow.author_id === threadAuthorId,
        isDeleted: false,
        editedAt: commentRow.edited_at,
        replies: [],
      };
    }

    const rootCommentsById = new Map<string, MobileCommunityRoomThreadComment>();
    const orphanedChildren: MobileCommunityRoomThreadChildComment[] = [];

    for (const commentRow of commentRows) {
      if (commentRow.parent_comment_id === null) {
        const root = buildRoot(commentRow);
        if (root) rootCommentsById.set(commentRow.id, root);
        continue;
      }

      const child = buildChild(commentRow);
      if (!child) continue;
      const parentId = commentRow.parent_comment_id;
      if (parentId && rootIds.has(parentId)) {
        const root = rootCommentsById.get(parentId);
        if (root) {
          root.replies.push(child);
          continue;
        }
      }
      if (bubbleOrphans) orphanedChildren.push(child);
    }

    const comments: MobileCommunityRoomThreadComment[] = Array.from(
      rootCommentsById.values(),
    );

    for (const orphan of orphanedChildren) {
      comments.push({
        ...orphan,
        parentId: orphan.parentId,
        replies: [],
      });
    }

    const direction = sort === "newest" ? -1 : 1;
    comments.sort(
      (a, b) =>
        direction *
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) ||
        direction * a.id.localeCompare(b.id),
    );
    return comments;
  }

  static async createComment({
    eventId,
    threadId,
    authorId,
    draft,
    writeClient,
  }: {
    eventId: string;
    threadId: string;
    authorId: string;
    draft: MobileCommunityRoomThreadCommentDraft;
    writeClient: SupabaseClientType;
  }): Promise<MobileCommunityRoomThreadComment> {
    // Verify the thread exists, belongs to the requested event, and is not
    // soft-deleted, so callers can't post on a guessed thread id or on a
    // thread whose author has tombstoned it.
    const threadResult = (await writeClient
      .from("event_room_threads")
      .select("id, event_id, author_id, deleted_at")
      .eq("id", threadId)
      .eq("event_id", eventId)
      .maybeSingle()) as {
      data: { author_id: string; deleted_at: string | null } | null;
      error: { message?: string } | null;
    };

    if (threadResult.error) {
      fail("Failed to verify thread.", threadResult.error);
    }
    if (!threadResult.data || threadResult.data.deleted_at) {
      throw new CommunityRoomThreadNotFoundError(threadId);
    }

    const threadAuthorId = threadResult.data.author_id;

    // Resolve effective parent_comment_id with depth-1 collapse:
    //   - null / undefined → top-level comment
    //   - points to a top-level comment in this thread → child
    //   - points to a depth-1 reply → collapse to that reply's parent
    //   - points to a non-existent, cross-thread, or soft-deleted comment → 400
    let parentCommentIdToInsert: string | null = null;
    if (draft.parentCommentId) {
      const parentResult = (await writeClient
        .from("event_room_thread_comments")
        .select("id, thread_id, parent_comment_id, deleted_at")
        .eq("id", draft.parentCommentId)
        .maybeSingle()) as {
        data:
          | {
              id: string;
              thread_id: string;
              parent_comment_id: string | null;
              deleted_at: string | null;
            }
          | null;
        error: { message?: string } | null;
      };

      if (parentResult.error) {
        fail("Failed to verify parent comment.", parentResult.error);
      }
      if (
        !parentResult.data ||
        parentResult.data.thread_id !== threadId ||
        parentResult.data.deleted_at
      ) {
        throw new Error("Parent comment not found in this thread.");
      }

      parentCommentIdToInsert =
        parentResult.data.parent_comment_id ?? parentResult.data.id;
    }

    const insertResult = (await writeClient
      .from("event_room_thread_comments")
      .insert({
        thread_id: threadId,
        author_id: authorId,
        body: draft.body.trim(),
        parent_comment_id: parentCommentIdToInsert,
      })
      .select(COMMENT_COLUMNS)
      .single()) as {
      data: unknown;
      error: { message?: string } | null;
    };

    if (insertResult.error || !insertResult.data) {
      fail("Failed to post comment.", insertResult.error);
    }

    const row = insertResult.data as CommentRow;

    const authorResult = await writeClient
      .from("profiles")
      .select("id, full_name, avatar_url, username, headline")
      .eq("id", authorId)
      .maybeSingle();

    if (authorResult.error || !authorResult.data) {
      throw new Error("Failed to load comment author profile.");
    }

    const author = authorResult.data as AuthorProfileRow;
    if (!author.username) {
      throw new Error("Author profile is incomplete.");
    }

    return {
      id: row.id,
      threadId: row.thread_id,
      parentId: row.parent_comment_id,
      body: row.body,
      createdAt: row.created_at,
      author: {
        id: author.id,
        fullName: author.full_name,
        username: author.username,
        avatarUrl: author.avatar_url,
      },
      isAuthor: true,
      isDeleted: false,
      editedAt: row.edited_at,
      isOp: authorId === threadAuthorId,
      replies: [],
    };
  }

  static async updateThread({
    eventId,
    threadId,
    authorId,
    draft,
    writeClient,
  }: {
    eventId: string;
    threadId: string;
    authorId: string;
    draft: MobileCommunityRoomThreadEditDraft;
    writeClient: SupabaseClientType;
  }): Promise<MobileCommunityRoomThread> {
    const updateResult = (await writeClient
      .from("event_room_threads")
      .update({
        title: draft.title.trim(),
        body: draft.body.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("event_id", eventId)
      .eq("author_id", authorId)
      .is("deleted_at", null)
      .select(THREAD_COLUMNS)
      .maybeSingle()) as {
      data: unknown;
      error: { message?: string } | null;
    };

    if (updateResult.error) {
      fail("Failed to update thread.", updateResult.error);
    }
    if (!updateResult.data) {
      throw new CommunityRoomThreadNotFoundError(threadId);
    }

    const row = updateResult.data as ThreadRow;

    const authorResult = await writeClient
      .from("profiles")
      .select("id, full_name, avatar_url, username, headline")
      .eq("id", row.author_id)
      .maybeSingle();

    if (authorResult.error || !authorResult.data) {
      throw new Error("Failed to load thread author profile.");
    }

    const author = authorResult.data as AuthorProfileRow;
    if (!author.username) {
      throw new Error("Author profile is incomplete.");
    }

    return shapeThread(row, author, authorId);
  }

  static async deleteThread({
    eventId,
    threadId,
    authorId,
    writeClient,
  }: {
    eventId: string;
    threadId: string;
    authorId: string;
    writeClient: SupabaseClientType;
  }): Promise<void> {
    const result = (await writeClient
      .from("event_room_threads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", threadId)
      .eq("event_id", eventId)
      .eq("author_id", authorId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle()) as {
      data: { id: string } | null;
      error: { message?: string } | null;
    };

    if (result.error) {
      fail("Failed to delete thread.", result.error);
    }
    if (!result.data) {
      throw new CommunityRoomThreadNotFoundError(threadId);
    }
  }

  static async updateComment({
    eventId,
    threadId,
    commentId,
    authorId,
    draft,
    writeClient,
  }: {
    eventId: string;
    threadId: string;
    commentId: string;
    authorId: string;
    draft: MobileCommunityRoomThreadCommentEditDraft;
    writeClient: SupabaseClientType;
  }): Promise<MobileCommunityRoomThreadComment> {
    // Confirm the parent thread exists, belongs to the event, and is live.
    const threadResult = (await writeClient
      .from("event_room_threads")
      .select("id, author_id, deleted_at")
      .eq("id", threadId)
      .eq("event_id", eventId)
      .maybeSingle()) as {
      data: { author_id: string; deleted_at: string | null } | null;
      error: { message?: string } | null;
    };

    if (threadResult.error) {
      fail("Failed to verify thread.", threadResult.error);
    }
    if (!threadResult.data || threadResult.data.deleted_at) {
      throw new CommunityRoomThreadNotFoundError(threadId);
    }

    const threadAuthorId = threadResult.data.author_id;

    const updateResult = (await writeClient
      .from("event_room_thread_comments")
      .update({
        body: draft.body.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .eq("thread_id", threadId)
      .eq("author_id", authorId)
      .is("deleted_at", null)
      .select(COMMENT_COLUMNS)
      .maybeSingle()) as {
      data: unknown;
      error: { message?: string } | null;
    };

    if (updateResult.error) {
      fail("Failed to update comment.", updateResult.error);
    }
    if (!updateResult.data) {
      throw new Error("Comment not found or not editable.");
    }

    const row = updateResult.data as CommentRow;

    const authorResult = await writeClient
      .from("profiles")
      .select("id, full_name, avatar_url, username, headline")
      .eq("id", row.author_id)
      .maybeSingle();

    if (authorResult.error || !authorResult.data) {
      throw new Error("Failed to load comment author profile.");
    }

    const author = authorResult.data as AuthorProfileRow;
    if (!author.username) {
      throw new Error("Author profile is incomplete.");
    }

    return {
      id: row.id,
      threadId: row.thread_id,
      parentId: row.parent_comment_id,
      body: row.body,
      createdAt: row.created_at,
      author: {
        id: author.id,
        fullName: author.full_name,
        username: author.username,
        avatarUrl: author.avatar_url,
      },
      isAuthor: row.author_id === authorId,
      isOp: row.author_id === threadAuthorId,
      isDeleted: false,
      editedAt: row.edited_at,
      replies: [],
    };
  }

  static async deleteComment({
    eventId,
    threadId,
    commentId,
    authorId,
    writeClient,
  }: {
    eventId: string;
    threadId: string;
    commentId: string;
    authorId: string;
    writeClient: SupabaseClientType;
  }): Promise<void> {
    // Verify the thread exists and isn't already tombstoned so the RPC
    // doesn't decrement a thread the caller can't actually mutate.
    const threadResult = (await writeClient
      .from("event_room_threads")
      .select("id, deleted_at")
      .eq("id", threadId)
      .eq("event_id", eventId)
      .maybeSingle()) as {
      data: { id: string; deleted_at: string | null } | null;
      error: { message?: string } | null;
    };

    if (threadResult.error) {
      fail("Failed to verify thread.", threadResult.error);
    }
    if (!threadResult.data || threadResult.data.deleted_at) {
      throw new CommunityRoomThreadNotFoundError(threadId);
    }

    const deleteResult = (await writeClient
      .from("event_room_thread_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("thread_id", threadId)
      .eq("author_id", authorId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle()) as {
      data: { id: string } | null;
      error: { message?: string } | null;
    };

    if (deleteResult.error) {
      fail("Failed to delete comment.", deleteResult.error);
    }
    if (!deleteResult.data) {
      throw new Error("Comment not found or not deletable.");
    }

    // The activity trigger only fires on INSERT/DELETE rows, so soft-delete
    // requires us to decrement the parent thread's comment_count separately.
    // Use the atomic RPC so concurrent soft-deletes don't race on a stale
    // read-then-write of the counter. The RPC clamps at zero internally.
    await writeClient.rpc(
      "event_room_thread_decrement_comment_count",
      { p_thread_id: threadId },
    );
  }
}
