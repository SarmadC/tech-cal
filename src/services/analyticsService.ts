// src/services/analyticsService.ts
import * as Sentry from '@sentry/nextjs';

export class AnalyticsService {

    /**
     * Lightweight scoring analytics for tuning (dev/staging only)
     */
    static logScoringDebug(payload: {
        eventId: string;
        version: string;
        triggers: string[];
        components: Record<string, number>;
    }) {
        try {
            Sentry.addBreadcrumb({
                category: 'scoring-analytics',
                level: 'info',
                message: 'Scoring triggers',
                data: payload
            });
        } catch {
            // no-op
        }
        try {
            if (process.env.NODE_ENV !== 'production') {
                console.info('ScoringAnalytics', payload);
            }
        } catch {
            // no-op
        }
    }
}