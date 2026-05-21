import { NextResponse, type NextRequest } from "next/server";
import { mobileCommunityRoomThreadCommentEditDraftSchema } from "@kurecal/domain";

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

interface RouteContext {
  params: Promise<{
    eventId: string;
    threadId: string;
    commentId: string;
  }>;
}

const CONTEXT = "community.rooms.threads.comments.[commentId]";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createServiceClient(supabaseUrl, serviceRoleKey);
}

function notFoundResponse(error: CommunityRoomThreadNotFoundError) {
  return NextResponse.json(
    { success: false, error: error.message },
    { status: 404 },
  );
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { eventId, threadId, commentId } = await params;
    if (
      !isValidUuid(eventId) ||
      !isValidUuid(threadId) ||
      !isValidUuid(commentId)
    ) {
      return invalidRequest();
    }

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) return authRequired();

    const readClient = getServiceClient();
    if (!readClient) return serviceUnavailable();

    const comment = await CommunityRoomThreadService.getThreadComment({
      eventId,
      threadId,
      commentId,
      viewerId: authContext.user.id,
      readClient,
    });

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    if (error instanceof CommunityRoomThreadNotFoundError) {
      return notFoundResponse(error);
    }
    return genericFailure(CONTEXT, "Failed to load comment.", error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { eventId, threadId, commentId } = await params;
    if (
      !isValidUuid(eventId) ||
      !isValidUuid(threadId) ||
      !isValidUuid(commentId)
    ) {
      return invalidRequest();
    }

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) return authRequired();

    const writeClient = getServiceClient();
    if (!writeClient) return serviceUnavailable();

    const rateLimitResponse = await gateMutation(
      "comment-update",
      authContext.user.id,
    );
    if (rateLimitResponse) return rateLimitResponse;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return invalidRequest("Invalid request body.");
    }

    const parsed =
      mobileCommunityRoomThreadCommentEditDraftSchema.safeParse(json);
    if (!parsed.success) {
      return invalidRequest(
        parsed.error.issues[0]?.message ?? "Invalid comment draft.",
      );
    }

    const comment = await CommunityRoomThreadService.updateComment({
      eventId,
      threadId,
      commentId,
      authorId: authContext.user.id,
      draft: parsed.data,
      writeClient,
    });

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    if (error instanceof CommunityRoomThreadNotFoundError) {
      return notFoundResponse(error);
    }
    return genericFailure(CONTEXT, "Failed to update comment.", error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { eventId, threadId, commentId } = await params;
    if (
      !isValidUuid(eventId) ||
      !isValidUuid(threadId) ||
      !isValidUuid(commentId)
    ) {
      return invalidRequest();
    }

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) return authRequired();

    const writeClient = getServiceClient();
    if (!writeClient) return serviceUnavailable();

    const rateLimitResponse = await gateMutation(
      "comment-delete",
      authContext.user.id,
    );
    if (rateLimitResponse) return rateLimitResponse;

    await CommunityRoomThreadService.deleteComment({
      eventId,
      threadId,
      commentId,
      authorId: authContext.user.id,
      writeClient,
    });

    return NextResponse.json({ success: true, data: { id: commentId } });
  } catch (error) {
    if (error instanceof CommunityRoomThreadNotFoundError) {
      return notFoundResponse(error);
    }
    return genericFailure(CONTEXT, "Failed to delete comment.", error);
  }
}
