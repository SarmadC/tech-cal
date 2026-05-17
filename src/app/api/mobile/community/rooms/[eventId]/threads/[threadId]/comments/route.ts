import { NextResponse, type NextRequest } from "next/server";
import {
  mobileCommunityRoomCommentSortSchema,
  mobileCommunityRoomThreadCommentDraftSchema,
} from "@kurecal/domain";

import { gateMutation } from "@/lib/api/mobileMutationRateLimit";
import {
  authRequired,
  genericFailure,
  invalidRequest,
  serviceUnavailable,
} from "@/lib/api/mobileResponses";
import { isValidUuid } from "@/lib/uuid";
import {
  CommunityRoomThreadNotFoundError,
  CommunityRoomThreadService,
} from "@/services/communityRoomThreadService";
import { createServiceClient } from "@/utils/supabase/service";
import { getAuthenticatedRequestContext } from "@/utils/supabase/requestAuth";

const CONTEXT = "community.rooms.threads.comments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string; threadId: string }> },
) {
  try {
    const { eventId, threadId } = await params;
    if (!isValidUuid(eventId) || !isValidUuid(threadId)) {
      return invalidRequest();
    }

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) return authRequired();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return serviceUnavailable();

    const url = new URL(request.url);
    const sortRaw = url.searchParams.get("sort");
    const sortParsed = sortRaw
      ? mobileCommunityRoomCommentSortSchema.safeParse(sortRaw)
      : null;
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    const readClient = createServiceClient(supabaseUrl, serviceRoleKey);
    const page = await CommunityRoomThreadService.getThreadCommentsPage({
      eventId,
      threadId,
      viewerId: authContext.user.id,
      readClient,
      sort: sortParsed?.success ? sortParsed.data : undefined,
      cursor: url.searchParams.get("cursor"),
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    if (error instanceof CommunityRoomThreadNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 },
      );
    }
    return genericFailure(CONTEXT, "Failed to load comments.", error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string; threadId: string }> },
) {
  try {
    const { eventId, threadId } = await params;
    if (!isValidUuid(eventId) || !isValidUuid(threadId)) {
      return invalidRequest();
    }

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) return authRequired();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return serviceUnavailable();

    const rateLimitResponse = await gateMutation(
      "comment-create",
      authContext.user.id,
    );
    if (rateLimitResponse) return rateLimitResponse;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return invalidRequest("Invalid request body.");
    }

    const parsed = mobileCommunityRoomThreadCommentDraftSchema.safeParse(json);
    if (!parsed.success) {
      return invalidRequest(
        parsed.error.issues[0]?.message ?? "Invalid comment draft.",
      );
    }

    // If the draft includes a parentCommentId, validate it's a UUID before
    // letting Postgres throw a generic cast error.
    if (
      parsed.data.parentCommentId != null &&
      !isValidUuid(parsed.data.parentCommentId)
    ) {
      return invalidRequest();
    }

    const writeClient = createServiceClient(supabaseUrl, serviceRoleKey);

    const comment = await CommunityRoomThreadService.createComment({
      eventId,
      threadId,
      authorId: authContext.user.id,
      draft: parsed.data,
      writeClient,
    });

    return NextResponse.json(
      { success: true, data: comment },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CommunityRoomThreadNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 },
      );
    }
    return genericFailure(CONTEXT, "Failed to post comment.", error);
  }
}
