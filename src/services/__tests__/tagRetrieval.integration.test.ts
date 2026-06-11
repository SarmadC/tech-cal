/**
 * Integration test for tag-retrieval PostgREST semantics.
 *
 * The unit suite mocks the Supabase client, which is exactly why the
 * missing-`!inner` bug (audit finding C1) went unnoticed: filters on a
 * non-inner embedded relation do not restrict parent rows. This test runs
 * the real queries against a live Supabase project to pin that behavior.
 *
 * Skipped unless explicitly enabled:
 *   RUN_SUPABASE_INTEGRATION=true \
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   npx vitest run src/services/__tests__/tagRetrieval.integration.test.ts
 */
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_INTEGRATION_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_INTEGRATION_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const enabled =
  process.env.RUN_SUPABASE_INTEGRATION === 'true' && Boolean(supabaseUrl && supabaseKey);

type EmbeddedTagRow = {
  event_tags: { event_tag: string } | null;
};

type EventRow = {
  id: string;
  title: string;
  tags: EmbeddedTagRow[] | null;
};

describe.runIf(enabled)('tag retrieval PostgREST semantics (integration)', () => {
  const supabase = createClient(supabaseUrl!, supabaseKey!);

  async function findTagWithUpcomingEvents(): Promise<string | null> {
    // Grab a handful of tags and probe for one attached to an upcoming event
    const { data: tags } = await supabase
      .from('event_tags')
      .select('event_tag')
      .limit(20);

    for (const row of tags ?? []) {
      const { data } = await supabase
        .from('events')
        .select('id, tag_filter:event_tag_relations!inner(event_tags!inner(event_tag))')
        .eq('status', 'confirmed')
        .gte('start_time', new Date().toISOString())
        .in('tag_filter.event_tags.event_tag', [row.event_tag])
        .limit(1);

      if (data && data.length > 0) {
        return row.event_tag;
      }
    }

    return null;
  }

  it('inner-joined tag_filter embed returns only events carrying the tag', async () => {
    const tag = await findTagWithUpcomingEvents();
    if (!tag) {
      console.warn('[integration] No upcoming tagged events in this project; skipping assertion');
      return;
    }

    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        tags:event_tag_relations (
          event_tags (event_tag)
        ),
        tag_filter:event_tag_relations!inner (
          event_tags!inner (event_tag)
        )
      `)
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .in('tag_filter.event_tags.event_tag', [tag])
      .limit(20);

    expect(error).toBeNull();
    expect(data?.length ?? 0).toBeGreaterThan(0);

    // Every returned event must actually carry the tag (checked against the
    // unfiltered `tags` embed, which holds the event's full tag list)
    (data as unknown as EventRow[]).forEach(event => {
      const tagNames = (event.tags ?? [])
        .map(relation => relation.event_tags?.event_tag)
        .filter(Boolean);
      expect(tagNames).toContain(tag);
    });
  });

  it('documents the failure mode: non-inner embed filters do NOT restrict events', async () => {
    // A tag that cannot exist — a correctly filtering query must return zero rows
    const impossibleTag = `__no_such_tag_${Date.now()}__`;

    const { data: innerData, error: innerError } = await supabase
      .from('events')
      .select('id, tag_filter:event_tag_relations!inner(event_tags!inner(event_tag))')
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .in('tag_filter.event_tags.event_tag', [impossibleTag])
      .limit(5);

    expect(innerError).toBeNull();
    expect(innerData).toHaveLength(0);

    // The old (buggy) shape: same filter on a non-inner embed. PostgREST only
    // strips embedded rows, so events still come back. If this assertion ever
    // fails with length 0, PostgREST semantics changed and the !inner
    // workaround can be revisited.
    const { data: nonInnerData, error: nonInnerError } = await supabase
      .from('events')
      .select('id, tags:event_tag_relations(event_tags(event_tag))')
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .in('tags.event_tags.event_tag', [impossibleTag])
      .limit(5);

    expect(nonInnerError).toBeNull();
    expect((nonInnerData?.length ?? 0)).toBeGreaterThan(0);
  });
});
