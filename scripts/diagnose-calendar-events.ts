/**
 * Diagnostic script to investigate missing calendar events
 * Run with: npx tsx scripts/diagnose-calendar-events.ts
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

async function diagnoseEvents() {
  console.log('🔍 Starting Calendar Events Diagnostic...\n');

  try {
    // 1. Count all events
    console.log('📊 Event Count Overview:');
    const { count: totalEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });
    console.log(`  Total events in database: ${totalEvents}`);

    // 2. Count events by status
    console.log('\n📋 Events by Status:');
    const { data: statusCounts } = await supabase
      .from('events')
      .select('status, id');

    const statusMap = new Map<string, number>();
    statusCounts?.forEach(event => {
      const status = event.status || 'null';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    statusMap.forEach((count, status) => {
      console.log(`  ${status}: ${count}`);
    });

    // 3. Count events by ingestion source
    console.log('\n🔗 Events by Ingestion Source:');
    const { data: sourceCounts } = await supabase
      .from('events')
      .select('ingestion_source_id, id');

    const sourceMap = new Map<string | null, number>();
    sourceCounts?.forEach(event => {
      const source = event.ingestion_source_id || 'manual';
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });

    sourceMap.forEach((count, source) => {
      console.log(`  ${source}: ${count}`);
    });

    // 4. Check date range
    console.log('\n📅 Event Date Range (all events):');
    const { data: dateRange } = await supabase
      .from('events')
      .select('start_time')
      .order('start_time', { ascending: true })
      .limit(1);

    const { data: dateRangeMax } = await supabase
      .from('events')
      .select('start_time')
      .order('start_time', { ascending: false })
      .limit(1);

    if (dateRange && dateRange.length > 0) {
      console.log(`  Earliest: ${dateRange[0]?.start_time}`);
    }
    if (dateRangeMax && dateRangeMax.length > 0) {
      console.log(`  Latest: ${dateRangeMax[0]?.start_time}`);
    }

    // 5. Check December 2024 events specifically
    console.log('\n🎄 December 2024 Events:');
    const { count: decemberCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', '2024-12-01T00:00:00Z')
      .lt('start_time', '2025-01-01T00:00:00Z');

    console.log(`  December 2024 events: ${decemberCount}`);

    // 6. Check December 2025 events
    console.log('\n🎄 December 2025 Events:');
    const { count: december25Count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', '2025-12-01T00:00:00Z')
      .lt('start_time', '2026-01-01T00:00:00Z');

    console.log(`  December 2025 events: ${december25Count}`);

    // 7. Check for future months
    console.log('\n🔮 Future Events (next 12 months from today):');
    const now = new Date();
    const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const { count: futureCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', now.toISOString())
      .lt('start_time', nextYear.toISOString());

    console.log(`  Future events (next 12 months): ${futureCount}`);

    // 8. Check for events with null/missing start_time
    console.log('\n⚠️ Events with missing start_time:');
    const { count: nullDateCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .is('start_time', null);

    console.log(`  Events with null start_time: ${nullDateCount}`);

    // 9. Sample some events
    console.log('\n📝 Sample of 5 random events:');
    const { data: sampleEvents } = await supabase
      .from('events')
      .select('id, title, start_time, status, ingestion_source_id')
      .limit(5);

    sampleEvents?.forEach(event => {
      console.log(`  ${event.title}`);
      console.log(`    ID: ${event.id}`);
      console.log(`    Start: ${event.start_time}`);
      console.log(`    Status: ${event.status}`);
      console.log(`    Source: ${event.ingestion_source_id || 'manual'}`);
    });

    console.log('\n✅ Diagnostic complete!');

  } catch (error) {
    console.error('❌ Error during diagnostic:', error);
    process.exit(1);
  }
}

diagnoseEvents();
