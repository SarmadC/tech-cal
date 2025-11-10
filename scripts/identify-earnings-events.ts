#!/usr/bin/env tsx
/**
 * Identify Earnings Events
 * 
 * Finds events with earnings-related titles that should be filtered out.
 * Helps identify events that slipped through before the filter was added.
 */

import { createServiceClient } from '@/utils/supabase/service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

async function identifyEarningsEvents() {
    console.log('🔍 Identifying earnings-related events...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Find events with earnings-related titles
    const { data: earningsEvents, error } = await supabase
        .from('events')
        .select('id, title, start_time, organizer_id, created_at')
        .or('title.ilike.%earnings%,title.ilike.%Earnings%')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('❌ Error fetching events:', error.message);
        process.exit(1);
    }

    if (!earningsEvents || earningsEvents.length === 0) {
        console.log('✅ No earnings-related events found!');
        return;
    }

    console.log(`📊 Found ${earningsEvents.length} earnings-related event(s):\n`);

    const earningsPattern = /^earnings:/i;
    const earningsCallPattern = /earnings call/i;
    const earningsReportPattern = /earnings report/i;
    
    let shouldFilterCount = 0;
    const shouldFilter: typeof earningsEvents = [];
    const maybeFilter: typeof earningsEvents = [];

    earningsEvents.forEach((event, idx) => {
        const title = event.title || '';
        const matchesEarningsPrefix = earningsPattern.test(title);
        const matchesEarningsCall = earningsCallPattern.test(title);
        const matchesEarningsReport = earningsReportPattern.test(title);
        
        const shouldFilterEvent = matchesEarningsPrefix || matchesEarningsCall || matchesEarningsReport;

        if (shouldFilterEvent) {
            shouldFilterCount++;
            shouldFilter.push(event);
        } else {
            maybeFilter.push(event);
        }

        console.log(`${idx + 1}. ${title}`);
        console.log(`   ID: ${event.id}`);
        console.log(`   Created: ${event.created_at}`);
        console.log(`   Start: ${event.start_time || 'N/A'}`);
        
        if (shouldFilterEvent) {
            console.log(`   ⚠️  Should be filtered (matches earnings pattern)`);
        } else {
            console.log(`   ⚠️  May need review (contains "earnings" but not in standard format)`);
        }
        console.log('');
    });

    console.log('\n📊 Summary:');
    console.log(`   - Total earnings-related events: ${earningsEvents.length}`);
    console.log(`   - Should be filtered: ${shouldFilterCount}`);
    console.log(`   - Need review: ${maybeFilter.length}`);
    
    if (shouldFilter.length > 0) {
        console.log('\n💡 To remove these events, you can:');
        console.log('   1. Mark them as filtered in source_events:');
        console.log(`      UPDATE source_events SET fetch_status = 'filtered', error_message = 'Filtered: Earnings announcement - not a tech event' WHERE normalized_event_id IN (${shouldFilter.map(e => `'${e.id}'`).join(', ')});`);
        console.log('\n   2. Or delete them from events table (if they have no tracked events):');
        console.log(`      DELETE FROM events WHERE id IN (${shouldFilter.map(e => `'${e.id}'`).join(', ')});`);
    }

    console.log('\n✅ Identification complete!\n');
}

identifyEarningsEvents().catch(console.error);

