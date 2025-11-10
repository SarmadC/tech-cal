/**
 * Vercel Cron Endpoint for Event Ingestion
 * 
 * Protected by CRON_SECRET environment variable.
 * Scheduled via Vercel Cron Jobs.
 * 
 * To configure:
 * 1. Add CRON_SECRET to environment variables
 * 2. Add to vercel.json cron config or configure in Vercel dashboard:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/ingestion",
 *        "schedule": "0 * * * *"
 *      }]
 *    }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { IngestionOrchestrator } from '@/services/ingestion/IngestionOrchestrator';
import { NormalizationProcessor } from '@/services/ingestion/NormalizationProcessor';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution time

export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error('CRON_SECRET not configured');
            return NextResponse.json(
                { error: 'Cron secret not configured' },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get Supabase service-role client (bypasses RLS for cron jobs)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Supabase service role credentials not configured');
            return NextResponse.json(
                { error: 'Service role credentials not configured' },
                { status: 500 }
            );
        }
        
        const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

        // Run ingestion for all active sources
        const results = await IngestionOrchestrator.runAllActiveSources(supabase);

        // Process normalization for pending events
        const normalizationResult = await NormalizationProcessor.processPendingEvents(supabase, 100);

        // Calculate summary
        const summary = {
            totalSources: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            totalEventsFetched: results.reduce((sum, r) => sum + r.eventsFetched, 0),
            totalRecordsQueued: results.reduce((sum, r) => sum + r.recordsQueued, 0),
            totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
            normalization: {
                processed: normalizationResult.processed,
                succeeded: normalizationResult.succeeded,
                failed: normalizationResult.failed,
            },
            results,
        };

        return NextResponse.json({
            success: true,
            message: 'Ingestion completed',
            summary,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Cron ingestion error:', error);
        
        Sentry.captureException(error, {
            extra: { function: 'cron_ingestion' },
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

// Also support POST for manual triggers (with auth)
export async function POST(request: NextRequest) {
    return GET(request);
}

