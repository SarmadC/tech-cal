/**
 * Admin Manual Ingestion Trigger
 * 
 * Admin-only endpoint to manually trigger ingestion for testing.
 * Runs IngestionOrchestrator and NormalizationProcessor on demand.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { validateSameOriginRequest } from '@/lib/requestSecurity';
import { IngestionOrchestrator } from '@/services/ingestion/IngestionOrchestrator';
import { NormalizationProcessor } from '@/services/ingestion/NormalizationProcessor';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution time

/**
 * POST - Manually trigger ingestion for a specific source or all active sources
 */
export async function POST(request: NextRequest) {
    try {
        const sameOriginError = validateSameOriginRequest(request);
        if (sameOriginError) {
            return NextResponse.json({ error: sameOriginError }, { status: 403 });
        }

        // Get service-role client (bypasses RLS)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Service role credentials not configured' },
                { status: 500 }
            );
        }

        // Check admin access using regular server client (to get user session)
        const { createClient } = await import('@/utils/supabase/server');
        const sessionClient = await createClient();
        const { data: { user } } = await sessionClient.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = await isAdminUser(user.id, sessionClient);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Now create service-role client for ingestion operations
        const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

        // Parse request body
        const body = await request.json().catch(() => ({}));
        const { sourceId, limit } = body;

        // Run ingestion
        // Manual triggers should always force fetch (bypass interval checks)
        let results;
        if (sourceId) {
            // Run for specific source
            const result = await IngestionOrchestrator.runSourceIngestion(sourceId, supabase);
            results = [result];
        } else {
            // Run for all active sources with forceFetch=true to bypass interval checks
            results = await IngestionOrchestrator.runAllActiveSources(supabase, true);
        }

        // Process normalization
        const normalizationLimit = limit || 100;
        const normalizationResult = await NormalizationProcessor.processPendingEvents(
            supabase,
            normalizationLimit
        );

        // Calculate summary
        const summary = {
            ingestion: {
                totalSources: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                totalEventsFetched: results.reduce((sum, r) => sum + r.eventsFetched, 0),
                totalRecordsQueued: results.reduce((sum, r) => sum + r.recordsQueued, 0),
                totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
            },
            normalization: {
                processed: normalizationResult.processed,
                succeeded: normalizationResult.succeeded,
                failed: normalizationResult.failed,
                errors: normalizationResult.errors,
            },
            results,
        };

        return NextResponse.json({
            success: true,
            message: 'Ingestion and normalization completed',
            summary,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Manual ingestion error:', error);

        Sentry.captureException(error, {
            extra: { function: 'manual_ingestion_trigger' },
        });

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
