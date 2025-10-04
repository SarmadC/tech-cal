/**
 * Recommendation Monitoring Service
 *
 * Provides utilities for Phase 1 data collection:
 * - Click/save patterns by score ranges
 * - Scoring triggers correlation analysis
 * - Real-time metrics for threshold tuning
 */

import type { SupabaseClientType } from '@/types';
import { handleServiceError } from '@/utils/commonUtils';
import { MONITORING_CONFIG } from '@/config/monitoringConstants';

// =============================================
// TYPES
// =============================================

interface AnalyticsRow {
  user_id: string;
  event_id: string;
  metric_type: 'click' | 'save';
  algorithm_version: string;
  measured_at: string;
}

interface ScoreRow {
  event_id: string;
  overall_score: number;
  confidence: number;
  scoring_triggers: string[];
  algorithm_version: string;
}

export interface ScoreRangeMetrics {
  range: string;
  minScore: number;
  maxScore: number;
  totalEvents: number;
  totalClicks: number;
  totalSaves: number;
  clickThroughRate: number;
  saveRate: number;
  avgScore: number;
  avgConfidence: number;
}

export interface TriggerAnalysis {
  trigger: string;
  eventCount: number;
  totalClicks: number;
  totalSaves: number;
  avgScore: number;
  clickThroughRate: number;
  scoreRangeDistribution: Record<string, number>;
}

export interface OutlierEvent {
  eventId: string;
  score: number;
  confidence: number;
  clicks: number;
  saves: number;
  triggers: string[];
  algorithmVersion: string;
  isOutlier: 'high_performance' | 'low_performance';
  reason: string;
}

export interface MonitoringSummary {
  dateRange: { from: string; to: string };
  totalEvents: number;
  totalInteractions: number;
  overallCTR: number;
  scoreRanges: ScoreRangeMetrics[];
  topTriggers: TriggerAnalysis[];
  outliers: OutlierEvent[];
  recommendations: string[];
  // Phase 3: Behavioral boost analytics
  behavioralBoostStats?: {
    totalBoosts: number;
    avgBoostAmount: number;
    abGroupCTR: Record<string, number>;
    ctrDelta: number; // % change vs control group
  };
}

export interface QuickMetrics {
  totalEvents: number;
  totalClicks: number;
  ctr: number;
  avgScore: number;
  topTriggers: string[];
}

// =============================================
// MONITORING SERVICE
// =============================================

export class RecommendationMonitoringService {
  /**
   * Validate days parameter
   */
  private static validateDays(days: number): void {
    if (!Number.isInteger(days) || days < MONITORING_CONFIG.MIN_DAYS || days > MONITORING_CONFIG.MAX_DAYS) {
      throw new Error(`Days must be an integer between ${MONITORING_CONFIG.MIN_DAYS} and ${MONITORING_CONFIG.MAX_DAYS}`);
    }
  }

