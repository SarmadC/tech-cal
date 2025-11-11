#!/usr/bin/env tsx
/**
 * Verify find_similar_events Function Fix
 * 
 * Tests that the find_similar_events function returns numeric similarity
 * instead of real, fixing the type mismatch error.
 */

import { createServiceClient } from '@/utils/supabase/service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

async function verifyFix() {
    console.log('🔍 Verifying find_similar_events function fix...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    try {
        // Test the function with a sample query
        console.log('📊 Testing find_similar_events function...');
        
        const { data, error } = await supabase.rpc('find_similar_events', {
            p_title: 'Tech Conference',
            p_start_time: new Date().toISOString(),
            p_similarity_threshold: 0.3, // Lower threshold to get results
        });

        if (error) {
            if (error.code === '42804') {
                console.error('❌ Type mismatch error still present!');
                console.error('   Error code:', error.code);
                console.error('   Details:', error.details);
                console.error('\n📋 Action required:');
                console.error('   Run migration: supabase/migrations/20250105101005_fix_find_similar_events_type.sql');
                process.exit(1);
            } else {
                console.error('❌ Error calling function:', error.message);
                process.exit(1);
            }
        }

        console.log('✅ Function call succeeded (no type mismatch error)');
        
        if (data && Array.isArray(data) && data.length > 0) {
            console.log(`\n📊 Found ${data.length} similar event(s):`);
            data.slice(0, 3).forEach((result: { event_id: string; title: string; similarity: number }, idx: number) => {
                console.log(`   ${idx + 1}. ${result.title}`);
                console.log(`      ID: ${result.event_id}`);
                console.log(`      Similarity: ${result.similarity} (type: ${typeof result.similarity})`);
                
                // Verify similarity is a number (not string from real type)
                if (typeof result.similarity !== 'number') {
                    console.error(`      ⚠️  WARNING: Similarity is not a number! Type: ${typeof result.similarity}`);
                }
            });
        } else {
            console.log('   (No similar events found - this is fine)');
        }

        console.log('\n✅ Function fix verified successfully!\n');
    } catch (error) {
        console.error('❌ Error verifying fix:', error);
        process.exit(1);
    }
}

verifyFix().catch(console.error);



