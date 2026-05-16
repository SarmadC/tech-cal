import type {
  MobileCommunityRoomAttendee,
  MobileCommunityRoomDetail,
  MobileCommunityRoomRelationship,
  MobileCommunityRoomSignal,
  MobileCommunityRoomSignalKind,
} from "@kurecal/domain";

import { BlockService } from "@/services/blockService";
import type { SupabaseClientType } from "@/types";

const ACTIVE_NOW_WINDOW_MS = 24 * 60 * 60 * 1000;
const SIGNAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SIGNAL_LIMIT = 8;

// Casts the typed Supabase client to a loosely-typed builder so we can query
// tables that haven't been regenerated into the Database types yet
// (event_room_threads ships in migration 20260515_event_room_threads.sql).
// Remove once `supabase gen types` has been re-run.
function untypedClient(client: SupabaseClientType): any {
  return client as any;
}

interface EventRow {
  id: string;
  slug: string;
  title: string | null;
  start_time: string;
  end_time: string | null;
  event_image_url: string | null;
  source_url: string | null;
  location: string | null;
  event_format: string | null;
  status: string;
}

interface AttendanceRow {
  user_id: string;
  status: string;
  is_bookmarked: boolean;
  created_at: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  headline: string | null;
  location: string | null;
  profile_visibility: string | null;
  show_attendance: boolean | null;
}

interface CareerProfileRow {
  user_id: string;
  current_role: string | null;
  industry: string | null;
  company_size: string | null;
}

interface ViewerProfileRow {
  show_attendance: boolean | null;
  profile_visibility: string | null;
  username: string | null;
}

interface ViewerEventRow {
  status: string | null;
  is_bookmarked: boolean | null;
}

export class CommunityRoomNotFoundError extends Error {
  constructor(eventId: string) {
    super(`Room not found for event ${eventId}`);
    this.name = "CommunityRoomNotFoundError";
  }
}

