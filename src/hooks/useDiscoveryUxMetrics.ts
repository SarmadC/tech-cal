'use client';

import { useCallback, useEffect, useRef } from 'react';
import { sendTelemetryEvent } from '@/utils/telemetryClient';
import { DiscoveryRankingMode } from '@/components/discovery/discoveryRanking';

type DiscoverySurface = 'desktop' | 'mobile';

type FeedbackAction = 'less-like-this' | 'hide' | 'not-relevant';

interface UseDiscoveryUxMetricsOptions {
    surface: DiscoverySurface;
    initialRankingMode: DiscoveryRankingMode;
}

interface FilterChangePayload {
    activeFilterCount: number;
    changedFilter: string;
}

interface CardClickPayload {
    eventId: string;
    position?: number;
    section?: string;
}

interface SavePayload {
    eventId: string;
    source: 'bookmark' | 'swipe' | 'shortlist';
}

export function useDiscoveryUxMetrics({ surface, initialRankingMode }: UseDiscoveryUxMetricsOptions) {
    const sessionStartRef = useRef<number | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    const summarySentRef = useRef(false);

    const rankingModeRef = useRef<DiscoveryRankingMode>(initialRankingMode);
    const impressionsRef = useRef<number>(0);
    const clicksRef = useRef<number>(0);
    const hidesRef = useRef<number>(0);
    const savesRef = useRef<number>(0);
    const filterChurnRef = useRef<number>(0);
    const firstSaveMsRef = useRef<number | null>(null);

    const ensureSession = useCallback(() => {
        if (sessionStartRef.current == null) {
            sessionStartRef.current = Date.now();
        }

        if (!sessionIdRef.current) {
            sessionIdRef.current =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `discovery_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        }

        return {
            sessionStart: sessionStartRef.current as number,
            sessionId: sessionIdRef.current as string,
        };
    }, []);

    const baseContext = useCallback(() => ({
        surface,
        rankingMode: rankingModeRef.current,
    }), [surface]);

    const trackImpressions = useCallback((count: number) => {
        impressionsRef.current = Math.max(impressionsRef.current, count);
    }, []);

    const trackRankingChange = useCallback((mode: DiscoveryRankingMode) => {
        const { sessionId } = ensureSession();
        rankingModeRef.current = mode;
        void sendTelemetryEvent({
            eventType: 'discovery_ranking_changed',
            sessionId,
            context: baseContext(),
            metadata: {
                rankingMode: mode,
            },
        });
    }, [baseContext, ensureSession]);

    const trackFilterChange = useCallback(({ activeFilterCount, changedFilter }: FilterChangePayload) => {
        const { sessionId } = ensureSession();
        filterChurnRef.current += 1;
        void sendTelemetryEvent({
            eventType: 'discovery_filter_changed',
            sessionId,
            context: baseContext(),
            metadata: {
                changedFilter,
                activeFilterCount,
                filterChurnCount: filterChurnRef.current,
            },
        });
    }, [baseContext, ensureSession]);

    const trackCardClick = useCallback(({ eventId, position, section }: CardClickPayload) => {
        const { sessionId } = ensureSession();
        clicksRef.current += 1;
        void sendTelemetryEvent({
            eventType: 'discovery_card_click',
            sessionId,
            context: baseContext(),
            metadata: {
                eventId,
                position,
                section,
                clickCount: clicksRef.current,
            },
        });
    }, [baseContext, ensureSession]);

    const trackFeedbackAction = useCallback((eventId: string, action: FeedbackAction) => {
        const { sessionId } = ensureSession();
        if (action === 'hide' || action === 'not-relevant') {
            hidesRef.current += 1;
        }

        void sendTelemetryEvent({
            eventType: 'discovery_feedback_action',
            sessionId,
            context: baseContext(),
            metadata: {
                eventId,
                action,
                hiddenCount: hidesRef.current,
            },
        });
    }, [baseContext, ensureSession]);

    const trackSave = useCallback(({ eventId, source }: SavePayload) => {
        const { sessionStart, sessionId } = ensureSession();
        savesRef.current += 1;

        if (firstSaveMsRef.current == null) {
            firstSaveMsRef.current = Date.now() - sessionStart;
        }

        void sendTelemetryEvent({
            eventType: 'discovery_save_action',
            sessionId,
            context: baseContext(),
            metadata: {
                eventId,
                source,
                saveCount: savesRef.current,
                timeToFirstSaveMs: firstSaveMsRef.current,
            },
        });
    }, [baseContext, ensureSession]);

    const trackShortlistAction = useCallback((action: 'add' | 'remove' | 'clear', size: number, eventId?: string) => {
        const { sessionId } = ensureSession();
        void sendTelemetryEvent({
            eventType: 'discovery_shortlist_action',
            sessionId,
            context: baseContext(),
            metadata: {
                action,
                size,
                eventId,
            },
        });
    }, [baseContext, ensureSession]);

    const flushSummary = useCallback(() => {
        if (summarySentRef.current) {
            return;
        }

        const { sessionId, sessionStart } = ensureSession();
        summarySentRef.current = true;

        const impressions = impressionsRef.current;
        const clicks = clicksRef.current;
        const ctr = impressions > 0 ? clicks / impressions : 0;

        void sendTelemetryEvent({
            eventType: 'discovery_session_summary',
            sessionId,
            context: baseContext(),
            metadata: {
                impressions,
                clicks,
                ctr,
                hides: hidesRef.current,
                saves: savesRef.current,
                filterChurn: filterChurnRef.current,
                timeToFirstSaveMs: firstSaveMsRef.current,
                sessionDurationMs: Date.now() - sessionStart,
            },
        });
    }, [baseContext, ensureSession]);

    useEffect(() => {
        return () => {
            flushSummary();
        };
    }, [flushSummary]);

    return {
        trackImpressions,
        trackRankingChange,
        trackFilterChange,
        trackCardClick,
        trackFeedbackAction,
        trackSave,
        trackShortlistAction,
        flushSummary,
    };
}
