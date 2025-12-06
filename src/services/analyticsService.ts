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

    static logProfilePromptEvent(event: 'prompt_shown' | 'prompt_opened' | 'prompt_snoozed' | 'prompt_completed', payload: Record<string, unknown>) {
        try {
            Sentry.addBreadcrumb({
                category: 'profile-prompt',
                level: 'info',
                message: event,
                data: payload
            });
        } catch {
            // no-op
        }

        try {
            if (process.env.NODE_ENV !== 'production') {
                console.info('[ProfilePrompt]', event, payload);
            }
        } catch {
            // no-op
        }
    }
}
