#!/usr/bin/env tsx
/**
 * Test FireCrawl Enrichment for Single Event (Fast - Scrape Only)
 * 
 * Tests with scrape strategy only for faster results
 */

import { createServiceClient } from '@/utils/supabase/service';
import { getSemanticEventSchema } from '@/services/ingestion/FirecrawlExtractionPrompts';
import { FirecrawlEnrichmentService } from '@/services/ingestion/FirecrawlEnrichmentService';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

async function testSingleEventEnrichmentFast(eventId: string) {
    console.log('🧪 Testing FireCrawl Enrichment (Fast Mode - Scrape Only)\n');
    console.log(`Event ID: ${eventId}\n`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Fetch event data
    const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (fetchError || !event) {
        console.error(`❌ Error fetching event: ${fetchError?.message || 'Event not found'}`);
        process.exit(1);
    }

    console.log(`✅ Event: ${event.title}`);
    console.log(`   Source URL: ${event.source_url}\n`);

    // Extract domain from TechMeme URL if needed
    let testUrl = event.source_url as string;
    if (testUrl.includes('techmeme.com/r2/')) {
        const match = testUrl.match(/techmeme\.com\/r2\/([^\/_-]+)/);
        if (match && match[1]) {
            testUrl = `https://${match[1]}`;
            console.log(`   Using direct URL: ${testUrl}\n`);
        }
    }

    // Test with scrape strategy (faster) - use FirecrawlEnrichmentService's private client
    console.log('🚀 Testing with scrape strategy...\n');
    
    const schema = getSemanticEventSchema();
    
    // Access the firecrawlClient singleton through the service
    // We'll need to use the service's processEnrichment method or access client directly
    // For now, let's create a simple test that calls the service
    console.log('   Note: Using FirecrawlEnrichmentService.processEnrichment for testing\n');
    
    // Reset status and run full enrichment
    await supabase
        .from('events')
        .update({
            firecrawl_enrichment_status: 'pending',
            firecrawl_enrichment_metadata: { retry_count: 0 },
        })
        .eq('id', eventId);
    
    const result = await FirecrawlEnrichmentService.processEnrichment(eventId, supabase);
    
    console.log(`\n✅ Enrichment completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (result.error) {
        console.log(`   Error: ${result.error}\n`);
    }
    
    // Fetch updated data
    const { data: updatedEvent } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
    
    if (!updatedEvent) {
        console.log('❌ Could not fetch updated event\n');
        return;
    }
    
    // Show results
    console.log('📊 Extraction Results:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Status: ${updatedEvent.firecrawl_enrichment_status}`);
    
    // For direct API test, let's also try a simple scrape
    console.log('\n🔍 Also testing direct FireCrawl API call...\n');
    
    // Import the firecrawl client directly
    const FirecrawlModule = await import('@mendable/firecrawl-js');
    const Firecrawl = FirecrawlModule.default;
    const apiKey = process.env.FIRECRAWL_API_KEY;
    
    if (!apiKey) {
        console.log('❌ FIRECRAWL_API_KEY not set\n');
        return;
    }
    
    const firecrawl = new Firecrawl({ apiKey });
    
    try {
        const scrapeResult = await firecrawl.scrapeUrl(testUrl, {
            formats: ['markdown', 'extract'],
            extract: {
                schema: schema,
                prompt: 'CRITICAL: Extract timezone, pricing, agenda items, speakers, daily schedule, and agenda URL from this event page. Extract ALL available information.',
            },
        });
        
        if (scrapeResult.success && scrapeResult.extract) {
            const extracted = scrapeResult.extract as any;
            console.log('✅ Direct API extraction successful!\n');
            
            console.log('📊 Extracted Data:');
            console.log('─────────────────────────────────────────────────────────────');
            console.log(`Timezone: ${extracted.timezone || '❌ MISSING'}`);
            console.log(`Start Time: ${extracted.startTime || '❌ MISSING'}`);
            console.log(`End Time: ${extracted.endTime || '❌ MISSING'}`);
            console.log(`Pricing: ${extracted.pricing ? JSON.stringify(extracted.pricing) : '❌ MISSING'}`);
            console.log(`Daily Schedule: ${extracted.dailySchedule ? JSON.stringify(extracted.dailySchedule).substring(0, 200) + '...' : '❌ MISSING'}`);
            console.log(`Agenda Items: ${extracted.agenda ? `${extracted.agenda.length} items` : '❌ MISSING'}`);
            console.log(`Speakers: ${extracted.speakers ? `${extracted.speakers.length} speakers` : '❌ MISSING'}`);
            
            if (extracted.agenda && Array.isArray(extracted.agenda) && extracted.agenda.length > 0) {
                console.log('\n📅 First 3 Agenda Items:');
                extracted.agenda.slice(0, 3).forEach((item: any, idx: number) => {
                    console.log(`  ${idx + 1}. ${item.title || 'Untitled'}`);
                    console.log(`     Time: ${item.startTime || 'N/A'} - ${item.endTime || 'N/A'}`);
                    console.log(`     Speakers: ${item.speakers?.join(', ') || 'N/A'}`);
                });
            }

            if (extracted.speakers && Array.isArray(extracted.speakers) && extracted.speakers.length > 0) {
                console.log('\n👥 First 5 Speakers:');
                extracted.speakers.slice(0, 5).forEach((speaker: any, idx: number) => {
                    console.log(`  ${idx + 1}. ${speaker.name || 'Unknown'}`);
                    console.log(`     ${speaker.title || ''}${speaker.company ? ` at ${speaker.company}` : ''}`);
                });
            }

            if (extracted.dailySchedule && Array.isArray(extracted.dailySchedule)) {
                console.log('\n📆 Daily Schedule:');
                extracted.dailySchedule.forEach((day: any) => {
                    console.log(`  Day ${day.dayNumber || '?'}: ${day.startTime || 'N/A'} - ${day.endTime || 'N/A'}`);
                    if (day.dayLabel) console.log(`     ${day.dayLabel}`);
                });
            }
            
            console.log('\n📄 Full Extracted JSON:');
            console.log(JSON.stringify(extracted, null, 2).substring(0, 2000));
        } else {
            console.log(`❌ Direct API extraction failed: ${scrapeResult.error || 'Unknown error'}\n`);
        }
    } catch (error) {
        console.log(`❌ Error during direct API test: ${error}\n`);
    }

    if (result.success && result.data?.json) {
        const extracted = result.data.json as any;
        console.log('✅ Extraction successful!\n');
        console.log('📊 Extracted Data:');
        console.log('─────────────────────────────────────────────────────────────');
        console.log(`Timezone: ${extracted.timezone || '❌ MISSING'}`);
        console.log(`Start Time: ${extracted.startTime || '❌ MISSING'}`);
        console.log(`End Time: ${extracted.endTime || '❌ MISSING'}`);
        console.log(`Pricing: ${extracted.pricing ? JSON.stringify(extracted.pricing) : '❌ MISSING'}`);
        console.log(`Daily Schedule: ${extracted.dailySchedule ? JSON.stringify(extracted.dailySchedule).substring(0, 200) + '...' : '❌ MISSING'}`);
        console.log(`Agenda Items: ${extracted.agenda ? `${extracted.agenda.length} items` : '❌ MISSING'}`);
        console.log(`Speakers: ${extracted.speakers ? `${extracted.speakers.length} speakers` : '❌ MISSING'}`);
        
        if (extracted.agenda && Array.isArray(extracted.agenda) && extracted.agenda.length > 0) {
            console.log('\n📅 First 3 Agenda Items:');
            extracted.agenda.slice(0, 3).forEach((item: any, idx: number) => {
                console.log(`  ${idx + 1}. ${item.title || 'Untitled'}`);
                console.log(`     Time: ${item.startTime || 'N/A'} - ${item.endTime || 'N/A'}`);
                console.log(`     Speakers: ${item.speakers?.join(', ') || 'N/A'}`);
            });
        }

        if (extracted.speakers && Array.isArray(extracted.speakers) && extracted.speakers.length > 0) {
            console.log('\n👥 First 5 Speakers:');
            extracted.speakers.slice(0, 5).forEach((speaker: any, idx: number) => {
                console.log(`  ${idx + 1}. ${speaker.name || 'Unknown'}`);
                console.log(`     ${speaker.title || ''}${speaker.company ? ` at ${speaker.company}` : ''}`);
            });
        }

        if (extracted.dailySchedule && Array.isArray(extracted.dailySchedule)) {
            console.log('\n📆 Daily Schedule:');
            extracted.dailySchedule.forEach((day: any) => {
                console.log(`  Day ${day.dayNumber || '?'}: ${day.startTime || 'N/A'} - ${day.endTime || 'N/A'}`);
                if (day.dayLabel) console.log(`     ${day.dayLabel}`);
            });
        }

        console.log('\n📄 Full JSON (first 1000 chars):');
        console.log(JSON.stringify(extracted, null, 2).substring(0, 1000) + '...\n');
    } else {
        console.log(`❌ Extraction failed: ${result.error || 'Unknown error'}\n`);
    }

    console.log('✅ Test complete!\n');
}

const eventId = process.argv[2] || '358207a0-09a4-4148-b770-968cfc25fba7';
testSingleEventEnrichmentFast(eventId).catch(console.error);

