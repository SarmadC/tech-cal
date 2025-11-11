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

    const eventData = event as unknown as {
        title: string;
        source_url: string | null;
        registration_url: string | null;
        firecrawl_enrichment_status: string | null;
        timezone: string | null;
        price_min: number | null;
        price_max: number | null;
        currency: string | null;
        agenda_url: string | null;
        daily_schedule: unknown;
    };
    console.log(`✅ Found event: ${eventData.title}`);
    console.log(`   Source URL: ${eventData.source_url}`);
    console.log(`   Registration URL: ${eventData.registration_url || 'N/A'}`);
    console.log(`   Current Status: ${eventData.firecrawl_enrichment_status || 'NULL'}`);
    console.log(`   Timezone: ${eventData.timezone || 'MISSING'}`);
    const priceStr = eventData.price_min || eventData.price_max 
        ? `${eventData.price_min || 'N/A'}-${eventData.price_max || 'N/A'} ${eventData.currency || ''}` 
        : 'MISSING';
    console.log(`   Pricing: ${priceStr}`);
    console.log(`   Agenda URL: ${eventData.agenda_url || 'MISSING'}`);
    console.log(`   Daily Schedule: ${eventData.daily_schedule ? JSON.stringify(eventData.daily_schedule).substring(0, 100) + '...' : 'MISSING'}`);
    console.log('');

    // Try to extract actual domain from TechMeme redirect URL
    // TechMeme URLs have pattern: techmeme.com/r2/[domain]-[hash].htm
    console.log('🔍 Attempting to extract actual domain from TechMeme redirect (for reference)...');
    const sourceUrl = eventData.source_url as string;
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
        } as Record<string, unknown>)
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

    const updatedEventData = updatedEvent as unknown as {
        firecrawl_enrichment_status: string | null;
        firecrawl_enrichment_metadata: unknown;
        timezone: string | null;
        price_min: number | null;
        price_max: number | null;
        currency: string | null;
        agenda_url: string | null;
        daily_schedule: unknown;
        description: string | null;
        location: string | null;
        start_time: string | null;
        end_time: string | null;
    };
    
    console.log('📈 Enrichment Results:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Status: ${updatedEventData.firecrawl_enrichment_status}`);
    console.log('');

    // Check metadata
    const metadata = updatedEventData.firecrawl_enrichment_metadata as any;
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
        'Timezone': updatedEventData.timezone,
        'Pricing': updatedEventData.price_min || updatedEventData.price_max 
            ? `${updatedEventData.price_min || ''}-${updatedEventData.price_max || ''} ${updatedEventData.currency || ''}`.trim()
            : null,
        'Agenda URL': updatedEventData.agenda_url,
        'Daily Schedule': updatedEventData.daily_schedule,
        'Description': updatedEventData.description ? updatedEventData.description.substring(0, 100) + '...' : null,
        'Location': updatedEventData.location,
        'Start Time': updatedEventData.start_time,
        'End Time': updatedEventData.end_time,
    };

    for (const [field, value] of Object.entries(fields)) {
        const status = value ? '✅' : '❌';
        console.log(`${status} ${field}: ${value ? (typeof value === 'object' ? JSON.stringify(value).substring(0, 200) : String(value)) : 'MISSING'}`);
    }

    // Check for agenda items and speakers in JSONB fields
    console.log('\nChecking for agenda items and speakers...');
    // Query agenda and speakers from related tables
    const { data: agendaItems } = await supabase
        .from('event_agenda')
        .select('*')
        .eq('event_id', eventId)
        .order('day_number', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);

    const { data: speakers } = await supabase
        .from('speakers')
        .select('*, agenda_speakers!inner(agenda_id)')
        .limit(10);

    if (agendaItems || speakers) {
        console.log(`Agenda Items: ${agendaItems && agendaItems.length > 0 ? `${agendaItems.length} items` : '❌ MISSING'}`);
        console.log(`Speakers: ${speakers && speakers.length > 0 ? `${speakers.length} speakers` : '❌ MISSING'}`);
        
        if (agendaItems && agendaItems.length > 0) {
            console.log('\nFirst 3 Agenda Items:');
            agendaItems.slice(0, 3).forEach((item: any, idx: number) => {
                const itemData = item as { title: string; start_time: string; end_time: string | null };
                console.log(`  ${idx + 1}. ${itemData.title || 'Untitled'}`);
                console.log(`     Time: ${itemData.start_time || 'N/A'} - ${itemData.end_time || 'N/A'}`);
            });
        }

        if (speakers && speakers.length > 0) {
            console.log('\nFirst 5 Speakers:');
            speakers.slice(0, 5).forEach((speaker: any, idx: number) => {
                const speakerData = speaker as { name: string; title: string | null; company: string | null };
                console.log(`  ${idx + 1}. ${speakerData.name || 'Unknown'}`);
                console.log(`     Title: ${speakerData.title || 'N/A'}`);
                console.log(`     Company: ${speakerData.company || 'N/A'}`);
            });
        }
    }

    console.log('\n✅ Test complete!\n');
}

// Get event ID from command line or use default
const eventId = process.argv[2] || '358207a0-09a4-4148-b770-968cfc25fba7'; // Web Summit

testSingleEventEnrichment(eventId).catch(console.error);

