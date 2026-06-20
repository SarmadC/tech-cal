/**
 * Backfill script: proxy existing external image URLs through Supabase Storage.
 *
 * Usage:
 *   npx tsx scripts/backfill-proxied-images.ts [--apply] [--limit N] [--table events|organizers|speakers]
 *
 * Dry-run by default. Pass --apply to write changes to the DB.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pLimit from 'p-limit';

import { proxyImageToStorage, isSupabaseStorageUrl, urlStorageKey } from '../src/services/imageProxyService';
import { env } from '../src/utils/env';

dotenv.config({ path: '.env.local' });

const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const CONCURRENCY = 3;
const PAGE_SIZE = 100;

function parseArgs() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--apply');
    const tableArg = args.find((_, i) => args[i - 1] === '--table');
    const tables = tableArg
        ? [tableArg as 'events' | 'organizers' | 'speakers']
        : ['events', 'organizers', 'speakers'] as const;

    let limit = Infinity;
    const limitIdx = args.indexOf('--limit');
    if (limitIdx !== -1 && args[limitIdx + 1]) {
        const parsed = parseInt(args[limitIdx + 1], 10);
        if (Number.isFinite(parsed) && parsed > 0) limit = parsed;
    }

    return { dryRun, tables, limit };
}

async function backfillEvents(dryRun: boolean, limit: number) {
    console.log('\n── Events ──');
    const limiter = pLimit(CONCURRENCY);
    let cursor: string | null = null;
    let total = 0, proxied = 0, skipped = 0, failed = 0;

    while (total < limit) {
        let query = supabase
            .from('events')
            .select('id, event_image_url')
            .not('event_image_url', 'is', null)
            .neq('event_image_url', '')
            .not('event_image_url', 'like', '%supabase.co%')
            .order('id')
            .limit(Math.min(PAGE_SIZE, limit - total));

        if (cursor) query = query.gt('id', cursor);

        const { data, error } = await query;
        if (error) { console.error('Events query error:', error); break; }
        if (!data?.length) break;

        cursor = data[data.length - 1].id;

        await Promise.all(data.map(row => limiter(async () => {
            total++;
            const url = row.event_image_url!;
            if (isSupabaseStorageUrl(url)) { skipped++; return; }

            if (dryRun) {
                console.log(`  [dry] event ${row.id}: ${url.slice(0, 80)}`);
                proxied++;
                return;
            }

            const result = await proxyImageToStorage({
                sourceUrl: url,
                bucket: 'logos',
                storagePath: urlStorageKey('events', url),
                supabaseClient: supabase,
            });

            if (result) {
                await supabase.from('events').update({ event_image_url: result }).eq('id', row.id);
                proxied++;
                console.log(`  ✓ event ${row.id}`);
            } else {
                failed++;
                console.log(`  ✗ event ${row.id}: proxy failed, keeping original`);
            }
        })));

        if (data.length < PAGE_SIZE) break;
    }

    console.log(`  total=${total} proxied=${proxied} skipped=${skipped} failed=${failed}`);
}

async function backfillOrganizers(dryRun: boolean, limit: number) {
    console.log('\n── Organizers ──');
    const limiter = pLimit(CONCURRENCY);
    let cursor: string | null = null;
    let total = 0, proxied = 0, skipped = 0, failed = 0;

    while (total < limit) {
        let query = supabase
            .from('organizers')
            .select('id, domain, logo_url')
            .like('logo_url', 'http%')
            .not('logo_url', 'like', '%supabase.co%')
            .order('id')
            .limit(Math.min(PAGE_SIZE, limit - total));

        if (cursor) query = query.gt('id', cursor);

        const { data, error } = await query;
        if (error) { console.error('Organizers query error:', error); break; }
        if (!data?.length) break;

        cursor = data[data.length - 1].id;

        await Promise.all(data.map(row => limiter(async () => {
            total++;
            const url = row.logo_url!;
            if (isSupabaseStorageUrl(url)) { skipped++; return; }

            if (dryRun) {
                console.log(`  [dry] organizer ${row.id} (${row.domain}): ${url.slice(0, 80)}`);
                proxied++;
                return;
            }

            const result = await proxyImageToStorage({
                sourceUrl: url,
                bucket: 'logos',
                storagePath: urlStorageKey('organizers', url),
                supabaseClient: supabase,
            });

            if (result) {
                await supabase.from('organizers').update({ logo_url: result }).eq('id', row.id);
                proxied++;
                console.log(`  ✓ organizer ${row.id} (${row.domain})`);
            } else {
                failed++;
                console.log(`  ✗ organizer ${row.id} (${row.domain}): proxy failed, keeping original`);
            }
        })));

        if (data.length < PAGE_SIZE) break;
    }

    console.log(`  total=${total} proxied=${proxied} skipped=${skipped} failed=${failed}`);
}

async function backfillSpeakers(dryRun: boolean, limit: number) {
    console.log('\n── Speakers (non-LinkedIn) ──');
    const limiter = pLimit(CONCURRENCY);
    let cursor: string | null = null;
    let total = 0, proxied = 0, skipped = 0, failed = 0;

    while (total < limit) {
        let query = supabase
            .from('speakers')
            .select('id, photo_url')
            .not('photo_url', 'is', null)
            .is('linkedin_url', null)
            .not('photo_url', 'like', '%supabase.co%')
            .order('id')
            .limit(Math.min(PAGE_SIZE, limit - total));

        if (cursor) query = query.gt('id', cursor);

        const { data, error } = await query;
        if (error) { console.error('Speakers query error:', error); break; }
        if (!data?.length) break;

        cursor = data[data.length - 1].id;

        await Promise.all(data.map(row => limiter(async () => {
            total++;
            const url = row.photo_url!;
            if (isSupabaseStorageUrl(url)) { skipped++; return; }

            if (dryRun) {
                console.log(`  [dry] speaker ${row.id}: ${url.slice(0, 80)}`);
                proxied++;
                return;
            }

            const result = await proxyImageToStorage({
                sourceUrl: url,
                bucket: 'avatars',
                storagePath: urlStorageKey('speakers', url),
                supabaseClient: supabase,
            });

            if (result) {
                await supabase.from('speakers').update({ photo_url: result }).eq('id', row.id);
                proxied++;
                console.log(`  ✓ speaker ${row.id}`);
            } else {
                failed++;
                console.log(`  ✗ speaker ${row.id}: proxy failed, keeping original`);
            }
        })));

        if (data.length < PAGE_SIZE) break;
    }

    console.log(`  total=${total} proxied=${proxied} skipped=${skipped} failed=${failed}`);
}

async function main() {
    const { dryRun, tables, limit } = parseArgs();

    console.log('Backfill proxied images');
    console.log(`  Dry run: ${dryRun} (pass --apply to write changes)`);
    console.log(`  Tables: ${tables.join(', ')}`);
    console.log(`  Limit per table: ${limit === Infinity ? 'none' : limit}`);

    if (tables.includes('events')) await backfillEvents(dryRun, limit);
    if (tables.includes('organizers')) await backfillOrganizers(dryRun, limit);
    if (tables.includes('speakers')) await backfillSpeakers(dryRun, limit);

    console.log('\nDone.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
