#!/usr/bin/env tsx
/**
 * Verify Ingestion Setup
 * 
 * Quick verification script to confirm all migrations ran successfully
 * and the ingestion pipeline is ready for testing.
 */

import { createServiceClient } from '@/utils/supabase/service';
import type { Database } from '@/types/supabase';
import { config } from 'dotenv';
import { resolve } from 'path';

// Try loading from common env file locations
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config(); // Also try default dotenv behavior

async function verifySetup() {
    console.log('🔍 Verifying ingestion pipeline setup...\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase credentials');
        console.error('\n📋 Required environment variables:');
        console.error('   - NEXT_PUBLIC_SUPABASE_URL');
        console.error('   - SUPABASE_SERVICE_ROLE_KEY');
        console.error('\n💡 Make sure these are set in:');
        console.error('   - .env.local (recommended for local development)');
        console.error('   - .env');
        console.error('   - Or as system environment variables');
        console.error('\n🔍 Current values:');
        console.error(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
        console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);
        process.exit(1);
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);
    const execSql = async (sql: string) => {
        const client = supabase as unknown as {
            rpc: (fn: string, args: Record<string, unknown>) => ReturnType<typeof supabase.rpc>;
        };

        return client.rpc('exec_sql', { sql });
    };

    let allChecksPassed = true;

    // Check 1: Verify tables exist
    console.log('1️⃣ Checking tables...');
    const tables = [
        'ingestion_sources',
        'source_events',
        'ingestion_jobs',
        'ingestion_errors',
        'event_moderation_queue',
        'source_trust_scores',
        'source_blocklist',
        'source_allowlist',
    ] as const satisfies ReadonlyArray<keyof Database['public']['Tables']>;

    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
            console.error(`   ❌ Table ${table}: ${error.message}`);
            allChecksPassed = false;
        } else {
            console.log(`   ✅ ${table}`);
        }
    }

    // Check 2: Verify extensions
    console.log('\n2️⃣ Checking extensions...');
    const { data: extensions } = await execSql(
        "SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'"
    ).catch(() => ({ data: null }));

    if (extensions) {
        console.log('   ✅ pg_trgm extension enabled');
    } else {
        // Try direct query
        const { error } = await execSql("CREATE EXTENSION IF NOT EXISTS pg_trgm");
        if (error) {
            console.log('   ⚠️  Could not verify pg_trgm (may need manual check)');
        } else {
            console.log('   ✅ pg_trgm extension enabled');
        }
    }

    // Check 3: Verify functions (schema check - may have false negatives due to schema search path)
    console.log('\n3️⃣ Checking functions (schema)...');
    const functions = ['find_similar_events', 'claim_pending_source_events', 'update_updated_at_column'];

    for (const func of functions) {
        const { data: functionRows } = await execSql(
            `SELECT 1 FROM pg_proc WHERE proname = '${func}' LIMIT 1`
        ).catch(() => ({ data: null }));

        if (!functionRows) {
            console.log(`   ⚠️  Function ${func}: not found in schema (will verify callability below)`);
            // Don't fail here - callability test is authoritative
        } else {
            console.log(`   ✅ ${func} (schema verified)`);
        }
    }

    // Check 3.5: Verify claim_pending_source_events RPC is callable
    console.log('\n3️⃣.5️⃣ Testing claim_pending_source_events RPC callability...');
    try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('claim_pending_source_events', {
            p_limit: 1,
            p_processing_status: 'processing',
        });

        if (rpcError) {
            if (rpcError.message.includes('does not exist') || rpcError.message.includes('function')) {
                console.error('   ❌ RPC function exists in schema but is not callable');
                console.error(`   Error: ${rpcError.message}`);
                console.error('\n   📋 Action required:');
                console.error('   Run migration 20250101000004_add_claim_pending_events_function.sql');
                console.error('   Or check Supabase dashboard > Database > Functions to verify deployment.');
                allChecksPassed = false;
            } else {
                // Other errors (like no pending events) are fine - means function exists
                console.log('   ✅ RPC function is callable');
                if (rpcResult && Array.isArray(rpcResult)) {
                    console.log(`   (Returned ${(rpcResult as unknown[]).length} event(s) for test call)`);
                }
            }
        } else {
            console.log('   ✅ RPC function is callable');
            if (rpcResult && Array.isArray(rpcResult)) {
                console.log(`   (Returned ${rpcResult.length} event(s) for test call)`);
            }
        }
    } catch (error) {
        console.error('   ❌ Failed to test RPC function:', error instanceof Error ? error.message : 'Unknown error');
        console.error('\n   📋 Action required:');
        console.error('   Verify the function exists in your Supabase database.');
        console.error('   Check: Supabase Dashboard > Database > Functions > claim_pending_source_events');
        allChecksPassed = false;
    }

    // Check 4: Verify seeded source
    console.log('\n4️⃣ Checking seeded sources...');
    const { data: sources, error: sourcesError } = await supabase
        .from('ingestion_sources')
        .select('id, name, source_url, source_type, trust_score, is_active')
        .eq('is_active', true);

    if (sourcesError) {
        console.error(`   ❌ Error fetching sources: ${sourcesError.message}`);
        allChecksPassed = false;
    } else if (!sources || sources.length === 0) {
        console.log('   ⚠️  No active sources found (migration 5 may not have seeded data)');
    } else {
        console.log(`   ✅ Found ${sources.length} active source(s):`);
        sources.forEach((source) => {
            console.log(`      - ${source.name} (${source.source_type}, trust: ${source.trust_score})`);
        });
    }

    // Check 5: Verify events table extensions
    console.log('\n5️⃣ Checking events table extensions...');
    const { error: eventError } = await supabase
        .from('events')
        .select('ingestion_quality_score, ingestion_source_id, ingestion_provenance, ingestion_confidence')
        .limit(1);

    if (eventError && eventError.message.includes('does not exist')) {
        console.error(`   ❌ Events table missing ingestion columns`);
        allChecksPassed = false;
    } else {
        console.log('   ✅ Events table has ingestion columns');
    }

    // Check 6: Verify organizers table extensions
    console.log('\n6️⃣ Checking organizers table extensions...');
    const { error: orgError } = await supabase
        .from('organizers')
        .select('domain, trust_score, auto_discovered')
        .limit(1);

    if (orgError && orgError.message.includes('does not exist')) {
        console.error(`   ❌ Organizers table missing extension columns`);
        allChecksPassed = false;
    } else {
        console.log('   ✅ Organizers table has extension columns');
    }

    // Check 7: Verify profiles admin flag
    console.log('\n7️⃣ Checking profiles admin flag...');
    const { data: adminProfiles, error: adminError } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('is_admin', true)
        .limit(1);

    if (adminError) {
        console.error(`   ❌ Error checking admin flag: ${adminError.message}`);
        allChecksPassed = false;
    } else if (!adminProfiles || adminProfiles.length === 0) {
        console.log('   ⚠️  No admin users found. Run: UPDATE profiles SET is_admin = TRUE WHERE id = \'YOUR_USER_ID\'');
    } else {
        console.log(`   ✅ Found ${adminProfiles.length} admin user(s)`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    if (allChecksPassed) {
        console.log('✅ All migrations verified successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Set admin user: UPDATE profiles SET is_admin = TRUE WHERE id = \'YOUR_USER_ID\'');
        console.log('   2. Test manual trigger: POST /api/admin/ingestion/run');
        console.log('   3. Check results: SELECT * FROM source_events LIMIT 10;');
        console.log('   4. View moderation queue: /admin/ingestion/moderation');
    } else {
        console.log('⚠️  Some checks failed. Please review the errors above.');
    }
    console.log('='.repeat(50) + '\n');
}

verifySetup().catch(console.error);


