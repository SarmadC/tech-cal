import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { SpeakerAvatarCacheService } from '../src/services/speakerAvatarCacheService';
import { env } from '../src/utils/env';

dotenv.config({ path: '.env.local' });

const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in environment.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function parseArgs() {
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--apply');
    const forceRefresh = args.includes('--force');

    let limit = 100;
    const limitIndex = args.indexOf('--limit');
    if (limitIndex !== -1 && args[limitIndex + 1]) {
        const parsed = parseInt(args[limitIndex + 1], 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            limit = Math.min(parsed, 500);
        }
    }

    return { dryRun, forceRefresh, limit };
}

async function backfillAvatars() {
    const { dryRun, forceRefresh, limit } = parseArgs();

    console.log('Starting speaker avatar backfill...');
    console.log(`  Dry Run: ${dryRun}`);
    console.log(`  Force Refresh: ${forceRefresh}`);
    console.log(`  Limit: ${limit}`);
    console.log('');

    const summary = await SpeakerAvatarCacheService.backfillLinkedInSpeakerAvatars({
        supabaseClient: supabase,
        limit,
        dryRun,
        forceRefresh,
    });

    for (const result of summary.results) {
        const tag = result.status === 'cached'
            ? '[CACHED]'
            : result.status === 'skipped'
                ? '[SKIPPED]'
                : '[FAILED]';
        const detail = result.avatarUrl || result.reason || '';
        console.log(`${tag} ${result.speakerId} ${detail}`);
    }

    console.log('\n================================');
    console.log('AVATAR BACKFILL COMPLETE');
    console.log('================================');
    console.log(`Scanned:   ${summary.scanned}`);
    console.log(`Eligible:  ${summary.eligible}`);
    console.log(`Processed: ${summary.processed}`);
    console.log(`Cached:    ${summary.cached}`);
    console.log(`Skipped:   ${summary.skipped}`);
    console.log(`Failed:    ${summary.failed}`);

    if (dryRun) {
        console.log('\nNOTE: This was a DRY RUN. No avatars were downloaded or updated.');
        console.log('To run for real: npx tsx scripts/backfill-speaker-avatars.ts --apply');
        console.log('Options: --limit N (max 500), --force (refresh existing cached avatars)');
    }
}

backfillAvatars().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Unhandled script error:', err);
    process.exit(1);
});
