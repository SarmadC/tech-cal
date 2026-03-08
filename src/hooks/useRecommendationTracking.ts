'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { BehavioralAnalyticsService } from '@/services/behavioralAnalyticsService';
import { ANALYTICS_CONFIG } from '@/config/analyticsConfig';
import { sendTelemetryEvent } from '@/utils/telemetryClient';

// =============================================
// RECOMMENDATION TRACKING HOOK
// =============================================

// Local type definitions (since they're not exported from the service)
export interface UserInteraction {
  userId: string;
  eventId?: string;
  interactionType: 'view' | 'click' | 'bookmark' | 'save' | 'share' | 'attend' | 'hover' | 'dismiss';
  section: 'for_you' | 'trending' | 'new_this_week' | 'quick_wins' | 'learning_path';
  position?: number;
  algorithmVersion: string;
  durationMs?: number;
  context?: Record<string, unknown>;
}

export interface RecommendationBatch {
  userId: string;
  sessionId: string;
  algorithmVersion: string;
  section: 'for_you' | 'trending' | 'new_this_week' | 'quick_wins' | 'learning_path';
  recommendations: Array<{
    eventId: string;
    score: number;
    position: number;
  }>;
}

type RecommendationSection = RecommendationBatch['section'];
type RecommendationDisplayItem = RecommendationBatch['recommendations'][number];

interface InteractionTrackingOptions {
  durationMs?: number;
  recommendationBatchId?: string;
}

