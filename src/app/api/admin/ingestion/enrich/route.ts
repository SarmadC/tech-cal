import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';
import { LLMEnrichmentService } from '@/services/ingestion/LLMEnrichmentService';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { eventIds, provider, model } = (await request.json()) as {
            eventIds?: string[];
            provider?: string;
            model?: string;
        };

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { error: 'Service role credentials not configured' },
                { status: 500 }
            );
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);
        const enrichmentService = new LLMEnrichmentService(serviceClient);

        // Allow provider/model override for forward-compatibility
        if (provider || model) {
            process.env.LLM_ENRICHMENT_PROVIDER = provider ?? process.env.LLM_ENRICHMENT_PROVIDER;
            process.env.LLM_ENRICHMENT_MODEL = model ?? process.env.LLM_ENRICHMENT_MODEL;
        }

        if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
            return NextResponse.json(
                { error: 'eventIds array is required' },
                { status: 400 }
            );
        }

        const results = [];
        for (const eventId of eventIds) {
            // eslint-disable-next-line no-await-in-loop
            const result = await enrichmentService.processEvent(eventId);
            results.push(result);
        }

        const succeeded = results.filter((r) => r.status === 'enriched').length;
        const failed = results.length - succeeded;

        return NextResponse.json({
            success: true,
            queued: succeeded,
            results,
            summary: { succeeded, failed },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Admin enrichment trigger failed:', message);
        Sentry.captureException(error, { extra: { route: 'admin/ingestion/enrich' } });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

