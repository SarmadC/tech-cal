import type { MobileCommunityCirclePreview } from "@/types/community";
import type { SupabaseClientType } from "@/types/database";

const CIRCLE_LIMIT = 6;

interface CircleRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  member_count: number | null;
}

export class CommunityCirclesService {
  static async getCircles({
    viewerId,
    readClient,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<MobileCommunityCirclePreview[]> {
    try {
      const [circlesResult, membershipsResult] = await Promise.all([
        readClient
          .from("circles")
          .select("id, slug, name, description, member_count")
          .order("member_count", { ascending: false })
          .limit(CIRCLE_LIMIT),
        readClient
          .from("circle_members")
          .select("circle_id")
          .eq("user_id", viewerId),
      ]);

      const joinedIds = new Set(
        ((membershipsResult.data || []) as { circle_id: string }[]).map(
          (m) => m.circle_id,
        ),
      );

      return ((circlesResult.data || []) as CircleRow[]).map((circle) => ({
        id: circle.id,
        slug: circle.slug,
        name: circle.name,
        description: circle.description || "",
        isJoined: joinedIds.has(circle.id),
        memberCount: circle.member_count ?? 0,
      }));
    } catch (error) {
      console.error("Failed to load community circles:", error);
      return [];
    }
  }
}
