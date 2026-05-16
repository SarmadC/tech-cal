import { NextResponse, type NextRequest } from "next/server";
import { mobileCommunityRoomThreadDraftSchema } from "@kurecal/domain";

import { gateMutation } from "@/lib/api/mobileMutationRateLimit";
import {
  authRequired,
  genericFailure,
  invalidRequest,
  serviceUnavailable,
} from "@/lib/api/mobileResponses";
import { isValidUuid } from "@/lib/uuid";
import { CommunityRoomThreadService } from "@/services/communityRoomThreadService";
import { createServiceClient } from "@/utils/supabase/service";
import { getAuthenticatedRequestContext } from "@/utils/supabase/requestAuth";

const CONTEXT = "community.rooms.threads";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    if (!isValidUuid(eventId)) return invalidRequest();

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) return authRequired();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return serviceUnavailable();

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    const readClient = createServiceClient(supabaseUrl, serviceRoleKey);

    const data = await CommunityRoomThreadService.listThreads({
      eventId,
      viewerId: authContext.user.id,
      readClient,
      cursor: cursor ?? undefined,
      limit:
        typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return genericFailure(CONTEXT, "Failed to load threads.", error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    if (!isValidUuid(eventId)) return invalidRequest();

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) return authRequired();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return serviceUnavailable();

    const rateLimitResponse = await gateMutation(
      "thread-create",
      authContext.user.id,
    );
    if (rateLimitResponse) return rateLimitResponse;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return invalidRequest("Invalid request body.");
    }

    const parsed = mobileCommunityRoomThreadDraftSchema.safeParse(json);
    if (!parsed.success) {
      return invalidRequest(
        parsed.error.issues[0]?.message ?? "Invalid thread draft.",
      );
    }

    const writeClient = createServiceClient(supabaseUrl, serviceRoleKey);

    const thread = await CommunityRoomThreadService.createThread({
      eventId,
      authorId: authContext.user.id,
      draft: parsed.data,
      writeClient,
    });

    return NextResponse.json({ success: true, data: thread }, { status: 201 });
  } catch (error) {
    return genericFailure(CONTEXT, "Failed to create thread.", error);
  }
}
