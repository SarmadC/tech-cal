/**
 * Recommendation Monitoring API
 *
 * GET /api/monitoring/recommendations?days=7
 *
 * Returns comprehensive analytics for recommendation system monitoring.
 * Used for Phase 1 data collection and threshold tuning.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RecommendationMonitoringService } from '@/services/recommendationMonitoringService';
import { MONITORING_CONFIG } from '@/config/monitoringConstants';
import { isAdminUser } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || MONITORING_CONFIG.DEFAULT_DAYS.toString(), 10);
    const quick = searchParams.get('quick') === 'true';

    // Validate days parameter
    if (days < MONITORING_CONFIG.MIN_DAYS || days > MONITORING_CONFIG.MAX_DAYS) {
      return NextResponse.json(
        { error: `Days parameter must be between ${MONITORING_CONFIG.MIN_DAYS} and ${MONITORING_CONFIG.MAX_DAYS}` },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Require authenticated admin user for monitoring data
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const isAdmin = await isAdminUser(user.id, supabase as Parameters<typeof isAdminUser>[1]);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check if this is a development/internal request
    const isDev = process.env.NODE_ENV === 'development';
    const isInternalMonitoring = process.env.ENABLE_MONITORING_API === 'true';

    if (!isDev && !isInternalMonitoring) {
      return NextResponse.json(
        { error: 'Monitoring API is disabled in production' },
        { status: 403 }
      );
    }

    // Get monitoring data
    if (quick) {
      const metrics = await RecommendationMonitoringService.getQuickMetrics(supabase, days);

      if (!metrics) {
        return NextResponse.json({
          success: true,
          data: {
            message: 'No analytics data found for the specified period',
            days,
            quick: true
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          ...metrics,
          days,
          quick: true,
          generatedAt: new Date().toISOString()
        }
      });

    } else {
      const summary = await RecommendationMonitoringService.getMonitoringSummary(supabase, days);

      if (!summary) {
        return NextResponse.json({
          success: true,
          data: {
            message: 'No analytics data found for the specified period',
            days,
            quick: false
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          ...summary,
          generatedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('Error in monitoring API:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