export class CommunityRoomService {
  static async getRoomDetail({
    viewerId,
    eventId,
    readClient,
    now = new Date(),
  }: {
    viewerId: string;
    eventId: string;
    readClient: SupabaseClientType;
    now?: Date;
  }): Promise<MobileCommunityRoomDetail> {
    const eventResult = await readClient
      .from("events")
      .select(
        "id, slug, title, start_time, end_time, event_image_url, source_url, location, event_format, status",
      )
      .eq("id", eventId)
      .eq("status", "confirmed")
      .maybeSingle();

    if (eventResult.error) {
      throw new Error("Failed to load room event.");
    }

    const event = (eventResult.data || null) as EventRow | null;
    if (!event) {
      throw new CommunityRoomNotFoundError(eventId);
    }

    const [
      viewerProfileResult,
      viewerEventResult,
      attendanceResult,
      threadCountResult,
    ] = await Promise.all([
      readClient
        .from("profiles")
        .select("show_attendance, profile_visibility, username")
        .eq("id", viewerId)
        .maybeSingle(),
      readClient
        .from("user_events")
        .select("status, is_bookmarked")
        .eq("event_id", eventId)
        .eq("user_id", viewerId)
        .maybeSingle(),
      readClient
        .from("user_events")
        .select("user_id, status, is_bookmarked, created_at")
        .eq("event_id", eventId)
        .in("status", ["attending", "attended"]),
      untypedClient(readClient)
        .from("event_room_threads")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
    ]);

    if (
      viewerProfileResult.error ||
      viewerEventResult.error ||
      attendanceResult.error
    ) {
      throw new Error("Failed to load room context.");
    }

    const threadCountRaw = threadCountResult as {
      count: number | null;
      error: unknown;
    };
    const threadCount = threadCountRaw.error
      ? 0
      : Math.max(0, threadCountRaw.count ?? 0);

    const viewerProfile = (viewerProfileResult.data || null) as
      | ViewerProfileRow
      | null;
    const viewerEvent = (viewerEventResult.data || null) as
      | ViewerEventRow
      | null;

    const isAttending =
      viewerEvent?.status === "attending" || viewerEvent?.status === "attended";
    const isSaved = Boolean(viewerEvent?.is_bookmarked) || isAttending;
    const isVisible =
      isAttending &&
      viewerProfile?.profile_visibility === "public" &&
      viewerProfile?.show_attendance === true &&
      Boolean(viewerProfile?.username);

    const attendanceRows = ((attendanceResult.data ||
      []) as AttendanceRow[]).filter((row) => row.user_id !== viewerId);

    const attendanceByUserId = new Map<string, AttendanceRow>();
    for (const row of attendanceRows) {
      if (!attendanceByUserId.has(row.user_id)) {
        attendanceByUserId.set(row.user_id, row);
      }
    }

    const totalAttendeeCount = attendanceByUserId.size;
    const candidateUserIds = Array.from(attendanceByUserId.keys());

    if (candidateUserIds.length === 0) {
      return {
        event: shapeEvent(event),
        viewer: { isAttending, isSaved, isVisible },
        stats: {
          totalAttendeeCount: 0,
          visibleAttendeeCount: 0,
          networkAttendingCount: 0,
          activeNowCount: 0,
          threadCount,
        },
        attendees: [],
        signals: [],
      };
    }

    const blockedIds = await BlockService.getBlockedUserIdsForViewer(
      viewerId,
      candidateUserIds,
      readClient,
    );
    const visibleCandidateIds = candidateUserIds.filter(
      (id) => !blockedIds.has(id),
    );

    if (visibleCandidateIds.length === 0) {
      return {
        event: shapeEvent(event),
        viewer: { isAttending, isSaved, isVisible },
        stats: {
          totalAttendeeCount,
          visibleAttendeeCount: 0,
          networkAttendingCount: 0,
          activeNowCount: 0,
          threadCount,
        },
        attendees: [],
        signals: [],
      };
    }

    const [
      profilesResult,
      careerProfilesResult,
      viewerFollowingResult,
      followedByResult,
    ] = await Promise.all([
      readClient
        .from("profiles")
        .select(
          "id, full_name, avatar_url, username, headline, location, profile_visibility, show_attendance",
        )
        .in("id", visibleCandidateIds),
      readClient
        .from("career_profiles")
        .select("user_id, current_role, industry, company_size")
        .in("user_id", visibleCandidateIds),
      readClient
        .from("follows")
        .select("following_id")
        .eq("follower_id", viewerId)
        .in("following_id", visibleCandidateIds),
      readClient
        .from("follows")
        .select("follower_id")
        .eq("following_id", viewerId)
        .in("follower_id", visibleCandidateIds),
    ]);

    if (
      profilesResult.error ||
      careerProfilesResult.error ||
      viewerFollowingResult.error ||
      followedByResult.error
    ) {
      throw new Error("Failed to load room attendee context.");
    }

    const profilesById = new Map<string, ProfileRow>(
      ((profilesResult.data || []) as ProfileRow[]).map((row) => [row.id, row]),
    );
    const careerProfilesById = new Map<string, CareerProfileRow>(
      ((careerProfilesResult.data || []) as CareerProfileRow[]).map((row) => [
        row.user_id,
        row,
      ]),
    );
    const followingIds = new Set<string>(
      ((viewerFollowingResult.data || []) as Array<{ following_id: string }>)
        .map((row) => row.following_id),
    );
    const followedByIds = new Set<string>(
      ((followedByResult.data || []) as Array<{ follower_id: string }>).map(
        (row) => row.follower_id,
      ),
    );

    const mutualConnectionsCountByUserId = await loadMutualConnectionCounts({
      readClient,
      viewerFollowingIds: followingIds,
      candidateIds: visibleCandidateIds,
    });

    const attendees: MobileCommunityRoomAttendee[] = [];
    let visibleAttendeeCount = 0;
    let networkAttendingCount = 0;
    const nowMs = now.getTime();
    const activeWindowCutoff = nowMs - ACTIVE_NOW_WINDOW_MS;
    let activeNowCount = 0;

    for (const userId of visibleCandidateIds) {
      const profile = profilesById.get(userId);
      const attendance = attendanceByUserId.get(userId);
      if (!profile || !profile.username || !attendance) {
        continue;
      }

      const isInNetwork = followingIds.has(userId);
      const followsViewer = followedByIds.has(userId);
      const isMutualFollow = isInNetwork && followsViewer;
      if (isInNetwork) {
        networkAttendingCount += 1;
      }

      const isAttendeeVisible =
        profile.profile_visibility === "public" &&
        profile.show_attendance === true;
      if (!isAttendeeVisible) {
        continue;
      }

      const createdAtMs = attendance.created_at
        ? new Date(attendance.created_at).getTime()
        : 0;
      if (createdAtMs >= activeWindowCutoff) {
        activeNowCount += 1;
      }

      const career = careerProfilesById.get(userId);
      const relationship = computeRelationship({
        isInNetwork,
        followsViewer,
        isMutualFollow,
      });

      attendees.push({
        id: profile.id,
        fullName: profile.full_name,
        username: profile.username,
        avatarUrl: profile.avatar_url,
        headline: profile.headline,
        currentRole: career?.current_role ?? null,
        industry: career?.industry ?? null,
        location: profile.location,
        isInNetwork,
        followsViewer,
        isMutualFollow,
        mutualConnectionsCount:
          mutualConnectionsCountByUserId.get(userId) ?? 0,
        relationship,
        matchReason: buildMatchReason({
          relationship,
          currentRole: career?.current_role ?? null,
          location: profile.location,
        }),
      });
      visibleAttendeeCount += 1;
    }

    attendees.sort(compareAttendees);

    const signalCutoff = nowMs - SIGNAL_WINDOW_MS;
    const signals: MobileCommunityRoomSignal[] = [];
    for (const userId of visibleCandidateIds) {
      const profile = profilesById.get(userId);
      const attendance = attendanceByUserId.get(userId);
      if (!profile || !profile.username || !attendance) continue;
      if (
        profile.profile_visibility !== "public" ||
        profile.show_attendance !== true
      ) {
        continue;
      }
      const createdAtMs = attendance.created_at
        ? new Date(attendance.created_at).getTime()
        : 0;
      if (createdAtMs < signalCutoff) continue;

      const isInNetwork = followingIds.has(userId);
      const isMutualFollow = isInNetwork && followedByIds.has(userId);

      let kind: MobileCommunityRoomSignalKind = "joined_attending";
      if (isMutualFollow) {
        kind = "mutual_arrived";
      } else if (attendance.is_bookmarked && attendance.status !== "attending") {
        kind = "saved";
      }

      signals.push({
        id: `${eventId}:${userId}`,
        kind,
        occurredAt: new Date(createdAtMs).toISOString(),
        actor: {
          id: profile.id,
          fullName: profile.full_name,
          username: profile.username,
          avatarUrl: profile.avatar_url,
        },
      });
    }

    signals.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    return {
      event: shapeEvent(event),
      viewer: { isAttending, isSaved, isVisible },
      stats: {
        totalAttendeeCount,
        visibleAttendeeCount,
        networkAttendingCount,
        activeNowCount,
        threadCount,
      },
      attendees,
      signals: signals.slice(0, SIGNAL_LIMIT),
    };
  }
}

