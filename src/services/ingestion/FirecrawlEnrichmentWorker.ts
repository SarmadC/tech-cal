/**
 * Firecrawl Enrichment Worker
 * 
 * Background worker that processes pending Firecrawl enrichments
 * with concurrency control, rate limiting, backpressure, and graceful shutdown
 */

import { createServiceClient } from '@/utils/supabase/service';
import { FirecrawlEnrichmentService } from './FirecrawlEnrichmentService';
import { FIRECRAWL_CONFIG, getFirecrawlConfig } from '@/config/ingestionConstants';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as Sentry from '@sentry/nextjs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config();

const DEFAULT_BATCH_SIZE = FIRECRAWL_CONFIG.DEFAULT_BATCH_SIZE;
const DEFAULT_CONCURRENCY = parseInt(
    process.env.FIRECRAWL_CONCURRENCY || String(FIRECRAWL_CONFIG.DEFAULT_CONCURRENCY),
    10
);

// Graceful shutdown handling
let isShuttingDown = false;
let activeWorkers = 0;

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
        return;
    }
    
    isShuttingDown = true;
    console.log(`[FirecrawlEnrichmentWorker] Received ${signal}, initiating graceful shutdown...`);
    
    // Wait for active workers to complete (with timeout)
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (activeWorkers > 0 && Date.now() - startTime < maxWaitTime) {
        console.log(`[FirecrawlEnrichmentWorker] Waiting for ${activeWorkers} active workers to complete...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (activeWorkers > 0) {
        console.warn(`[FirecrawlEnrichmentWorker] ${activeWorkers} workers still active after timeout, forcing shutdown`);
    }
    
    console.log('[FirecrawlEnrichmentWorker] Shutdown complete');
    process.exit(0);
}

// Register signal handlers for graceful shutdown
if (typeof process !== 'undefined') {
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

/**
 * Process pending enrichments with concurrency control and backpressure
 */
export async function processPendingEnrichments(
    batchSize: number = DEFAULT_BATCH_SIZE,
    concurrency: number = DEFAULT_CONCURRENCY
): Promise<{ processed: number; succeeded: number; failed: number }> {
    // Check if shutting down
    if (isShuttingDown) {
        return { processed: 0, succeeded: 0, failed: 0 };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase credentials');
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Check if Firecrawl is enabled
    const config = getFirecrawlConfig();
    if (!config.enabled) {
        console.log('[FirecrawlEnrichmentWorker] Firecrawl enrichment is disabled');
        return { processed: 0, succeeded: 0, failed: 0 };
    }

    // Fetch pending enrichments (respect backpressure by checking active workers)
    const maxConcurrent = concurrency * 2; // Allow some buffer
    if (activeWorkers >= maxConcurrent) {
        console.log(`[FirecrawlEnrichmentWorker] Backpressure: ${activeWorkers} active workers, skipping batch`);
        return { processed: 0, succeeded: 0, failed: 0 };
    }

    const availableSlots = Math.max(1, maxConcurrent - activeWorkers);
    const effectiveBatchSize = Math.min(batchSize, availableSlots);

    const { data: events, error } = await supabase
        .from('events')
        .select('id')
        .eq('firecrawl_enrichment_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(effectiveBatchSize);

    if (error) {
        Sentry.captureException(error, {
            extra: { operation: 'processPendingEnrichments', function: 'fetch' },
        });
        throw new Error(`Failed to fetch pending enrichments: ${error.message}`);
    }

    if (!events || events.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 };
    }

    // Process with concurrency limit using batch processing
    const results: Array<PromiseSettledResult<{ success: boolean; error?: string }>> = [];
    
    // Process events in batches respecting concurrency limit
    for (let i = 0; i < events.length; i += concurrency) {
        if (isShuttingDown) {
            console.log('[FirecrawlEnrichmentWorker] Shutdown requested, stopping batch processing');
            break;
        }

        const batch = events.slice(i, i + concurrency);
        const batchPromises = batch.map(async (event) => {
            activeWorkers++;
            try {
                return await FirecrawlEnrichmentService.processEnrichment(event.id, supabase);
            } catch (error) {
                Sentry.captureException(error, {
                    extra: {
                        eventId: event.id,
                        operation: 'processEnrichment',
                    },
                });
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            } finally {
                activeWorkers--;
            }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
    }

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - succeeded;

    return {
        processed: results.length,
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

    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;

    while (!isShuttingDown) {
        try {
            const result = await processPendingEnrichments(batchSize, concurrency);
            
            if (result.processed > 0) {
                console.log(
                    `[FirecrawlEnrichmentWorker] Processed ${result.processed} enrichments: ` +
                    `${result.succeeded} succeeded, ${result.failed} failed`
                );
                consecutiveErrors = 0; // Reset error counter on success
            }

            // Wait before next batch (with exponential backoff on errors)
            const waitTime = consecutiveErrors > 0 
                ? Math.min(intervalMs * Math.pow(2, consecutiveErrors - 1), intervalMs * 10)
                : intervalMs;
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
        } catch (error) {
            consecutiveErrors++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[FirecrawlEnrichmentWorker] Error in worker loop (${consecutiveErrors}/${maxConsecutiveErrors}):`, errorMessage);
            
            Sentry.captureException(error, {
                extra: {
                    operation: 'runWorkerLoop',
                    consecutiveErrors,
                },
            });

            // If too many consecutive errors, wait longer before retrying
            if (consecutiveErrors >= maxConsecutiveErrors) {
                console.error('[FirecrawlEnrichmentWorker] Too many consecutive errors, waiting longer before retry');
                await new Promise(resolve => setTimeout(resolve, intervalMs * 10));
                consecutiveErrors = 0; // Reset after long wait
            } else {
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }
    }

    console.log('[FirecrawlEnrichmentWorker] Worker loop stopped');
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

