import { NextResponse, type NextRequest } from "next/server";
import {
  mobileCommunityRoomCommentSortSchema,
  mobileCommunityRoomThreadEditDraftSchema,
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

interface RouteContext {
  params: Promise<{ eventId: string; threadId: string }>;
}

const CONTEXT = "community.rooms.threads.[threadId]";

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
    const { eventId, threadId } = await params;
    if (!isValidUuid(eventId) || !isValidUuid(threadId)) {
      return invalidRequest();
    }

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) return authRequired();

    const readClient = getServiceClient();
    if (!readClient) return serviceUnavailable();

    const url = new URL(request.url);
    const sortRaw = url.searchParams.get("sort");
    const sortParsed = sortRaw
      ? mobileCommunityRoomCommentSortSchema.safeParse(sortRaw)
      : null;
    const sort = sortParsed?.success ? sortParsed.data : undefined;

    const data = await CommunityRoomThreadService.getThreadDetail({
      eventId,
      threadId,
      viewerId: authContext.user.id,
      readClient,
      sort,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CommunityRoomThreadNotFoundError) {
      return notFoundResponse(error);
    }
    return genericFailure(CONTEXT, "Failed to load thread.", error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { eventId, threadId } = await params;
    if (!isValidUuid(eventId) || !isValidUuid(threadId)) {
      return invalidRequest();
    }

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) return authRequired();

    const writeClient = getServiceClient();
    if (!writeClient) return serviceUnavailable();

    const rateLimitResponse = await gateMutation(
      "thread-update",
      authContext.user.id,
    );
    if (rateLimitResponse) return rateLimitResponse;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return invalidRequest("Invalid request body.");
    }

    const parsed = mobileCommunityRoomThreadEditDraftSchema.safeParse(json);
    if (!parsed.success) {
      return invalidRequest(
        parsed.error.issues[0]?.message ?? "Invalid thread draft.",
      );
    }

    const thread = await CommunityRoomThreadService.updateThread({
      eventId,
      threadId,
      authorId: authContext.user.id,
      draft: parsed.data,
      writeClient,
    });

    return NextResponse.json({ success: true, data: thread });
  } catch (error) {
    if (error instanceof CommunityRoomThreadNotFoundError) {
      return notFoundResponse(error);
    }
    return genericFailure(CONTEXT, "Failed to update thread.", error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { eventId, threadId } = await params;
    if (!isValidUuid(eventId) || !isValidUuid(threadId)) {
      return invalidRequest();
    }

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) return authRequired();

    const writeClient = getServiceClient();
    if (!writeClient) return serviceUnavailable();

    const rateLimitResponse = await gateMutation(
      "thread-delete",
      authContext.user.id,
    );
    if (rateLimitResponse) return rateLimitResponse;

    await CommunityRoomThreadService.deleteThread({
      eventId,
      threadId,
      authorId: authContext.user.id,
      writeClient,
    });

    return NextResponse.json({ success: true, data: { id: threadId } });
  } catch (error) {
    if (error instanceof CommunityRoomThreadNotFoundError) {
      return notFoundResponse(error);
    }
    return genericFailure(CONTEXT, "Failed to delete thread.", error);
  }
}