async function loadMutualConnectionCounts({
  readClient,
  viewerFollowingIds,
  candidateIds,
}: {
  readClient: SupabaseClientType;
  viewerFollowingIds: Set<string>;
  candidateIds: string[];
}): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (viewerFollowingIds.size === 0 || candidateIds.length === 0) {
    return counts;
  }

  const candidateFollowingResult = await readClient
    .from("follows")
    .select("follower_id, following_id")
    .in("follower_id", candidateIds);

  if (candidateFollowingResult.error) {
    return counts;
  }

  for (const row of (candidateFollowingResult.data || []) as Array<{
    follower_id: string;
    following_id: string;
  }>) {
    if (!viewerFollowingIds.has(row.following_id)) continue;
    counts.set(row.follower_id, (counts.get(row.follower_id) ?? 0) + 1);
  }

  return counts;
}

function shapeEvent(event: EventRow) {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title || "Untitled event",
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.location,
    format: normalizeFormat(event.event_format),
    imageUrl: event.event_image_url,
    sourceUrl: event.source_url,
  };
}

function normalizeFormat(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function computeRelationship({
  isInNetwork,
  followsViewer,
  isMutualFollow,
}: {
  isInNetwork: boolean;
  followsViewer: boolean;
  isMutualFollow: boolean;
}): MobileCommunityRoomRelationship {
  if (isMutualFollow) return "mutual";
  if (followsViewer) return "follows_you";
  if (isInNetwork) return "in_network";
  return "stranger";
}

function buildMatchReason({
  relationship,
  currentRole,
  location,
}: {
  relationship: MobileCommunityRoomRelationship;
  currentRole: string | null;
  location: string | null;
}): string | null {
  if (relationship === "mutual") return "Mutual follow";
  if (relationship === "follows_you") return "Follows you";
  if (relationship === "in_network") return "In your network";
  if (currentRole) return currentRole;
  if (location) return location;
  return null;
}

const RELATIONSHIP_RANK: Record<MobileCommunityRoomRelationship, number> = {
  mutual: 0,
  follows_you: 1,
  in_network: 2,
  stranger: 3,
};

function compareAttendees(
  left: MobileCommunityRoomAttendee,
  right: MobileCommunityRoomAttendee,
): number {
  const orderDiff =
    RELATIONSHIP_RANK[left.relationship] - RELATIONSHIP_RANK[right.relationship];
  if (orderDiff !== 0) return orderDiff;
  if (right.mutualConnectionsCount !== left.mutualConnectionsCount) {
    return right.mutualConnectionsCount - left.mutualConnectionsCount;
  }
  const leftName = left.fullName || left.username;
  const rightName = right.fullName || right.username;
  return leftName.localeCompare(rightName);
}
