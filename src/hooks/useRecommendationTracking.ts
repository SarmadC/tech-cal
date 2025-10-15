'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { BehavioralAnalyticsService } from '@/services/behavioralAnalyticsService';
import { ANALYTICS_CONFIG } from '@/config/analyticsConfig';

// =============================================
// RECOMMENDATION TRACKING HOOK
// =============================================

// Local type definitions (since they're not exported from the service)
export interface UserInteraction {
  userId: string;
  eventId?: string;
  interactionType: 'view' | 'click' | 'bookmark' | 'save' | 'share' | 'attend' | 'hover' | 'dismiss';
  section: 'for_you' | 'trending' | 'new_this_week' | 'quick_wins';
  position?: number;
  algorithmVersion: string;
  durationMs?: number;
  context?: Record<string, unknown>;
}

export interface RecommendationBatch {
  userId: string;
  sessionId: string;
  algorithmVersion: string;
  section: 'for_you' | 'trending' | 'new_this_week' | 'quick_wins';
  recommendations: Array<{
    eventId: string;
    score: number;
    position: number;
  }>;
}

export interface TrackingOptions {
  enableTracking?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

export function useRecommendationTracking(options: TrackingOptions = {}) {
  const { user } = useAuth();
  const supabase = createClient();
  const sessionIdRef = useRef<string | undefined>(undefined);
  const viewTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const viewStartTimeRef = useRef<number | undefined>(undefined);
  const consentCacheRef = useRef<{ userId: string; hasConsent: boolean | null; cachedAt: number } | null>(null);

  // Generate session ID once per hook instance
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

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
    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
      // Force flush any pending interactions for this user
      if (user?.id) {
        BehavioralAnalyticsService.forceFlushUser(user.id);
      }
    };
  }, [supabase, user?.id]);

  /**
   * Track user interaction with an event
   */
  const trackInteraction = useCallback(async (
    eventId: string,
    interactionType: UserInteraction['interactionType'],
    section: UserInteraction['section'],
    position?: number,
    context?: Record<string, unknown>
  ) => {
    if (!user?.id || !options.enableTracking) return;

    // Check analytics consent (cached)
    const hasConsent = await checkConsentCached(user.id);
    if (!hasConsent) return;

    const interaction: UserInteraction = {
      userId: user.id,
      eventId,
      interactionType,
      section,
      position,
      algorithmVersion: ANALYTICS_CONFIG.CURRENT_ALGORITHM_VERSION,
      context
    };

    await BehavioralAnalyticsService.trackInteraction(
      user?.id || '',
      interaction.interactionType,
      { 
        eventId: interaction.eventId,
        section: interaction.section,
        position: interaction.position,
        algorithmVersion: interaction.algorithmVersion,
        durationMs: interaction.durationMs,
        context: interaction.context
      },
      supabase
    );
  }, [user?.id, supabase, options.enableTracking, checkConsentCached]);

  /**
   * Track when user starts viewing an event (starts timer)
   */
  const trackViewStart = useCallback((
    eventId: string,
    section: UserInteraction['section'],
    position?: number
  ) => {
    if (!user?.id || !options.enableTracking) return;

    viewStartTimeRef.current = Date.now();
    
    // Clear any existing timer
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
    }

    // Track view interaction immediately
    trackInteraction(eventId, 'view', section, position);
  }, [user?.id, trackInteraction, options.enableTracking]);

  /**
   * Track when user stops viewing an event (calculates duration)
   */
  const trackViewEnd = useCallback(async (
    eventId: string,
    section: UserInteraction['section'],
    position?: number
  ) => {
    if (!user?.id || !options.enableTracking || !viewStartTimeRef.current) return;

    const durationMs = Date.now() - viewStartTimeRef.current;
    
    // Only track if viewed for more than 1 second
    if (durationMs > 1000) {
      const hasConsent = await checkConsentCached(user.id);
      if (!hasConsent) return;

      const interaction: UserInteraction = {
        userId: user.id,
        eventId,
        interactionType: 'view',
        section,
        position,
        algorithmVersion: ANALYTICS_CONFIG.CURRENT_ALGORITHM_VERSION,
        durationMs
      };

      await BehavioralAnalyticsService.trackInteraction(
        user.id,
        interaction.interactionType,
        { 
          eventId: interaction.eventId,
          section: interaction.section,
          position: interaction.position,
          algorithmVersion: interaction.algorithmVersion,
          durationMs: interaction.durationMs
        },
        supabase
      );
    }

    // Clear timer and start time
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
      viewTimerRef.current = undefined;
    }
    viewStartTimeRef.current = undefined;
  }, [user?.id, supabase, options.enableTracking, checkConsentCached]);

  /**
   * Track recommendation batch display
   */
  const trackRecommendationDisplay = useCallback(async (
    section: 'for_you' | 'trending' | 'new_this_week' | 'quick_wins',
    recommendations: Array<{
      eventId: string;
      score: number;
      position: number;
    }>,
    _algorithmVersion: string = 'v1.0'
  ) => {
    if (!user?.id || !sessionIdRef.current || !options.enableTracking) return;

    const hasConsent = await checkConsentCached(user.id);
    if (!hasConsent) return;

    // TODO: Implement recommendation batch tracking in Phase 2
    // Will require new RPC function or table structure for batch display tracking
    // For now, individual interactions (view/click) provide sufficient signal
    // Batch structure for future reference:
    // { userId, sessionId, algorithmVersion, section, recommendations }
  }, [user?.id, options.enableTracking, checkConsentCached]);

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
    isTrackingEnabled: !!options.enableTracking && !!user?.id
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
