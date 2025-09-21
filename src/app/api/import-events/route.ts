// src/app/api/import-events/route.ts

import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { notFound } from "next/navigation";
import * as Sentry from '@sentry/nextjs';

import { createClient } from '@/utils/supabase/server';
import { EventImportService } from '@/services/eventImportService';
import { getImportConfig } from '@/config/importConfig';
import type { EventSource, ImportConfig } from '@/types/eventImport';

/**
 * Event Import API Endpoint
 * Follows existing API patterns: rate limiting, auth, error handling
 */

// ============================================
// RATE LIMITING (Same pattern as existing APIs)
// ============================================

const ratelimit = new Ratelimit({
  redis: kv,
  // Allow 10 import requests per hour per IP (imports are expensive)
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix: "ratelimit_kurecal_import",
});

// Get centralized configuration
const importConfig: ImportConfig = getImportConfig();

// ============================================
// API ENDPOINTS
// ============================================

export const dynamic = "force-dynamic";

/**
 * GET - Test import system and get status
 */
export async function GET(request: NextRequest) {
  // Only allow in development/staging
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.IMPORT_API_SECRET || '')) {
      notFound();
    }
  }

  try {
    const supabase = await createClient();
    
    // Test source connections
    const connectionTests = await EventImportService.testAllSources();
    
    // Get recent import stats
    const stats = await EventImportService.getImportStats(supabase, 7);
    
    return NextResponse.json({
      success: true,
      status: 'Event import system operational',
      sources: connectionTests,
      recentStats: stats,
      config: {
        enabledSources: Object.entries(importConfig.sources)
          .filter(([, config]) => config.enabled)
          .map(([source]) => source),
        qualityThresholds: importConfig.qualityThresholds
      }
    });

  } catch (error) {
    console.error('Import system test failed:', error);
    Sentry.captureException(error, {
      extra: { function: 'GET /api/import-events' }
    });

    return NextResponse.json({
      success: false,
      error: 'Import system test failed'
    }, { status: 500 });
  }
}

/**
 * POST - Trigger event import
 */
export async function POST(request: NextRequest) {
  // Only allow in development/staging, or with proper auth in production
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes(process.env.IMPORT_API_SECRET || '')) {
      notFound();
    }
  }

  try {
    // Apply rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { success: rateLimitSuccess } = await ratelimit.limit(ip);
    
    if (!rateLimitSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Too many import requests. Please try again in an hour.'
      }, { status: 429 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { sources, config: customConfig } = body;

    // Determine which sources to import from
    const sourcesToImport: EventSource[] = sources || 
      Object.entries(importConfig.sources)
        .filter(([, config]) => config.enabled)
        .map(([source]) => source as EventSource);

    if (sourcesToImport.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No sources enabled for import'
      }, { status: 400 });
    }

    // Use custom config if provided, otherwise use default
    const finalConfig = customConfig || importConfig;

    // Create Supabase client
    const supabase = await createClient();

    console.log(`Starting import from sources: ${sourcesToImport.join(', ')}`);

    // Run the import
    const result = await EventImportService.importFromMultipleSources(
      sourcesToImport,
      finalConfig,
      supabase
    );

    // Log results
    console.log('Import completed:', {
      success: result.success,
      totalImported: result.totalStats.totalImported,
      totalErrors: result.totalStats.totalErrors,
      processingTime: result.totalStats.processingTimeMs
    });

    // Return results
    return NextResponse.json({
      success: result.success,
      message: `Import completed. ${result.totalStats.totalImported} events imported.`,
      stats: result.totalStats,
      sourceResults: result.results.map(r => ({
        source: r.stats.source,
        success: r.success,
        imported: r.stats.imported,
        errors: r.stats.errors
      })),
      errors: result.errors.length > 0 ? result.errors : undefined
    });

  } catch (error) {
    console.error('Import API error:', error);
    Sentry.captureException(error, {
      extra: { function: 'POST /api/import-events' }
    });

    return NextResponse.json({
      success: false,
      error: 'Import failed due to internal error'
    }, { status: 500 });
  }
}

/**
 * PUT - Update import configuration
 */
export async function PUT(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  try {
    const body = await request.json();
    const { source, config } = body;

    if (!source || !config) {
      return NextResponse.json({
        success: false,
        error: 'Missing source or config'
      }, { status: 400 });
    }

    // Update config (in a real implementation, this would persist to database)
    if (importConfig.sources[source as EventSource]) {
      importConfig.sources[source as EventSource] = {
        ...importConfig.sources[source as EventSource],
        ...config
      };
    }

    return NextResponse.json({
      success: true,
      message: `Configuration updated for ${source}`,
      config: importConfig.sources[source as EventSource]
    });

  } catch (error) {
    console.error('Config update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update configuration'
    }, { status: 500 });
  }
}
