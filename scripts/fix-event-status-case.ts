/**
 * Fix status case inconsistency - normalize all to lowercase 'confirmed'
 * Run with: npx tsx scripts/fix-event-status-case.ts
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function fixStatusCase() {
  console.log('🔧 Starting status case normalization...\n');

  try {
    // Check current status distribution
    console.log('📊 Current status values in database:');
    const { data: statusCheck } = await supabase
      .from('events')
      .select('status, id');

    const statusMap = new Map<string, number>();
    statusCheck?.forEach(event => {
      const status = event.status || 'null';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    statusMap.forEach((count, status) => {
      console.log(`  ${status}: ${count}`);
    });

    // Update all "Confirmed" (uppercase) to "confirmed" (lowercase)
    const { count: updatedCount, error: updateError } = await supabase
      .from('events')
      .update({ status: 'confirmed' })
      .eq('status', 'Confirmed');

    if (updateError) {
      throw updateError;
    }

    console.log(`\n✅ Updated ${updatedCount} events from "Confirmed" to "confirmed"`);

    // Verify the fix
    console.log('\n📊 Status values after normalization:');
    const { data: statusCheckAfter } = await supabase
      .from('events')
      .select('status, id');

    const statusMapAfter = new Map<string, number>();
    statusCheckAfter?.forEach(event => {
      const status = event.status || 'null';
      statusMapAfter.set(status, (statusMapAfter.get(status) || 0) + 1);
    });

    statusMapAfter.forEach((count, status) => {
      console.log(`  ${status}: ${count}`);
    });

    // Verify we still have all 82 events
    const { count: totalCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    console.log(`\n✅ Total events in database: ${totalCount}`);
    console.log('✅ Status normalization complete!');

  } catch (error) {
    console.error('❌ Error during status normalization:', error);
    process.exit(1);
  }
}

fixStatusCase();
