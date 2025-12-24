/**
 * Fix/Refresh Organizer Logos Script
 *
 * Re-extracts logos using improved priority:
 * 1. JSON-LD Organization.logo
 * 2. apple-touch-icon
 * 3. Large favicon
 * 4. og:image (fallback)
 * 5. Google Favicon (last resort)
 *
 * Use REFRESH_ALL=1 to re-process all organizers, not just Clearbit ones.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { OgImageExtractorService } from '../src/services/ingestion/OgImageExtractorService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.env.BACKFILL_DRY_RUN === '1';
const REFRESH_ALL = process.env.REFRESH_ALL === '1';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function extractDomain(url: string): string | null {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return null;
    }
}

function getGoogleFaviconUrl(domain: string): string {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

async function fixClearbitLogos() {
    console.log(REFRESH_ALL ? 'Refreshing ALL organizer logos...\n' : 'Finding organizers with Clearbit logos...\n');

    // Find organizers to process
    let query = supabase
        .from('organizers')
        .select('id, name, domain, logo_url');

    if (!REFRESH_ALL) {
        // Only Clearbit logos
        query = query.like('logo_url', '%logo.clearbit.com%');
    }

    const { data: organizers, error } = await query;

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    console.log(`Found ${organizers?.length || 0} organizers to process\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const org of organizers || []) {
        // Find an event with source_url for this organizer
        const { data: events } = await supabase
            .from('events')
            .select('source_url')
            .eq('organizer_id', org.id)
            .not('source_url', 'is', null)
            .limit(1);

        const sourceUrl = events?.[0]?.source_url;

        if (!sourceUrl) {
            console.log(`  ○ "${org.name}" - no source_url found, using domain favicon`);
        }

        // Try og:image first
        let newLogoUrl: string | null = null;
        let logoSource = '';

        if (sourceUrl) {
            newLogoUrl = await OgImageExtractorService.extractOgImage(sourceUrl);
            if (newLogoUrl) {
                logoSource = 'og:image';
            }
        }

        // Fallback to Google Favicon
        if (!newLogoUrl) {
            const domain = org.domain || (sourceUrl ? extractDomain(sourceUrl) : null);
            if (domain) {
                newLogoUrl = getGoogleFaviconUrl(domain);
                logoSource = 'favicon';
            }
        }

        if (!newLogoUrl) {
            console.log(`  ✗ "${org.name}" - no logo source available`);
            errorCount++;
            continue;
        }

        if (DRY_RUN) {
            console.log(`  [DRY RUN] "${org.name}" → ${logoSource}: ${newLogoUrl}`);
            successCount++;
            continue;
        }

        // Update the organizer
        const { error: updateError } = await supabase
            .from('organizers')
            .update({ logo_url: newLogoUrl })
            .eq('id', org.id);

        if (updateError) {
            console.error(`  ✗ "${org.name}": ${updateError.message}`);
            errorCount++;
        } else {
            console.log(`  ✓ "${org.name}" → ${logoSource}: ${newLogoUrl}`);
            successCount++;
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Updated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
}

fixClearbitLogos();
