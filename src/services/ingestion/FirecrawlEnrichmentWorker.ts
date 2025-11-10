/**
 * Firecrawl Enrichment Worker
 * 
 * Background worker that processes pending Firecrawl enrichments
 * with concurrency control and rate limiting
 */

import { createServiceClient } from '@/utils/supabase/service';
import { FirecrawlEnrichmentService } from './FirecrawlEnrichmentService';
import { FIRECRAWL_CONFIG } from '@/config/ingestionConstants';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

const DEFAULT_BATCH_SIZE = FIRECRAWL_CONFIG.DEFAULT_BATCH_SIZE;
const DEFAULT_CONCURRENCY = parseInt(
    process.env.FIRECRAWL_CONCURRENCY || String(FIRECRAWL_CONFIG.DEFAULT_CONCURRENCY),
    10
);

/**
 * Process pending enrichments with concurrency control
 */
export async function processPendingEnrichments(
    batchSize: number = DEFAULT_BATCH_SIZE,
    concurrency: number = DEFAULT_CONCURRENCY
): Promise<{ processed: number; succeeded: number; failed: number }> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase credentials');
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending enrichments
    const { data: events, error } = await supabase
        .from('events')
        .select('id')
        .eq('firecrawl_enrichment_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(batchSize);

    if (error) {
        throw new Error(`Failed to fetch pending enrichments: ${error.message}`);
    }

    if (!events || events.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
    }

    // Process with concurrency limit using batch processing
    const results: Array<PromiseSettledResult<{ success: boolean; error?: string }>> = [];
    
    // Process events in batches respecting concurrency limit
    for (let i = 0; i < events.length; i += concurrency) {
        const batch = events.slice(i, i + concurrency);
        const batchResults = await Promise.allSettled(
            batch.map(event => FirecrawlEnrichmentService.processEnrichment(event.id, supabase))
        );
        results.push(...batchResults);
    }

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - succeeded;

    return {
        processed: events.length,
        succeeded,
        failed,
    };
}

/**
 * Run worker continuously (for long-running processes)
 */
export async function runWorkerLoop(
    intervalMs: number = FIRECRAWL_CONFIG.DEFAULT_WORKER_INTERVAL_MS,
    batchSize: number = DEFAULT_BATCH_SIZE,
    concurrency: number = DEFAULT_CONCURRENCY
): Promise<void> {
    console.log('[FirecrawlEnrichmentWorker] Starting worker loop...');
    console.log(`[FirecrawlEnrichmentWorker] Config: batchSize=${batchSize}, concurrency=${concurrency}, interval=${intervalMs}ms`);

    while (true) {
        try {
            const result = await processPendingEnrichments(batchSize, concurrency);
            
            if (result.processed > 0) {
                console.log(
                    `[FirecrawlEnrichmentWorker] Processed ${result.processed} enrichments: ` +
                    `${result.succeeded} succeeded, ${result.failed} failed`
                );
            }

            // Wait before next batch
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        } catch (error) {
            console.error('[FirecrawlEnrichmentWorker] Error in worker loop:', error);
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }
}

// CLI entry point
if (require.main === module) {
    const batchSize = parseInt(
        process.env.FIRECRAWL_BATCH_SIZE || String(FIRECRAWL_CONFIG.DEFAULT_BATCH_SIZE),
        10
    );
    const concurrency = parseInt(
        process.env.FIRECRAWL_CONCURRENCY || String(FIRECRAWL_CONFIG.DEFAULT_CONCURRENCY),
        10
    );
    const interval = parseInt(
        process.env.FIRECRAWL_WORKER_INTERVAL_MS || String(FIRECRAWL_CONFIG.DEFAULT_WORKER_INTERVAL_MS),
        10
    );

    // Run single batch or continuous loop
    const runOnce = process.argv.includes('--once');

    if (runOnce) {
        processPendingEnrichments(batchSize, concurrency)
            .then(result => {
                console.log('Result:', result);
                process.exit(0);
            })
            .catch(error => {
                console.error('Error:', error);
                process.exit(1);
            });
    } else {
        runWorkerLoop(interval, batchSize, concurrency).catch(error => {
            console.error('Fatal error in worker loop:', error);
            process.exit(1);
        });
    }
}

