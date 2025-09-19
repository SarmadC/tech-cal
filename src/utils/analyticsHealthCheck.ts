// Comprehensive analytics system health check
import { createClient } from '@/utils/supabase/client';
import { EnhancedAnalyticsService } from '@/services/enhancedAnalyticsService';

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'failed';
  components: {
    database: { status: 'ok' | 'error'; message: string };
    analytics: { status: 'ok' | 'error'; message: string };
    buffers: { status: 'ok' | 'warning' | 'error'; message: string };
    functions: { status: 'ok' | 'error'; message: string };
  };
  recommendations: string[];
  timestamp: string;
}

export async function performHealthCheck(userId?: string): Promise<SystemHealthReport> {
  const supabase = createClient();
  const report: SystemHealthReport = {
    overall: 'healthy',
    components: {
      database: { status: 'ok', message: 'Database accessible' },
      analytics: { status: 'ok', message: 'Analytics service operational' },
      buffers: { status: 'ok', message: 'Buffer system healthy' },
      functions: { status: 'ok', message: 'Database functions working' }
    },
    recommendations: [],
    timestamp: new Date().toISOString()
  };

  // Test 1: Database connectivity
  try {
    const { data: _data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
    report.components.database = { status: 'ok', message: 'Database connection verified' };
  } catch (error) {
    report.components.database = { status: 'error', message: `Database error: ${error}` };
    report.overall = 'failed';
  }

  // Test 2: Analytics tables accessibility
  try {
    const { error: interactionError } = await supabase
      .from('user_interactions_simple')
      .select('id')
      .limit(1);
    
    const { error: batchError } = await supabase
      .from('recommendation_batches')
      .select('id')
      .limit(1);

    if (interactionError || batchError) {
      throw new Error(`Table access error: ${interactionError?.message || batchError?.message}`);
    }
    
    report.components.analytics = { status: 'ok', message: 'Analytics tables accessible' };
  } catch (error) {
    report.components.analytics = { status: 'error', message: `Analytics error: ${error}` };
    report.overall = 'failed';
  }

  // Test 3: Database functions
  try {
    const healthResult = await supabase.rpc('get_analytics_health');
    if (healthResult.error) throw healthResult.error;
    
    report.components.functions = { status: 'ok', message: 'Database functions operational' };
  } catch (error) {
    report.components.functions = { status: 'error', message: `Function error: ${error}` };
    report.overall = 'degraded';
  }

  // Test 4: Analytics service (if user provided)
  if (userId) {
    try {
      const consent = await EnhancedAnalyticsService.getAnalyticsConsent(userId, supabase);
      const patterns = await EnhancedAnalyticsService.getUserBehaviorPattern(userId, supabase);
      
      if (consent === null) {
        report.recommendations.push('User should be prompted for analytics consent');
      }
      
      if (!patterns) {
        report.recommendations.push('No behavior patterns yet - system will improve with usage');
      }
      
      report.components.analytics = { 
        status: 'ok', 
        message: `Analytics working (consent: ${consent}, patterns: ${patterns ? 'available' : 'none'})` 
      };
    } catch (error) {
      report.components.analytics = { status: 'error', message: `Analytics service error: ${error}` };
      report.overall = 'degraded';
    }
  }

  // Test 5: Buffer system health (check for memory issues)
  try {
    // This is a basic check - in a real system you'd monitor buffer sizes
    const memoryUsage = process.memoryUsage?.() || { heapUsed: 0, heapTotal: 0 };
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (heapUsagePercent > 90) {
      report.components.buffers = { status: 'error', message: 'High memory usage detected' };
      report.overall = 'degraded';
      report.recommendations.push('Consider restarting application - high memory usage');
    } else if (heapUsagePercent > 70) {
      report.components.buffers = { status: 'warning', message: 'Elevated memory usage' };
      if (report.overall === 'healthy') report.overall = 'degraded';
      report.recommendations.push('Monitor memory usage');
    } else {
      report.components.buffers = { status: 'ok', message: 'Memory usage normal' };
    }
  } catch (_error) {
    report.components.buffers = { status: 'warning', message: 'Unable to check memory usage' };
  }

  // Generate recommendations based on findings
  if (report.overall === 'healthy' && report.recommendations.length === 0) {
    report.recommendations.push('System is operating normally');
  }

  return report;
}

// Quick health check for development
export async function quickHealthCheck(): Promise<boolean> {
  try {
    const report = await performHealthCheck();
    console.log('🏥 Analytics Health Check:', report);
    return report.overall !== 'failed';
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}
