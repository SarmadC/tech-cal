import type { EventAgendaSchema } from '@/types/ingestion';

export type ScheduleHint = 'track-filter' | 'day-tabs' | 'time-filter' | 'api-endpoint' | 'json-data' | 'graphql-data';

export interface ScheduleLinkDetail {
    url: string;
    type: 'nav' | 'button' | 'api' | 'unknown';
    contentFormat?: 'html' | 'json' | 'pdf' | 'ics' | 'graphql';
    hints?: ScheduleHint[];
    score?: number;
}

export interface ScheduleFallbackRequest {
    domain: string;
    scheduleLinks: ScheduleLinkDetail[];
    limit: number;
    startingLink?: string | null;
    scheduleHints?: ScheduleHint[];
}

export interface ScheduleFallbackResult {
    agenda: EventAgendaSchema[];
    processedLinks: string[];
}

export interface SiteScheduleFetcher {
    name: string;
    matches(request: ScheduleFallbackRequest): boolean;
    fetch(request: ScheduleFallbackRequest): Promise<ScheduleFallbackResult>;
}
