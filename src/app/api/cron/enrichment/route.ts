import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createServiceClient } from '@/utils/supabase/service';
import { LLMEnrichmentService } from '@/services/ingestion/LLMEnrichmentService';

export const runtime = 'nodejs';
export const maxDuration = 300;
const DEFAULT_CRON_BATCH_LIMIT = 25;

async function validateCron(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        throw new Error('CRON_SECRET not configured');
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
        return false;
    }
    return true;
}

async function handler(request: NextRequest) {
    const isAuthorized = await validateCron(request);
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json(
            { error: 'Service role credentials not configured' },
            { status: 500 }
        );
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);
    const service = new LLMEnrichmentService(supabase);

    const limitParam = request.nextUrl.searchParams.get('limit');
    const parsedLimit = limitParam === null ? NaN : Number(limitParam);
    const envLimit = Number(process.env.ENRICHMENT_CRON_BATCH_LIMIT);
    const fallbackLimit = Number.isFinite(envLimit) && envLimit > 0 ? envLimit : DEFAULT_CRON_BATCH_LIMIT;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : fallbackLimit;

    const result = await service.processBatch(limit);

    console.log('Enrichment cron completed', {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        limit,
    });

    return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        ...result,
    });
}

export async function GET(request: NextRequest) {
    try {
        return await handler(request);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Enrichment cron failed:', message);
        Sentry.captureException(error, { extra: { route: 'cron/enrichment' } });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    return GET(request);
}
