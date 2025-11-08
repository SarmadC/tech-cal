import type { ScheduleHint, ScheduleLinkDetail } from '@/services/ingestion/FirecrawlSiteAnalyzer';
import type { EventAgendaSchema } from '@/types/firecrawl';

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