  /**
   * Get analytics data for date range with batch processing
   */
  private static async getAnalyticsData(
    supabaseClient: SupabaseClientType,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsRow[]> {
    const { data, error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from('career_impact_analytics')
      .select('user_id, event_id, metric_type, algorithm_version, measured_at')
      .gte('measured_at', startDate.toISOString())
      .lte('measured_at', endDate.toISOString())
      .order('measured_at', { ascending: false })
      .limit(MONITORING_CONFIG.MAX_ANALYTICS_BATCH_SIZE);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get event scores with metadata in batches
   */
  private static async getEventScores(
    supabaseClient: SupabaseClientType,
    eventIds: string[]
  ): Promise<ScoreRow[]> {
    if (eventIds.length === 0) return [];

    // Process in batches to avoid query size limits
    const batchSize = MONITORING_CONFIG.MAX_EVENT_BATCH_SIZE;
    const allScores: ScoreRow[] = [];

    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);

      const { data, error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('user_event_scores')
        .select('event_id, overall_score, confidence, metadata, algorithm_version')
        .in('event_id', batch)
        .not('overall_score', 'is', null);

      if (error) throw error;

      const batchScores = (data || []).map((row: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        event_id: row.event_id,
        overall_score: row.overall_score,
        confidence: row.confidence,
        scoring_triggers: row.metadata?.scoringTriggers || [],
        algorithm_version: row.algorithm_version
      }));

      allScores.push(...batchScores);
    }

    return allScores;
  }

  /**
   * Analyze metrics by score ranges
   */
  private static analyzeScoreRanges(analytics: AnalyticsRow[], scores: ScoreRow[]): ScoreRangeMetrics[] {
    const scoreMap = new Map(scores.map(s => [s.event_id, s]));

    return MONITORING_CONFIG.SCORE_RANGES.map(range => {
      const eventsInRange = scores.filter(s =>
        s.overall_score >= range.min && s.overall_score < range.max
      );

      const analyticsInRange = analytics.filter(a => {
        const score = scoreMap.get(a.event_id);
        return score && score.overall_score >= range.min && score.overall_score < range.max;
      });

      const clicks = analyticsInRange.filter(a => a.metric_type === 'click').length;
      const saves = analyticsInRange.filter(a => a.metric_type === 'save').length;
      const totalEvents = eventsInRange.length;

      return {
        range: range.label,
        minScore: range.min,
        maxScore: range.max,
        totalEvents,
        totalClicks: clicks,
        totalSaves: saves,
        clickThroughRate: totalEvents > 0 ? clicks / totalEvents : 0,
        saveRate: totalEvents > 0 ? saves / totalEvents : 0,
        avgScore: eventsInRange.length > 0
          ? eventsInRange.reduce((sum, e) => sum + e.overall_score, 0) / eventsInRange.length
          : 0,
        avgConfidence: eventsInRange.length > 0
          ? eventsInRange.reduce((sum, e) => sum + e.confidence, 0) / eventsInRange.length
          : 0
      };
    });
  }

  /**
   * Analyze trigger performance
   */
  private static analyzeTriggers(analytics: AnalyticsRow[], scores: ScoreRow[]): TriggerAnalysis[] {
    const triggerStats = new Map<string, {
      events: Set<string>;
      clicks: number;
      saves: number;
      totalScore: number;
      scoreRanges: Record<string, number>;
    }>();

    scores.forEach(score => {
      const eventAnalytics = analytics.filter(a => a.event_id === score.event_id);
      const clicks = eventAnalytics.filter(a => a.metric_type === 'click').length;
      const saves = eventAnalytics.filter(a => a.metric_type === 'save').length;

      const scoreRange = MONITORING_CONFIG.SCORE_RANGES.find(r =>
        score.overall_score >= r.min && score.overall_score < r.max
      )?.label || 'unknown';

      score.scoring_triggers.forEach(trigger => {
        if (!triggerStats.has(trigger)) {
          triggerStats.set(trigger, {
            events: new Set(),
            clicks: 0,
            saves: 0,
            totalScore: 0,
            scoreRanges: {}
          });
        }

        const stats = triggerStats.get(trigger)!;
        stats.events.add(score.event_id);
        stats.clicks += clicks;
        stats.saves += saves;
        stats.totalScore += score.overall_score;
        stats.scoreRanges[scoreRange] = (stats.scoreRanges[scoreRange] || 0) + 1;
      });
    });

    return Array.from(triggerStats.entries())
      .map(([trigger, stats]) => ({
        trigger,
        eventCount: stats.events.size,
        totalClicks: stats.clicks,
        totalSaves: stats.saves,
        avgScore: stats.events.size > 0 ? stats.totalScore / stats.events.size : 0,
        clickThroughRate: stats.events.size > 0 ? stats.clicks / stats.events.size : 0,
        scoreRangeDistribution: stats.scoreRanges
      }))
      .sort((a, b) => b.eventCount - a.eventCount);
  }

  /**
   * Find outlier events (high engagement with low scores, or vice versa)
   */
  private static findOutliers(analytics: AnalyticsRow[], scores: ScoreRow[]): OutlierEvent[] {
    const eventStats = new Map<string, {
      score: number;
      confidence: number;
      clicks: number;
      saves: number;
      triggers: string[];
      algorithmVersion: string;
    }>();

    // Aggregate stats per event
    scores.forEach(score => {
      const eventAnalytics = analytics.filter(a => a.event_id === score.event_id);
      const clicks = eventAnalytics.filter(a => a.metric_type === 'click').length;
      const saves = eventAnalytics.filter(a => a.metric_type === 'save').length;

      eventStats.set(score.event_id, {
        score: score.overall_score,
        confidence: score.confidence,
        clicks,
        saves,
        triggers: score.scoring_triggers,
        algorithmVersion: score.algorithm_version
      });
    });

    const outliers: OutlierEvent[] = [];

    eventStats.forEach((stats, eventId) => {
      // High performance outliers: High engagement but low score
      if (stats.clicks > MONITORING_CONFIG.HIGH_PERFORMANCE_MIN_CLICKS &&
          stats.score < MONITORING_CONFIG.HIGH_PERFORMANCE_MAX_SCORE) {
        outliers.push({
          eventId,
          score: stats.score,
          confidence: stats.confidence,
          clicks: stats.clicks,
          saves: stats.saves,
          triggers: stats.triggers,
          algorithmVersion: stats.algorithmVersion,
          isOutlier: 'high_performance',
          reason: `High engagement (${stats.clicks} clicks) despite low score (${stats.score})`
        });
      }

      // Low performance outliers: High score but no engagement
      if (stats.score > MONITORING_CONFIG.LOW_PERFORMANCE_MIN_SCORE &&
          stats.clicks <= MONITORING_CONFIG.LOW_PERFORMANCE_MAX_CLICKS) {
        outliers.push({
          eventId,
          score: stats.score,
          confidence: stats.confidence,
          clicks: stats.clicks,
          saves: stats.saves,
          triggers: stats.triggers,
          algorithmVersion: stats.algorithmVersion,
          isOutlier: 'low_performance',
          reason: `High score (${stats.score}) but no engagement (0 clicks)`
        });
      }
    });

    return outliers.sort((a, b) => {
      if (a.isOutlier === 'high_performance' && b.isOutlier === 'low_performance') return -1;
      if (a.isOutlier === 'low_performance' && b.isOutlier === 'high_performance') return 1;
      return b.clicks - a.clicks;
    });
  }

  /**
   * Calculate overall CTR
   */
  private static calculateOverallCTR(analytics: AnalyticsRow[], _scores: ScoreRow[]): number {
    const uniqueEvents = new Set(analytics.map(a => a.event_id));
    const clicks = analytics.filter(a => a.metric_type === 'click').length;
    return uniqueEvents.size > 0 ? clicks / uniqueEvents.size : 0;
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    scoreRanges: ScoreRangeMetrics[],
    triggers: TriggerAnalysis[],
    outliers: OutlierEvent[]
  ): string[] {
    const recommendations: string[] = [];

    // Score range analysis
    const highScoreRange = scoreRanges.find(r => r.range === '75-100');
    const midScoreRange = scoreRanges.find(r => r.range === '50-75');

    if (highScoreRange && highScoreRange.clickThroughRate < MONITORING_CONFIG.LOW_CTR_THRESHOLD) {
      recommendations.push(
        'High-scoring events (75-100) have low CTR. Consider lowering thresholds or reducing boost caps.'
      );
    }

    if (midScoreRange && highScoreRange && midScoreRange.clickThroughRate > highScoreRange.clickThroughRate) {
      recommendations.push(
        'Mid-range scores outperforming high scores. Review algorithm weights and gating logic.'
      );
    }

    // Trigger analysis
    const bestTrigger = triggers.find(t => t.clickThroughRate > MONITORING_CONFIG.GOOD_CTR_THRESHOLD);
    if (bestTrigger) {
      recommendations.push(
        `"${bestTrigger.trigger}" trigger shows strong performance (CTR: ${bestTrigger.clickThroughRate.toFixed(2)}). Consider expanding its application.`
      );
    }

    const poorTrigger = triggers.find(t =>
      t.eventCount > MONITORING_CONFIG.MIN_EVENTS_FOR_TRIGGER_ANALYSIS &&
      t.clickThroughRate < (MONITORING_CONFIG.LOW_CTR_THRESHOLD / 2)
    );
    if (poorTrigger) {
      recommendations.push(
        `"${poorTrigger.trigger}" trigger shows poor performance despite ${poorTrigger.eventCount} events. Consider removing or refining.`
      );
    }

    // Outlier analysis
    const highPerformanceOutliers = outliers.filter(o => o.isOutlier === 'high_performance');
    if (highPerformanceOutliers.length > 5) {
      recommendations.push(
        `${highPerformanceOutliers.length} events show high engagement despite low scores. Investigate common triggers for score boost.`
      );
    }

    const lowPerformanceOutliers = outliers.filter(o => o.isOutlier === 'low_performance');
    if (lowPerformanceOutliers.length > 10) {
      recommendations.push(
        `${lowPerformanceOutliers.length} high-scoring events have no engagement. Consider stricter gating or score penalties.`
      );
    }

    return recommendations.length > 0 ? recommendations : ['Data looks healthy. Continue monitoring for trends.'];
  }

  /**
   * Get A/B test analysis for behavioral boosts (Phase 3)
   */
  static async getBehavioralBoostAnalysis(
    supabaseClient: SupabaseClientType,
    days: number = 7
  ): Promise<{
    abGroupCTR: Record<string, number>;
    ctrDelta: number;
    totalBoosts: number;
    avgBoostAmount: number;
  } | null> {
    try {
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

      // Get behavioral boost data
      const { data: boosts, error: boostError } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('behavioral_boosts')
        .select('user_id, boost_amount, ab_group, applied_at')
        .gte('applied_at', startDate.toISOString());

      if (boostError) throw boostError;
      if (!boosts || boosts.length === 0) return null;

      // Get click data for same period
      const { data: analytics, error: analyticsError } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .from('career_impact_analytics')
        .select('user_id, metric_type, measured_at')
        .eq('metric_type', 'click')
        .gte('measured_at', startDate.toISOString());

      if (analyticsError) throw analyticsError;

      // Calculate CTR by AB group
      const abGroupStats = new Map<string, { users: Set<string>; clicks: number }>();

      // Initialize groups
      ['CONTROL', 'LOW', 'MEDIUM', 'HIGH'].forEach(group => {
        abGroupStats.set(group, { users: new Set(), clicks: 0 });
      });

      // Count boosts by group
      boosts.forEach((boost: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const stats = abGroupStats.get(boost.ab_group);
        if (stats) {
          stats.users.add(boost.user_id);
        }
      });

      // Count clicks by group (need to map user to AB group)
      const userABGroups = new Map<string, string>();
      boosts.forEach((boost: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        userABGroups.set(boost.user_id, boost.ab_group);
      });

      analytics?.forEach((click: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const abGroup = userABGroups.get(click.user_id);
        if (abGroup) {
          const stats = abGroupStats.get(abGroup);
          if (stats) {
            stats.clicks++;
          }
        }
      });

      // Calculate CTR for each group
      const abGroupCTR: Record<string, number> = {};
      abGroupStats.forEach((stats, group) => {
        abGroupCTR[group] = stats.users.size > 0 ? stats.clicks / stats.users.size : 0;
      });

      // Calculate delta vs control
      const controlCTR = abGroupCTR['CONTROL'] || 0;
      const testGroupsCTR = ['LOW', 'MEDIUM', 'HIGH']
        .map(group => abGroupCTR[group] || 0)
        .reduce((sum, ctr) => sum + ctr, 0) / 3;

      const ctrDelta = controlCTR > 0 ? ((testGroupsCTR - controlCTR) / controlCTR) * 100 : 0;

      return {
        abGroupCTR,
        ctrDelta,
        totalBoosts: boosts.length,
        avgBoostAmount: boosts.reduce((sum: number, b: any) => sum + b.boost_amount, 0) / boosts.length // eslint-disable-line @typescript-eslint/no-explicit-any
      };

    } catch (error) {
      console.error('Error getting behavioral boost analysis:', error);
      return null;
    }
  }

  /**
   * Get comprehensive monitoring data for a date range
   */
  static async getMonitoringSummary(
    supabaseClient: SupabaseClientType,
    days: number = MONITORING_CONFIG.DEFAULT_DAYS
  ): Promise<MonitoringSummary | null> {
    try {
      this.validateDays(days);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Get analytics data
      const analytics = await this.getAnalyticsData(supabaseClient, startDate, endDate);
      if (!analytics || analytics.length === 0) {
        return null;
      }

      // Get event scores
      const eventIds = [...new Set(analytics.map(a => a.event_id))];
      const scores = await this.getEventScores(supabaseClient, eventIds);

      // Analyze score ranges
      const scoreRanges = this.analyzeScoreRanges(analytics, scores);

      // Analyze triggers
      const topTriggers = this.analyzeTriggers(analytics, scores);

      // Find outliers
      const outliers = this.findOutliers(analytics, scores);

      // Generate recommendations
      const recommendations = this.generateRecommendations(scoreRanges, topTriggers, outliers);

      // Get behavioral boost stats (Phase 3)
      const behavioralBoostStats = await this.getBehavioralBoostAnalysis(supabaseClient, days);

      return {
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        },
        totalEvents: eventIds.length,
        totalInteractions: analytics.length,
        overallCTR: this.calculateOverallCTR(analytics, scores),
        scoreRanges,
        topTriggers: topTriggers.slice(0, MONITORING_CONFIG.MAX_TRIGGERS_DISPLAY),
        outliers: outliers.slice(0, MONITORING_CONFIG.MAX_OUTLIERS_DISPLAY),
        recommendations,
        behavioralBoostStats: behavioralBoostStats || undefined
      };

    } catch (error) {
      handleServiceError(error, {
        function: 'getMonitoringSummary',
        days
      });
      return null;
    }
  }

