#!/usr/bin/env node

/**
 * Verification script for Firecrawl enrichment quality
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyEnrichmentQuality() {
    console.log('\n📊 Firecrawl Enrichment Quality Verification\n');
    console.log('='.repeat(70));

    try {
        // 1. Get enrichment statistics
        const { data: stats, error: statsError } = await supabase
            .from('events')
            .select('firecrawl_enrichment_status')
            .in('firecrawl_enrichment_status', ['completed', 'pending', 'failed', 'skipped']);

        if (statsError) throw statsError;

        const statusCounts = {
            completed: 0,
            pending: 0,
            failed: 0,
            skipped: 0,
        };

        stats?.forEach((event: any) => {
            statusCounts[event.firecrawl_enrichment_status as keyof typeof statusCounts]++;
        });

        console.log('\n📈 Overall Status Distribution:');
        console.log(`   ✅ Completed: ${statusCounts.completed}`);
        console.log(`   ⏳ Pending: ${statusCounts.pending}`);
        console.log(`   ❌ Failed: ${statusCounts.failed}`);
        console.log(`   ⊘ Skipped: ${statusCounts.skipped}`);

        // 2. Get quality metrics for completed events
        const { data: completed, error: completedError } = await supabase
            .from('events')
            .select('id, title, description, firecrawl_enrichment_metadata, event_image_url')
            .eq('firecrawl_enrichment_status', 'completed')
            .order('created_at', { ascending: false })
            .limit(10);

        if (completedError) throw completedError;

        console.log('\n📋 Top 10 Recently Completed Enrichments:\n');

        let totalQuality = 0;
        let totalPages = 0;
        let totalCredits = 0;
        let eventsWithAgenda = 0;
        let eventsWithImage = 0;
        let eventsWithDesc = 0;

        completed?.forEach((event: any, idx: number) => {
            const metadata = event.firecrawl_enrichment_metadata || {};
            const strategy = metadata.enrichment_strategy || 'unknown';
            const complexity = metadata.site_complexity || 'unknown';
            const quality = parseFloat(metadata.extraction_quality_score) || 0;
            const pages = parseInt(metadata.pages_crawled) || 1;
            const credits = parseFloat(metadata.credits_used) || 0;

            if (event.description) eventsWithDesc++;
            if (event.event_image_url) eventsWithImage++;

            totalQuality += quality;
            totalPages += pages;
            totalCredits += credits;

            const qualityBar = quality >= 0.8 ? '█' : quality >= 0.6 ? '▓' : '░';

            console.log(`${idx + 1}. ${event.title.substring(0, 50)}`);
            console.log(
                `   Strategy: ${strategy} | Complexity: ${complexity} | Pages: ${pages}`
            );
            console.log(
                `   Quality: ${quality.toFixed(2)} ${qualityBar} | Credits: ${credits.toFixed(1)} | Image: ${event.event_image_url ? '✓' : '✗'} | Desc: ${event.description ? '✓' : '✗'}`
            );
            console.log('');
        });

        if (completed && completed.length > 0) {
            const avgQuality = (totalQuality / completed.length).toFixed(2);
            const avgPages = (totalPages / completed.length).toFixed(1);
            const avgCredits = (totalCredits / completed.length).toFixed(1);

            console.log('📊 Average Metrics (for completed events):');
            console.log(`   Quality Score: ${avgQuality}`);
            console.log(`   Pages Crawled: ${avgPages}`);
            console.log(`   Credits Used: ${avgCredits}`);
            console.log(`   Events with descriptions: ${eventsWithDesc}/${completed.length}`);
            console.log(`   Events with images: ${eventsWithImage}/${completed.length}`);
        }

        // 3. Check for multi-page enrichments
        const { data: multiPage } = await supabase
            .from('events')
            .select('id, title, firecrawl_enrichment_metadata')
            .eq('firecrawl_enrichment_status', 'completed')
            .limit(100);

        if (multiPage) {
            const multiPageCount = multiPage.filter(
                (e: any) => parseInt(e.firecrawl_enrichment_metadata?.pages_crawled) > 1
            ).length;

            console.log(`\n🔍 Multi-Page Enrichments: ${multiPageCount} events crawled multiple pages`);
        }

        // 4. Check metadata completeness
        const { data: metadataCheck } = await supabase
            .from('events')
            .select('firecrawl_enrichment_metadata')
            .eq('firecrawl_enrichment_status', 'completed')
            .not('firecrawl_enrichment_metadata', 'is', null)
            .limit(100);

        if (metadataCheck) {
            const fullMetadata = metadataCheck.filter((e: any) => {
                const m = e.firecrawl_enrichment_metadata;
                return (
                    m.enrichment_strategy && m.site_complexity && m.extraction_quality_score
                );
            });
            console.log(`✅ Metadata completeness: ${fullMetadata.length}/${metadataCheck.length} events`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('✅ Verification Complete!\n');

        // Success criteria
        console.log('✓ Key Findings:');
        console.log(`  - Total enriched: ${statusCounts.completed} events ✅`);
        console.log(`  - Blocked (skipped): ${statusCounts.skipped} events ✅`);
        console.log(`  - Pending: ${statusCounts.pending} (${statusCounts.pending === 0 ? '✅' : '⚠️'})`);
        console.log(
            `  - Failed: ${statusCounts.failed} (${statusCounts.failed === 0 ? '✅' : '❌'})`
        );

        process.exit(0);
    } catch (error) {
        console.error('Error during verification:', error);
        process.exit(1);
    }
}

verifyEnrichmentQuality();
