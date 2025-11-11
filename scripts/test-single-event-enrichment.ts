#!/usr/bin/env tsx
/**
 * Test FireCrawl Enrichment for Single Event
 * 
 * Runs FireCrawl enrichment for a specific event with detailed logging
 * to see what data is extracted and what's missing
 */

import { createServiceClient } from '@/utils/supabase/service';
import { FirecrawlEnrichmentService } from '@/services/ingestion/FirecrawlEnrichmentService';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

async function testSingleEventEnrichment(eventId: string) {
    console.log('🧪 Testing FireCrawl Enrichment for Single Event\n');
    console.log(`Event ID: ${eventId}\n`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Fetch event data
    console.log('📋 Fetching event data...');
    const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (fetchError || !event) {
        console.error(`❌ Error fetching event: ${fetchError?.message || 'Event not found'}`);
        process.exit(1);
    }

    console.log(`✅ Found event: ${event.title}`);
    console.log(`   Source URL: ${event.source_url}`);
    console.log(`   Registration URL: ${event.registration_url || 'N/A'}`);
    console.log(`   Current Status: ${event.firecrawl_enrichment_status || 'NULL'}`);
    console.log(`   Timezone: ${event.timezone || 'MISSING'}`);
    const priceStr = event.price_min || event.price_max 
        ? `${event.price_min || 'N/A'}-${event.price_max || 'N/A'} ${(event as any).price_currency || ''}` 
        : 'MISSING';
    console.log(`   Pricing: ${priceStr}`);
    console.log(`   Agenda URL: ${event.agenda_url || 'MISSING'}`);
    console.log(`   Daily Schedule: ${event.daily_schedule ? JSON.stringify(event.daily_schedule).substring(0, 100) + '...' : 'MISSING'}`);
    console.log('');

    // Try to extract actual domain from TechMeme redirect URL
    // TechMeme URLs have pattern: techmeme.com/r2/[domain]-[hash].htm
    console.log('🔍 Attempting to extract actual domain from TechMeme redirect (for reference)...');
    const sourceUrl = event.source_url as string;
    if (sourceUrl.includes('techmeme.com/r2/')) {
        const match = sourceUrl.match(/techmeme\.com\/r2\/([^\/_-]+)/);
        if (match && match[1]) {
            const domain = match[1];
            // Try common patterns: domain.com, www.domain.com
            const possibleUrls = [
                `https://${domain}`,
                `https://www.${domain}`,
            ];
            console.log(`   Extracted domain: ${domain}`);
            console.log(`   Effective URL candidates: ${possibleUrls.join(', ')}`);
            console.log('   (The enrichment service now resolves these automatically)\n');
        } else {
            console.log('   ⚠️  Could not extract domain from TechMeme URL\n');
        }
    } else {
        console.log('   ℹ️  Not a TechMeme redirect URL, using as-is\n');
    }

    // Reset enrichment status to pending so we can test
    console.log('🔄 Resetting enrichment status to pending...');
    await supabase
        .from('events')
        .update({
            firecrawl_enrichment_status: 'pending',
            firecrawl_enrichment_metadata: {
                retry_count: 0,
                attempted_at: null,
                error_message: null,
            },
        })
        .eq('id', eventId);
    console.log('✅ Status reset\n');

    // Run enrichment
    console.log('🚀 Starting FireCrawl enrichment...\n');
    const startTime = Date.now();

    try {
        const result = await FirecrawlEnrichmentService.processEnrichment(eventId, supabase);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`\n⏱️  Enrichment completed in ${duration}s`);
        console.log(`   Success: ${result.success}`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    } catch (error) {
        console.error(`\n❌ Enrichment failed with exception:`, error);
    }

    // Fetch updated event data
    console.log('\n📊 Checking updated event data...\n');
    const { data: updatedEvent, error: updatedError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (updatedError) {
        console.error(`❌ Error fetching updated event: ${updatedError.message}`);
        return;
    }

    console.log('📈 Enrichment Results:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Status: ${updatedEvent.firecrawl_enrichment_status}`);
    console.log('');

    // Check metadata
    const metadata = updatedEvent.firecrawl_enrichment_metadata as any;
    if (metadata) {
        console.log('Metadata:');
        console.log(`  Strategy: ${metadata.enrichment_strategy || 'N/A'}`);
        console.log(`  Complexity: ${metadata.site_complexity || 'N/A'}`);
        console.log(`  Pages Crawled: ${metadata.pages_crawled || 'N/A'}`);
        console.log(`  Credits Used: ${metadata.credits_used || 'N/A'}`);
        console.log(`  Fields Updated: ${metadata.fields_updated ? JSON.stringify(metadata.fields_updated) : 'N/A'}`);
        if (metadata.error_message) {
            console.log(`  Error: ${metadata.error_message}`);
        }
        console.log('');
    }

    // Check extracted fields
    console.log('Extracted Fields:');
    console.log('─────────────────────────────────────────────────────────────');
    
    const fields = {
        'Timezone': updatedEvent.timezone,
        'Pricing': updatedEvent.price_min || updatedEvent.price_max 
            ? `${updatedEvent.price_min || ''}-${updatedEvent.price_max || ''} ${(updatedEvent as any).price_currency || ''}`.trim()
            : null,
        'Agenda URL': updatedEvent.agenda_url,
        'Daily Schedule': updatedEvent.daily_schedule,
        'Description': updatedEvent.description ? updatedEvent.description.substring(0, 100) + '...' : null,
        'Location': updatedEvent.location,
        'Start Time': updatedEvent.start_time,
        'End Time': updatedEvent.end_time,
    };

    for (const [field, value] of Object.entries(fields)) {
        const status = value ? '✅' : '❌';
        console.log(`${status} ${field}: ${value ? (typeof value === 'object' ? JSON.stringify(value).substring(0, 200) : String(value)) : 'MISSING'}`);
    }

    // Check for agenda items and speakers in JSONB fields
    console.log('\nChecking for agenda items and speakers...');
    const agendaResponse = await supabase
        .from('events')
        .select('agenda, speakers')
        .eq('id', eventId)
        .single();

    if (agendaResponse.error) {
        console.log(`⚠️  Unable to load agenda/speakers JSON: ${agendaResponse.error.message}`);
    } else if (agendaResponse.data) {
        const agendaRecord = agendaResponse.data as { agenda?: unknown; speakers?: unknown };
        const { agenda, speakers } = agendaRecord;

        console.log(`Agenda Items: ${agenda ? (Array.isArray(agenda) ? `${agenda.length} items` : 'Present') : '❌ MISSING'}`);
        console.log(`Speakers: ${speakers ? (Array.isArray(speakers) ? `${speakers.length} speakers` : 'Present') : '❌ MISSING'}`);
        
        if (agenda && Array.isArray(agenda) && agenda.length > 0) {
            console.log('\nFirst 3 Agenda Items:');
            agenda.slice(0, 3).forEach((item: any, idx: number) => {
                console.log(`  ${idx + 1}. ${item.title || 'Untitled'}`);
                console.log(`     Time: ${item.startTime || 'N/A'} - ${item.endTime || 'N/A'}`);
                console.log(`     Speakers: ${item.speakers?.join(', ') || 'N/A'}`);
            });
        }

        if (speakers && Array.isArray(speakers) && speakers.length > 0) {
            console.log('\nFirst 5 Speakers:');
            speakers.slice(0, 5).forEach((speaker: any, idx: number) => {
                console.log(`  ${idx + 1}. ${speaker.name || 'Unknown'}`);
                console.log(`     Title: ${speaker.title || 'N/A'}`);
                console.log(`     Company: ${speaker.company || 'N/A'}`);
            });
        }
    }

    console.log('\n✅ Test complete!\n');
}

// Get event ID from command line or use default
const eventId = process.argv[2] || '358207a0-09a4-4148-b770-968cfc25fba7'; // Web Summit

testSingleEventEnrichment(eventId).catch(console.error);