  /**
   * Get simple metrics for quick checks
   */
  static async getQuickMetrics(
    supabaseClient: SupabaseClientType,
    days: number = 1
  ): Promise<QuickMetrics | null> {
    try {
      this.validateDays(days);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const analytics = await this.getAnalyticsData(supabaseClient, startDate, endDate);
      if (!analytics || analytics.length === 0) return null;

      const eventIds = [...new Set(analytics.map(a => a.event_id))];
      const scores = await this.getEventScores(supabaseClient, eventIds);

      const uniqueEvents = new Set(analytics.map(a => a.event_id));
      const clicks = analytics.filter(a => a.metric_type === 'click').length;

      const triggers = this.analyzeTriggers(analytics, scores);
      const topTriggers = triggers.slice(0, MONITORING_CONFIG.MAX_TOP_TRIGGERS_IN_RANGE).map(t => t.trigger);

      return {
        totalEvents: uniqueEvents.size,
        totalClicks: clicks,
        ctr: uniqueEvents.size > 0 ? clicks / uniqueEvents.size : 0,
        avgScore: scores.length > 0
          ? scores.reduce((sum, s) => sum + s.overall_score, 0) / scores.length
          : 0,
        topTriggers
      };

    } catch (error) {
      console.error('Error getting quick metrics:', error);
      return null;
    }
  }
}