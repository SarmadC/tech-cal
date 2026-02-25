/**
 * Backfill Hackathon Header Images Script
 *
 * Fetches og:image or twitter:image from hackathon source URLs to populate header_image_url.
 *
 * Usage: npx tsx scripts/backfill-hackathon-header-images.ts
 *
 * Environment Variables:
 * - BACKFILL_MAX_HACKATHONS: Max hackathons to process (0 = no cap)
 * - BACKFILL_DRY_RUN: Set to '1' for dry run
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { OgImageExtractorService } from '../src/services/ingestion/OgImageExtractorService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_HACKATHONS = parseInt(process.env.BACKFILL_MAX_HACKATHONS || '0', 10);
const DRY_RUN = process.env.BACKFILL_DRY_RUN === '1';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillHackathonHeaderImages() {
    console.log('Starting hackathon header image backfill...\n');
    console.log('Configuration:');
    console.log(`  - Max hackathons: ${MAX_HACKATHONS || 'unlimited'}`);
    console.log(`  - Dry run: ${DRY_RUN}\n`);

    try {
        // Find hackathons with source_url but without header_image_url
        const { data: hackathons, error: queryError } = await supabase
            .from('hackathons')
            .select('id, title, source_url')
            .is('header_image_url', null)
            .not('source_url', 'is', null);

        if (queryError) {
            console.error('Error querying hackathons:', queryError);
            process.exit(1);
        }

        let hackathonsToProcess = hackathons || [];
        if (MAX_HACKATHONS > 0) {
            hackathonsToProcess = hackathonsToProcess.slice(0, MAX_HACKATHONS);
        }

        if (hackathonsToProcess.length === 0) {
            console.log('No hackathons found to process.');
            return;
        }

        console.log(`Found ${hackathonsToProcess.length} hackathons to process\n`);

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const hackathon of hackathonsToProcess) {
            try {
                const sourceUrl = hackathon.source_url;
                if (!sourceUrl) {
                    skippedCount++;
                    continue;
                }

                if (DRY_RUN) {
                    console.log(`  [DRY RUN] Would fetch image for "${hackathon.title}" from ${sourceUrl}`);
                    successCount++;
                    continue;
                }

                // Extract image using OgImageExtractorService
                // Note: This service prioritizes logos, but the fallback chain
                // (og:image, twitter:image) is exactly what we want for headers
                // when a semantic logo isn't found.
                const imageUrl = await OgImageExtractorService.extractOgImage(sourceUrl);

                if (imageUrl) {
                    const { error: updateError } = await supabase
                        .from('hackathons')
                        .update({ header_image_url: imageUrl })
                        .eq('id', hackathon.id);

                    if (updateError) {
                        console.error(`  ✗ "${hackathon.title}": Failed to update - ${updateError.message}`);
                        errorCount++;
                    } else {
                        console.log(`  ✓ "${hackathon.title}": ${imageUrl}`);
                        successCount++;
                    }
                } else {
                    console.log(`  ○ "${hackathon.title}": No image found`);
                    skippedCount++;
                }

                // Throttle to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                errorCount++;
                console.error(`  ✗ "${hackathon.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        console.log('\n=== Backfill Summary ===');
        console.log(`Total hackathons: ${hackathonsToProcess.length}`);
        console.log(`Images found and updated: ${successCount}`);
        console.log(`No image found: ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log('\nBackfill complete!');
    } catch (error) {
        console.error('Fatal error during backfill:', error);
        process.exit(1);
    }
}

backfillHackathonHeaderImages();
