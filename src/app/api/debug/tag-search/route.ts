import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to test tag search directly
 * GET /api/debug/tag-search?term=data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const term = searchParams.get('term') || 'data';

    const supabase = await createClient();

    // 1. Check if tag exists
    console.log('[DEBUG API] Searching for tags matching:', term);
    const { data: tags, error: tagError } = await supabase
      .from('event_tags')
      .select('id, event_tag, category')
      .ilike('event_tag', `%${term}%`);

    if (tagError) {
      console.error('[DEBUG API] Tag query error:', tagError);
      return NextResponse.json({ error: 'Tag query failed', details: tagError }, { status: 500 });
    }

    console.log('[DEBUG API] Found tags:', tags?.length || 0);

    // 2. Check event_tag_relations with the same query as getEventIdsByTagSearch
    const { data: relations, error: relError } = await supabase
      .from('event_tag_relations')
      .select(`
        event_id,
        event_tags!inner (
          id,
          event_tag
        )
      `)
      .ilike('event_tags.event_tag', `%${term}%`);

    if (relError) {
      console.error('[DEBUG API] Relations query error:', relError);
      return NextResponse.json({ error: 'Relations query failed', details: relError }, { status: 500 });
    }

    console.log('[DEBUG API] Found relations:', relations?.length || 0);

    // 3. Count total tags and relations
    const { count: totalTags } = await supabase
      .from('event_tags')
      .select('*', { count: 'exact', head: true });

    const { count: totalRelations } = await supabase
      .from('event_tag_relations')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      searchTerm: term,
      results: {
        matchingTags: tags || [],
        matchingRelations: relations || [],
        eventIds: relations ? [...new Set(relations.map((r: any) => r.event_id))] : []
      },
      stats: {
        matchingTagCount: tags?.length || 0,
        matchingRelationCount: relations?.length || 0,
        totalTagsInDB: totalTags || 0,
        totalRelationsInDB: totalRelations || 0
      }
    });
  } catch (error) {
    console.error('[DEBUG API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
