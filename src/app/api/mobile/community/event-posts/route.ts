import { NextResponse, type NextRequest } from "next/server";

import { CommunityHubService } from "@/services/communityHubService";
import { createServiceClient } from "@/utils/supabase/service";
import { getAuthenticatedRequestContext } from "@/utils/supabase/requestAuth";

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(
      request as NextRequest,
    );
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId")?.trim();
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "eventId query parameter is required" },
        { status: 400 },
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
    const posts = await CommunityHubService.getEventPosts({
      eventId,
      readClient: readSupabase,
    });

    return NextResponse.json({
      success: true,
      data: { posts, totalCount: posts.length },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load event posts",
      },
      { status: 500 },
    );
  }
}
