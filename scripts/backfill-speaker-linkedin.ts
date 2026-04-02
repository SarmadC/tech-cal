import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { SpeakerEnrichmentService, type SpeakerEnrichmentCandidate } from '../src/services/ingestion/SpeakerEnrichmentService';
import { env } from '../src/utils/env';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in environment.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const enrichmentService = new SpeakerEnrichmentService();

const BATCH_SIZE = 10;
const CONFIDENCE_THRESHOLD = 0.8;

async function backfillSpeakers(dryRun: boolean = true) {
    console.log(`Starting speaker backfill... (Dry Run: ${dryRun})`);

    // 1. Fetch eligible speakers
    // Criteria: linkedin_url is null AND name, title, company are NOT null.
    // Also, ignoring empty strings (these may be stored as '' instead of null depending on ingestion).
    const { data: candidates, error } = await supabase
        .from('speakers')
        .select('id, name, title, company')
        .is('linkedin_url', null)
        .not('name', 'is', null)
        .not('title', 'is', null)
        .not('company', 'is', null)
        .neq('name', '')
        .neq('title', '')
        .neq('company', '');

    if (error) {
        console.error('Error fetching speakers:', error);
        return;
    }

    if (!candidates || candidates.length === 0) {
        console.log('No eligible speakers found. Everyone seems up to date!');
        return;
    }

    console.log(`Found ${candidates.length} eligible speakers. Processing in batches of ${BATCH_SIZE}...`);

    let successCount = 0;
    let failCount = 0;
    let ambiguousCount = 0;

    // 2. Process in batches
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE) as SpeakerEnrichmentCandidate[];
        console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(candidates.length / BATCH_SIZE)}...`);

        const results = await enrichmentService.enrichSpeakersBatch(batch);

        for (const result of results) {
            const speaker = batch.find(s => s.id === result.speakerId);
            if (!speaker) continue;

            if (result.linkedinUrl && result.confidence >= CONFIDENCE_THRESHOLD) {
                console.log(`[SUCCESS] ${speaker.name} (${speaker.company}) -> ${result.linkedinUrl} (Score: ${result.confidence})`);
                
                if (!dryRun) {
                    // Update database
                    const { error: updateError } = await supabase
                        .from('speakers')
                        .update({ linkedin_url: result.linkedinUrl })
                        .eq('id', speaker.id);

                    if (updateError) {
                        console.error(`  -> Database error for ${speaker.name}:`, updateError.message);
                    } else {
                        successCount++;
                    }
                } else {
                    successCount++;
                }

            } else if (result.linkedinUrl) {
                console.log(`[AMBIGUOUS] ${speaker.name} (${speaker.company}) -> Found ${result.linkedinUrl} but confidence too low (${result.confidence}). ${result.rationale || ''}`);
                ambiguousCount++;
            } else {
                console.log(`[NOT FOUND] ${speaker.name} (${speaker.company}) -> No match. ${result.rationale || ''}`);
                failCount++;
            }
        }
    }

    console.log('\n================================');
    console.log('BACKFILL COMPLETE');
    console.log('================================');
    console.log(`Total Eligible:  ${candidates.length}`);
    console.log(`Successfully Enriched: ${successCount}`);
    console.log(`Ambiguous (Skipped):  ${ambiguousCount}`);
    console.log(`Not Found (Skipped):  ${failCount}`);

    if (dryRun) {
        console.log('\nNOTE: This was a DRY RUN. No database records were updated.');
        console.log('To run for real, pass --apply (e.g., npx tsx scripts/backfill-speaker-linkedin.ts --apply)');
    }
}

// Parse args
const args = process.argv.slice(2);
const isDryRun = !args.includes('--apply');

backfillSpeakers(isDryRun).then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Unhandled script error:', err);
    process.exit(1);
});