export interface TrackingOptions {
  enableTracking?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

export function useRecommendationTracking(options: TrackingOptions = {}) {
  const { user } = useAuth();
  const userId = user?.id;
  const supabase = createClient();
  const sessionIdRef = useRef<string | undefined>(undefined);
  const viewTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const viewStartTimeRef = useRef<number | undefined>(undefined);
  const sectionBatchMapRef = useRef<Partial<Record<RecommendationSection, string>>>({});
  const eventBatchMapRef = useRef<Map<string, string>>(new Map());
  const recentBatchSignatureRef = useRef<Map<RecommendationSection, { signature: string; trackedAt: number }>>(new Map());
  const consentCacheRef = useRef<{ userId: string; hasConsent: boolean | null; cachedAt: number } | null>(null);
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  const buildEventSectionKey = useCallback((section: RecommendationSection, eventId: string): string => {
    return `${section}:${eventId}`;
  }, []);

  const rememberBatchAssociations = useCallback((
    section: RecommendationSection,
    recommendations: RecommendationDisplayItem[],
    recommendationBatchId: string
  ) => {
    sectionBatchMapRef.current[section] = recommendationBatchId;

    for (const recommendation of recommendations) {
      const key = buildEventSectionKey(section, recommendation.eventId);
      eventBatchMapRef.current.set(key, recommendationBatchId);
    }

    // Keep memory bounded for long-lived sessions.
    if (eventBatchMapRef.current.size > 2000) {
      eventBatchMapRef.current.clear();
    }
  }, [buildEventSectionKey]);

  const resolveRecommendationBatchId = useCallback((
    section: RecommendationSection,
    eventId: string,
    context?: Record<string, unknown>,
    explicitRecommendationBatchId?: string
  ): string | undefined => {
    if (explicitRecommendationBatchId) {
      return explicitRecommendationBatchId;
    }

    const contextBatchId = typeof context?.recommendationBatchId === 'string'
      ? context.recommendationBatchId
      : undefined;
    if (contextBatchId) {
      return contextBatchId;
    }

    const eventKey = buildEventSectionKey(section, eventId);
    const eventBatchId = eventBatchMapRef.current.get(eventKey);
    if (eventBatchId) {
      return eventBatchId;
    }

    return sectionBatchMapRef.current[section];
  }, [buildEventSectionKey]);

  // Generate session ID once per hook instance
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  useEffect(() => {
    sectionBatchMapRef.current = {};
    eventBatchMapRef.current.clear();
    recentBatchSignatureRef.current.clear();
  }, [userId]);

  // Cached consent check (avoid DB calls on every interaction)
  const checkConsentCached = useCallback(async (userId: string): Promise<boolean> => {
    const now = Date.now();
    const cacheValidFor = ANALYTICS_CONFIG.CONSENT_CACHE_DURATION;

    // Check cache first
    if (consentCacheRef.current && 
        consentCacheRef.current.userId === userId &&
        (now - consentCacheRef.current.cachedAt) < cacheValidFor) {
      return consentCacheRef.current.hasConsent || false;
    }

    // Fetch from database
    const hasConsent = await BehavioralAnalyticsService.getAnalyticsConsent(userId, supabase);
    
    // Update cache
    consentCacheRef.current = {
      userId,
      hasConsent,
      cachedAt: now
    };

    return hasConsent || false; // Default to false if null
  }, [supabase]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
      // Force flush any pending interactions for this user
      if (userId) {
        BehavioralAnalyticsService.forceFlushUser(userId);
      }
    };
  }, [supabase, userId]);

  /**
   * Track user interaction with an event
   */
  const trackInteraction = useCallback(async (
    eventId: string,
    interactionType: UserInteraction['interactionType'],
    section: UserInteraction['section'],
    position?: number,
    context?: Record<string, unknown>,
    trackingOptions: InteractionTrackingOptions = {}
  ) => {
    if (!userId || !options.enableTracking) return;

    // Check analytics consent (cached)
    const hasConsent = await checkConsentCached(userId);
    if (!hasConsent) return;

    const recommendationBatchId = resolveRecommendationBatchId(
      section,
      eventId,
      context,
      trackingOptions.recommendationBatchId
    );

    const interaction: UserInteraction = {
      userId,
      eventId,
      interactionType,
      section,
      position,
      algorithmVersion: ANALYTICS_CONFIG.CURRENT_ALGORITHM_VERSION,
      durationMs: trackingOptions.durationMs,
      context
    };

    await BehavioralAnalyticsService.trackInteraction(
      userId,
      interaction.interactionType,
      { 
        eventId: interaction.eventId,
        section: interaction.section,
        position: interaction.position,
        algorithmVersion: interaction.algorithmVersion,
        durationMs: interaction.durationMs,
        context: interaction.context,
        recommendationBatchId
      },
      supabase
    );

    void sendTelemetryEvent({
      eventType: 'recommendation_interaction',
      sessionId: sessionIdRef.current,
      context: {
        surface: 'recommendations',
        section
      },
      metadata: {
        eventId,
        interactionType,
        position,
        algorithmVersion: interaction.algorithmVersion,
        durationMs: interaction.durationMs,
        recommendationBatchId: recommendationBatchId ?? null,
        interactionContext: context ?? null
      }
    });
  }, [userId, supabase, options.enableTracking, checkConsentCached, resolveRecommendationBatchId]);

  /**
   * Track when user starts viewing an event (starts timer)
   */
  const trackViewStart = useCallback((
    eventId: string,
    section: UserInteraction['section'],
    position?: number
  ) => {
    if (!userId || !options.enableTracking) return;

    viewStartTimeRef.current = Date.now();
    
    // Clear any existing timer
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
    }

    // Track view interaction immediately
    trackInteraction(eventId, 'view', section, position);
  }, [userId, trackInteraction, options.enableTracking]);

  /**
   * Track when user stops viewing an event (calculates duration)
   */
  const trackViewEnd = useCallback(async (
    eventId: string,
    section: UserInteraction['section'],
    position?: number
  ) => {
    if (!userId || !options.enableTracking || !viewStartTimeRef.current) return;

    const durationMs = Date.now() - viewStartTimeRef.current;

    // Only track if viewed for more than 1 second
    if (durationMs > 1000) {
      await trackInteraction(eventId, 'view', section, position, undefined, { durationMs });
    }

    // Clear timer and start time
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
      viewTimerRef.current = undefined;
    }
    viewStartTimeRef.current = undefined;
  }, [userId, options.enableTracking, trackInteraction]);

  /**
   * Track recommendation batch display
   */
  const trackRecommendationDisplay = useCallback(async (
    section: RecommendationSection,
    recommendations: RecommendationDisplayItem[],
    _algorithmVersion: string = 'v1.0'
  ) => {
    if (!userId || !sessionIdRef.current || !options.enableTracking) return;

    const hasConsent = await checkConsentCached(userId);
    // Check if still mounted after async operation
    if (!hasConsent || !isMountedRef.current) return;

    const normalizedRecommendations = recommendations.filter(
      (recommendation): recommendation is RecommendationDisplayItem =>
        typeof recommendation?.eventId === 'string' && recommendation.eventId.length > 0
    );

    if (normalizedRecommendations.length === 0) {
      return;
    }

    const now = Date.now();
    const signature = normalizedRecommendations
      .map(rec => `${rec.eventId}:${rec.position}:${rec.score}`)
      .join('|');
    const lastSignature = recentBatchSignatureRef.current.get(section);

    // Dedupe rapid re-renders of the same recommendation batch.
    if (
      lastSignature &&
      lastSignature.signature === signature &&
      now - lastSignature.trackedAt < 10_000
    ) {
      return;
    }

    recentBatchSignatureRef.current.set(section, {
      signature,
      trackedAt: now,
    });

    let recommendationBatchId: string | null = null;

    const { data: persistedBatch, error: persistError } = await supabase
      .from('recommendation_batches')
      .insert({
        user_id: userId,
        session_id: sessionIdRef.current,
        algorithm_version: _algorithmVersion,
        section,
        event_ids: normalizedRecommendations.map(rec => rec.eventId),
        scores: normalizedRecommendations.map(rec => rec.score),
        shown_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (persistError) {
      console.warn('Failed to persist recommendation batch display', {
        userId,
        section,
        error: persistError.message
      });
    } else if (persistedBatch?.id) {
      recommendationBatchId = persistedBatch.id;
      rememberBatchAssociations(section, normalizedRecommendations, persistedBatch.id);
    }

    void sendTelemetryEvent({
      eventType: 'recommendation_batch_displayed',
      sessionId: sessionIdRef.current,
      context: {
        surface: 'recommendations',
        section
      },
      metadata: {
        recommendations: normalizedRecommendations,
        algorithmVersion: _algorithmVersion,
        recommendationBatchId,
        persistedToRecommendationBatches: Boolean(recommendationBatchId)
      }
    });
  }, [userId, options.enableTracking, checkConsentCached, supabase, rememberBatchAssociations]);

  /**
   * Track click interaction
   */
  const trackClick = useCallback((
    eventId: string,
    section: UserInteraction['section'],
    position?: number,
    context?: Record<string, unknown>
  ) => {
    return trackInteraction(eventId, 'click', section, position, context);
  }, [trackInteraction]);

  /**
   * Track hover interaction
   */
  const trackHover = useCallback((
    eventId: string,
    section: UserInteraction['section'],
    position?: number
  ) => {
    return trackInteraction(eventId, 'hover', section, position);
  }, [trackInteraction]);

  /**
   * Track dismiss interaction (when user explicitly dismisses a recommendation)
   */
  const trackDismiss = useCallback((
    eventId: string,
    section: UserInteraction['section'],
    position?: number,
    reason?: string
  ) => {
    return trackInteraction(eventId, 'dismiss', section, position, { reason });
  }, [trackInteraction]);

  /**
   * Track share interaction
   */
  const trackShare = useCallback((
    eventId: string,
    section: UserInteraction['section'],
    position?: number,
    shareMethod?: string
  ) => {
    return trackInteraction(eventId, 'share', section, position, { shareMethod });
  }, [trackInteraction]);

  /**
   * Get current session ID
   */
  const getSessionId = useCallback(() => {
    return sessionIdRef.current;
  }, []);

  return {
    // Basic tracking
    trackInteraction,
    trackClick,
    trackHover,
    trackDismiss,
    trackShare,
    
    // View duration tracking
    trackViewStart,
    trackViewEnd,
    
    // Recommendation tracking
    trackRecommendationDisplay,
    
    // Utilities
    getSessionId,
    
    // State
    isTrackingEnabled: !!options.enableTracking && !!userId
  };
}

// =============================================
// SPECIALIZED HOOKS FOR DIFFERENT SECTIONS
// =============================================

/**
 * Hook specifically for "For You" section tracking
 */
export function useForYouTracking(options: TrackingOptions = {}) {
  const baseTracking = useRecommendationTracking({ enableTracking: true, ...options });

  // Create specialized functions that reuse base tracking logic
  const trackForYouView = useCallback((eventId: string, position?: number) => 
    baseTracking.trackInteraction(eventId, 'view', 'for_you', position),
  [baseTracking]);

  const trackForYouClick = useCallback((eventId: string, position?: number) => 
    baseTracking.trackInteraction(eventId, 'click', 'for_you', position),
  [baseTracking]);

  const trackForYouDisplay = useCallback((recommendations: Array<{ eventId: string; score: number; position: number }>) => 
    baseTracking.trackRecommendationDisplay('for_you', recommendations),
  [baseTracking]);

  return {
    trackForYouView,
    trackForYouClick,
    trackForYouDisplay,
    isTrackingEnabled: baseTracking.isTrackingEnabled
  };
}

/**
 * Hook specifically for "Trending" section tracking
 */
export function useTrendingTracking(options: TrackingOptions = {}) {
  const tracking = useRecommendationTracking({ enableTracking: true, ...options });

  return {
    ...tracking,
    trackTrendingView: (eventId: string, position?: number) =>
      tracking.trackViewStart(eventId, 'trending', position),
    trackTrendingClick: (eventId: string, position?: number) =>
      tracking.trackClick(eventId, 'trending', position),
    trackTrendingDisplay: (recommendations: Array<{ eventId: string; score: number; position: number }>) =>
      tracking.trackRecommendationDisplay('trending', recommendations),
  };
}

/**
 * Hook for general discovery section tracking
 */
export function useDiscoveryTracking(section: UserInteraction['section'], options: TrackingOptions = {}) {
  const tracking = useRecommendationTracking({ enableTracking: true, ...options });

  return {
    ...tracking,
    trackSectionView: (eventId: string, position?: number) =>
      tracking.trackViewStart(eventId, section, position),
    trackSectionClick: (eventId: string, position?: number) =>
      tracking.trackClick(eventId, section, position),
    trackSectionDisplay: (recommendations: Array<{ eventId: string; score: number; position: number }>) =>
      tracking.trackRecommendationDisplay(section, recommendations),
  };
}
