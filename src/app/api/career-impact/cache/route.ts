import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CacheInvalidationService } from '@/services/cacheInvalidationService';
import { CareerImpactCache } from '@/services/cache/careerImpactCache';

interface CacheStatsResponse {
  success: boolean;
  data?: {
    stats: {
      totalKeys: number;
      hitRate: number;
      memoryUsage?: string;
      cacheType: string;
    };
    health: {
      healthy: boolean;
      lastChecked: string;
    };
  };
  error?: string;
}

interface CacheInvalidateRequest {
  type: 'profile' | 'event' | 'all';
  id?: string; // eventId for event invalidation
}

/**
 * GET /api/career-impact/cache
 * Get cache statistics and health
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user (admin check could be added here)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cache statistics
    const stats = await CacheInvalidationService.getCacheStats();
    
    if (!stats) {
      return NextResponse.json(
        { success: false, error: 'Cache statistics unavailable' },
        { status: 503 }
      );
    }

    const response: CacheStatsResponse = {
      success: true,
      data: {
        stats: {
          totalKeys: ((stats as unknown as Record<string, unknown>).totalKeys as number) || stats.totalRequests || 0,
          hitRate: stats.hits / (stats.hits + stats.misses) || 0,
          memoryUsage: ((stats as unknown as Record<string, unknown>).memoryUsage as string) || undefined,
          cacheType: ((stats as unknown as Record<string, unknown>).cacheType as string) || 'unknown'
        },
        health: {
          healthy: true,
          lastChecked: new Date().toISOString()
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Cache stats API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/career-impact/cache
 * Invalidate cache entries
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    let body: CacheInvalidateRequest;
    try {
      body = await request.json();
    } catch (_error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { type, id } = body;

    if (!type || !['profile', 'event', 'all'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid invalidation type. Must be "profile", "event", or "all"' },
        { status: 400 }
      );
    }

    let invalidatedCount = 0;

    switch (type) {
      case 'profile':
        // Invalidate user's cache
        invalidatedCount = await CacheInvalidationService.invalidateUserCache(user.id);
        break;

      case 'event':
        if (!id) {
          return NextResponse.json(
            { success: false, error: 'Event ID required for event cache invalidation' },
            { status: 400 }
          );
        }
        invalidatedCount = await CareerImpactCache.invalidateEvent(id);
        break;

      case 'all':
        invalidatedCount = await CareerImpactCache.invalidateAll();
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        type,
        invalidatedCount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Cache invalidation API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
