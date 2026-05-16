import { NextResponse, type NextRequest } from "next/server";

import {
  CommunityRoomNotFoundError,
  CommunityRoomService,
} from "@/services/communityRoomService";
import { createServiceClient } from "@/utils/supabase/service";
import { getAuthenticatedRequestContext } from "@/utils/supabase/requestAuth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;

    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Community service is not configured." },
        { status: 500 },
      );
    }

    const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);

    const data = await CommunityRoomService.getRoomDetail({
      viewerId: authContext.user.id,
      eventId,
      readClient: readSupabase,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CommunityRoomNotFoundError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load community room",
      },
      { status: 500 },
    );
  }
}
