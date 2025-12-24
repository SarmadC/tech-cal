/**
 * Backfill Organizer Logos Migration Script
 *
 * Fetches og:image from event source URLs for organizers missing logos.
 *
 * Usage: npx tsx scripts/backfill-organizer-logos.ts
 *
 * Environment Variables:
 * - BACKFILL_MAX_ORGANIZERS: Max organizers to process (0 = no cap)
 * - BACKFILL_DRY_RUN: Set to '1' for dry run
 * - BACKFILL_BATCH_SIZE: Organizers per batch (default: 10)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { OgImageExtractorService } from '../src/services/ingestion/OgImageExtractorService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Extract domain from URL for favicon fallback
 */
function extractDomain(url: string): string | null {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return null;
    }
}

/**
 * Get Google Favicon URL as fallback
 */
function getGoogleFaviconUrl(domain: string): string {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_ORGANIZERS = parseInt(process.env.BACKFILL_MAX_ORGANIZERS || '0', 10);
const DRY_RUN = process.env.BACKFILL_DRY_RUN === '1';
const BATCH_SIZE = parseInt(process.env.BACKFILL_BATCH_SIZE || '10', 10);

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OrganizerWithEvents {
    id: string;
    name: string;
    logo_url: string | null;
    events: { source_url: string | null }[];
}

async function backfillOrganizerLogos() {
    console.log('Starting organizer logo backfill...\n');
    console.log('Configuration:');
    console.log(`  - Max organizers: ${MAX_ORGANIZERS || 'unlimited'}`);
    console.log(`  - Dry run: ${DRY_RUN}`);
    console.log(`  - Batch size: ${BATCH_SIZE}\n`);

    try {
        // Find organizers without logos, with their events
        const { data: organizers, error: queryError } = await supabase
            .from('organizers')
            .select(
                `
                id,
                name,
                logo_url,
                events (source_url)
            `
            )
            .is('logo_url', null);

        if (queryError) {
            console.error('Error querying organizers:', queryError);
            process.exit(1);
        }

        // Filter to organizers that have events with source_url
        let organizersToProcess = (organizers || []).filter(
            (org: OrganizerWithEvents) =>
                org.events && org.events.some((e) => e.source_url)
        ) as OrganizerWithEvents[];

        if (MAX_ORGANIZERS > 0) {
            organizersToProcess = organizersToProcess.slice(0, MAX_ORGANIZERS);
        }

        if (organizersToProcess.length === 0) {
            console.log(
                'No organizers without logos found (or none with event source URLs).'
            );
            return;
        }

        console.log(
            `Found ${organizersToProcess.length} organizers without logos to process\n`
        );

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < organizersToProcess.length; i += BATCH_SIZE) {
            const batch = organizersToProcess.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(
                organizersToProcess.length / BATCH_SIZE
            );
            console.log(
                `Processing batch ${batchNum}/${totalBatches} (${batch.length} organizers)...`
            );

            for (const org of batch) {
                try {
                    // Get the first event with a source_url
                    const eventWithUrl = org.events.find((e) => e.source_url);
                    if (!eventWithUrl?.source_url) {
                        skippedCount++;
                        continue;
                    }

                    const sourceUrl = eventWithUrl.source_url;

                    if (DRY_RUN) {
                        console.log(
                            `  [DRY RUN] Would fetch og:image for "${org.name}" from ${sourceUrl}`
                        );
                        successCount++;
                        continue;
                    }

                    // Extract og:image
                    let logoUrl =
                        await OgImageExtractorService.extractOgImage(sourceUrl);
                    let logoSource = 'og:image';

                    // Fallback to Google Favicon if og:image not found
                    if (!logoUrl) {
                        const domain = extractDomain(sourceUrl);
                        if (domain) {
                            logoUrl = getGoogleFaviconUrl(domain);
                            logoSource = 'favicon';
                        }
                    }

                    if (logoUrl) {
                        // Update the organizer
                        const { error: updateError } = await supabase
                            .from('organizers')
                            .update({ logo_url: logoUrl })
                            .eq('id', org.id);

                        if (updateError) {
                            console.error(
                                `  ✗ "${org.name}": Failed to update - ${updateError.message}`
                            );
                            errorCount++;
                        } else {
                            console.log(`  ✓ "${org.name}" → ${logoSource}: ${logoUrl}`);
                            successCount++;
                        }
                    } else {
                        if (process.env.BACKFILL_VERBOSE === '1') {
                            console.log(
                                `  ○ "${org.name}" → no logo source available`
                            );
                        }
                        skippedCount++;
                    }
                } catch (error) {
                    errorCount++;
                    console.error(
                        `  ✗ "${org.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }

            // Small delay between batches to avoid rate limiting
            if (i + BATCH_SIZE < organizersToProcess.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        console.log('\n=== Backfill Summary ===');
        console.log(`Total organizers processed: ${organizersToProcess.length}`);
        console.log(`Logos updated: ${successCount}`);
        console.log(`Skipped (no og:image found): ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log('\nBackfill complete!');
    } catch (error) {
        console.error('Fatal error during backfill:', error);
        process.exit(1);
    }
}

// Run the backfill
backfillOrganizerLogos()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
