/**
 * Firecrawl Site Analyzer
 *
 * Intelligently classifies event website complexity and detects site structure
 * to determine the best enrichment strategy (scrape, crawl, or extract).
 */

import { FIRECRAWL_EXCLUDE_PATHS, FIRECRAWL_CRAWL_LIMITS } from '@/config/ingestionConstants';
import * as Sentry from '@sentry/nextjs';

export type SiteComplexity = 'SIMPLE' | 'MULTI_PAGE' | 'COMPLEX';

export type ScheduleHint =
    | 'track-filter'
    | 'day-tabs'
    | 'time-filter'
    | 'api-endpoint'
    | 'json-data'
    | 'graphql-data'
    | 'query-track'
    | 'query-day';

export interface ScheduleLinkDetail {
    url: string;
    type: 'schedule' | 'track' | 'day' | 'api' | 'unknown';
    label?: string;
    contentFormat?: 'html' | 'json' | 'graphql';
    queryParams?: string[];
    hints?: ScheduleHint[];
}

export interface SiteAnalysis {
    complexity: SiteComplexity;
    strategy: 'scrape' | 'crawl' | 'extract';
    relatedPages: string[];
    priorityPages: string[]; // Schedule/agenda/speakers pages (critical for data extraction)
    needsMultiPageCrawl: boolean;
    confidence: number; // 0-1
    scheduleLinks: string[]; // Specific schedule/track URLs for chunked extraction (legacy array for backward compat)
    scheduleLinkDetails: ScheduleLinkDetail[]; // Structured metadata for schedule links
    isMultiTrack: boolean;
    scheduleHints: ScheduleHint[];
}
const SCHEDULE_FETCH_TIMEOUT_MS = 8000;
const MAX_SCHEDULE_LINKS = 12;

const TRACK_PARAM_KEYS = ['track', 'stage', 'stream', 'topic', 'pillar', 'channel'];
const DAY_PARAM_KEYS = ['day', 'date', 'sessionday', 'day_number', 'dayid'];


const decodeHtml = (value: string): string =>
    value
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&ldquo;/g, '“')
        .replace(/&rdquo;/g, '”')
        .replace(/&lsquo;/g, '‘')
        .replace(/&rsquo;/g, '’');


// Common patterns for multi-page event sites
const MULTI_PAGE_PATTERNS = {
    agenda: ['/agenda', '/schedule', '/sessions', '/program', '/timetable', '/itinerary'],
    speakers: ['/speakers', '/presenters', '/instructors', '/experts', '/panelists', '/people'],
    venue: ['/venue', '/location', '/map', '/directions', '/hotels'],
    tickets: ['/tickets', '/pricing', '/register', '/registration', '/apply'],
};

// Keywords for detecting priority pages (schedule/agenda/speakers) - exported for reuse
export const SCHEDULE_KEYWORDS = ['schedule', 'agenda', 'program', 'sessions', 'timetable', 'itinerary'];
export const SPEAKERS_KEYWORDS = ['speakers', 'presenters', 'instructors', 'experts', 'panelists'];

/**
 * Check if a URL is a priority page (schedule/agenda/speakers)
 */
export function isPriorityPage(url: string): boolean {
    const urlLower = url.toLowerCase();
    return SCHEDULE_KEYWORDS.some(kw => urlLower.includes(kw)) || 
           SPEAKERS_KEYWORDS.some(kw => urlLower.includes(kw));
}

// Domain patterns that typically require crawling
const COMPLEX_DOMAIN_PATTERNS = [
    'eventbrite.com',
    'conference.io',
    'meetup.com',
    'lanyrd.com',
    'sessionize.com',
    'pathable.com',
];

// Simple domain patterns that typically don't need crawling
const SIMPLE_DOMAIN_PATTERNS = [
    'linkedin.com/events',
    'facebook.com/events',
    'github.com',
    'medium.com',
];

/**
 * Analyzes an event website to determine the best enrichment strategy
 */
export class FirecrawlSiteAnalyzer {
    /**
     * Analyze a source URL to determine site complexity and optimal strategy
     */
    static async analyze(
        sourceUrl: string,
        registrationUrl?: string,
        options?: {
            cachedScheduleLinks?: string[];
            cachedScheduleDetails?: ScheduleLinkDetail[];
        }
    ): Promise<SiteAnalysis> {
        try {
            const urlObj = new URL(sourceUrl);
            const hostname = urlObj.hostname.toLowerCase();
            const pathname = urlObj.pathname.toLowerCase();
            const relatedPages: string[] = [];
            let complexity: SiteComplexity = 'SIMPLE';
            let confidence = 0.7;

            // Check for simple domain patterns
            if (SIMPLE_DOMAIN_PATTERNS.some(pattern => hostname.includes(pattern))) {
                complexity = 'SIMPLE';
                confidence = 0.9;
            }

            // Check for complex domain patterns
            if (COMPLEX_DOMAIN_PATTERNS.some(pattern => hostname.includes(pattern))) {
                complexity = 'COMPLEX';
                confidence = 0.85;
            }

            // Analyze URL structure for multi-page indicators
            const multiPageIndicators = this.detectMultiPagePatterns(sourceUrl, registrationUrl);

            if (multiPageIndicators.length > 0) {
                complexity = 'MULTI_PAGE';
                relatedPages.push(...multiPageIndicators);
                confidence = 0.8;
            }

            // Check for conference/event-specific domains
            const eventDomainPatterns = [
                'conference',
                'summit',
                'expo',
                'congress',
                'symposium',
                'retreat',
                'workshop',
                'bootcamp',
                'hackathon',
                'meetup',
            ];

            const isEventDomain = eventDomainPatterns.some(pattern =>
                hostname.includes(pattern) || pathname.includes(pattern)
            );

            if (isEventDomain && complexity === 'SIMPLE') {
                complexity = 'MULTI_PAGE';
                confidence = 0.6;
            }

            // Determine enrichment strategy
            const strategy = this.determineStrategy(complexity, relatedPages);

            // Separate priority pages (schedule/agenda/speakers) from other related pages
            const priorityPages = relatedPages.filter(isPriorityPage);
            const otherPages = relatedPages.filter(url => !isPriorityPage(url));

            const cachedScheduleDetails: ScheduleLinkDetail[] = options?.cachedScheduleDetails
                ? options.cachedScheduleDetails
                : options?.cachedScheduleLinks?.map((url) => ({
                      url,
                      type: 'unknown',
                      contentFormat: 'html',
                  })) ?? [];

            const discoveredDetails = cachedScheduleDetails.length > 0
                ? []
                : await this.discoverScheduleLinks(urlObj, priorityPages);

            const scheduleLinkDetailsMap = new Map<string, ScheduleLinkDetail>();

            for (const detail of [...cachedScheduleDetails, ...discoveredDetails]) {
                const existing = scheduleLinkDetailsMap.get(detail.url);
                if (existing) {
                    const mergedHints = new Set([...(existing.hints ?? []), ...(detail.hints ?? [])]);
                    const mergedQueryParams = new Set([...(existing.queryParams ?? []), ...(detail.queryParams ?? [])]);
                    scheduleLinkDetailsMap.set(detail.url, {
                        ...existing,
                        ...detail,
                        contentFormat: detail.contentFormat ?? existing.contentFormat,
                        hints: mergedHints.size > 0 ? Array.from(mergedHints) : undefined,
                        queryParams: mergedQueryParams.size > 0 ? Array.from(mergedQueryParams) : undefined,
                    });
                } else {
                    scheduleLinkDetailsMap.set(detail.url, detail);
                }
            }

            const scheduleLinkDetails = Array.from(scheduleLinkDetailsMap.values());
            const scheduleLinks = scheduleLinkDetails.map((detail) => detail.url);
            const trackLinkCount = scheduleLinkDetails.filter((detail) => detail.type === 'track').length;
            const dayLinkCount = scheduleLinkDetails.filter((detail) => detail.type === 'day').length;
            const hasTrackHints = scheduleLinkDetails.some((detail) => (detail.hints ?? []).includes('track-filter'));
            const hasDayHints = scheduleLinkDetails.some((detail) => (detail.hints ?? []).includes('day-tabs'));
            const hasQueryTrack = scheduleLinkDetails.some((detail) => (detail.hints ?? []).includes('query-track'));
            const hasQueryDay = scheduleLinkDetails.some((detail) => (detail.hints ?? []).includes('query-day'));
            const scheduleHints = Array.from(
                new Set(
                    scheduleLinkDetails
                        .flatMap((detail) => detail.hints ?? [])
                        .filter((hint): hint is ScheduleHint => Boolean(hint))
                )
            );

            const isMultiTrack =
                trackLinkCount > 1 ||
                dayLinkCount > 1 ||
                hasTrackHints ||
                hasDayHints ||
                hasQueryTrack ||
                hasQueryDay ||
                scheduleLinks.some((link) => link.toLowerCase().includes('track='));

            return {
                complexity,
                strategy,
                relatedPages: [...priorityPages, ...otherPages], // Priority pages first
                priorityPages,
                needsMultiPageCrawl: relatedPages.length > 0 || complexity === 'COMPLEX',
                confidence,
                scheduleLinks,
                scheduleLinkDetails,
                isMultiTrack,
                scheduleHints,
            };
        } catch (error) {
            Sentry.captureException(error, {
                contexts: {
                    siteAnalysis: {
                        sourceUrl,
                        registrationUrl,
                    },
                },
            });

            // Default to simple scrape on analysis error
            return {
                complexity: 'SIMPLE',
                strategy: 'scrape',
                relatedPages: [],
                priorityPages: [],
                needsMultiPageCrawl: false,
                confidence: 0.3,
                scheduleLinks: [],
                scheduleLinkDetails: [],
                isMultiTrack: false,
                scheduleHints: [],
            };
        }
    }

    /**
     * Detect multi-page patterns in URL structure
     * Prioritizes schedule/agenda/speakers pages for critical data extraction
     */
    private static detectMultiPagePatterns(sourceUrl: string, registrationUrl?: string): string[] {
        const detected: string[] = [];
        const priorityPages: string[] = []; // Schedule/agenda/speakers pages get priority

        try {
            const baseUrl = new URL(sourceUrl);
            const basePathname = baseUrl.pathname.toLowerCase();

            // Check if registration URL indicates a separate page
            if (registrationUrl && registrationUrl !== sourceUrl) {
                const regUrl = new URL(registrationUrl);
                const regPathname = regUrl.pathname.toLowerCase();

                // If registration is on same domain but different path, it's multi-page
                if (baseUrl.hostname === regUrl.hostname && regPathname !== basePathname) {
                    detected.push(registrationUrl);
                }
            }

            // Check if current URL already indicates a schedule/agenda/speakers page
            const isSchedulePage = SCHEDULE_KEYWORDS.some(keyword => basePathname.includes(keyword));
            const isSpeakersPage = SPEAKERS_KEYWORDS.some(keyword => basePathname.includes(keyword));

            // Heuristic: if we're on a "details" or "about" page, other pages likely exist
            const detailPatterns = [
                '/details',
                '/about',
                '/overview',
                '/info',
                '/information',
                '/home',
                '/',
            ];

            const isDetailPage = detailPatterns.some(pattern => 
                basePathname === pattern || basePathname === `${pattern}/` || basePathname.endsWith(pattern)
            );

            // Build base path for generating related pages
            let basePath = basePathname;
            if (isDetailPage) {
                // Remove detail pattern to get base path
                for (const pattern of detailPatterns) {
                    if (basePathname === pattern || basePathname === `${pattern}/` || basePathname.endsWith(pattern)) {
                        basePath = basePathname.replace(new RegExp(`${pattern.replace('/', '\\/')}/?$`), '') || '/';
                        break;
                    }
                }
            } else if (!isSchedulePage && !isSpeakersPage) {
                // If not on a detail page and not on schedule/speakers page, try to detect base path
                // Common pattern: /events/2024/summit -> base is /events/2024/
                const pathParts = basePathname.split('/').filter(p => p);
                if (pathParts.length > 1) {
                    // Assume last part is the page name, use everything before it as base
                    basePath = '/' + pathParts.slice(0, -1).join('/') + '/';
                }
            }

            // Generate related pages, prioritizing schedule/agenda/speakers
            for (const [category, paths] of Object.entries(MULTI_PAGE_PATTERNS)) {
                for (const subpath of paths) {
                    const fullUrl = `${baseUrl.origin}${basePath === '/' ? '' : basePath}${subpath}`;
                    
                    // Priority pages for schedule/agenda/speakers (critical data)
                    if (category === 'agenda' || category === 'speakers') {
                        priorityPages.push(fullUrl);
                    } else {
                        detected.push(fullUrl);
                    }
                }
            }

            // Also check for common schedule page patterns in current URL structure
            // e.g., if URL is /events/2024/summit, try /events/2024/summit/schedule
            if (!isSchedulePage && !isSpeakersPage && basePathname && basePathname !== '/') {
                const cleanPath = basePathname.endsWith('/') ? basePathname.slice(0, -1) : basePathname;
                for (const schedulePath of MULTI_PAGE_PATTERNS.agenda) {
                    priorityPages.push(`${baseUrl.origin}${cleanPath}${schedulePath}`);
                }
                for (const speakersPath of MULTI_PAGE_PATTERNS.speakers) {
                    priorityPages.push(`${baseUrl.origin}${cleanPath}${speakersPath}`);
                }
            }

            // Return priority pages first, then other pages (removes duplicates)
            return [...new Set([...priorityPages, ...detected])];
        } catch {
            return [];
        }
    }

    private static async discoverScheduleLinks(
        sourceUrl: URL,
        priorityPages: string[]
    ): Promise<ScheduleLinkDetail[]> {
        const discovered = new Map<string, ScheduleLinkDetail>();

        const scheduleCandidates: ScheduleLinkDetail[] = [];
        const baseOrigin = `${sourceUrl.origin}`;

        const pushCandidate = (path: string, type: ScheduleLinkDetail['type'], label?: string) => {
            const normalizedPath = path.startsWith('/') ? path : `/${path}`;
            const fullUrl = `${baseOrigin}${normalizedPath}`;
            const candidate = this.createScheduleDetail(fullUrl, type, label);
            if (candidate) {
                scheduleCandidates.push(candidate);
            }
            if (!normalizedPath.endsWith('/')) {
                const altUrl = `${baseOrigin}${normalizedPath}/`;
                const altCandidate = this.createScheduleDetail(altUrl, type, label);
                if (altCandidate) {
                    scheduleCandidates.push(altCandidate);
                }
            }
        };

        for (const path of MULTI_PAGE_PATTERNS.agenda) {
            pushCandidate(path, 'schedule');
        }

        // Include already detected priority pages (likely schedule URLs)
        priorityPages.forEach((url) => {
            try {
                const parsed = new URL(url, baseOrigin);
                if (parsed.hostname === sourceUrl.hostname) {
                    const detail = this.createScheduleDetail(parsed.toString(), 'schedule');
                    if (detail) {
                        scheduleCandidates.push(detail);
                    }
                }
            } catch {
                // ignore
            }
        });

        const uniqueCandidates = Array.from(
            new Map(scheduleCandidates.map((candidate) => [candidate.url, candidate])).values()
        );

        for (const candidate of uniqueCandidates) {
            if (discovered.size >= MAX_SCHEDULE_LINKS) {
                break;
            }

            try {
                const html = await this.fetchPage(candidate.url);
                if (!html) {
                    discovered.set(
                        candidate.url,
                        this.mergeScheduleDetails(discovered.get(candidate.url), candidate)
                    );
                    continue;
                }

                const insights = this.analyzeScheduleHtml(html, new URL(candidate.url));

                const enrichedCandidate = this.mergeScheduleDetails(discovered.get(candidate.url), {
                    ...candidate,
                    hints: this.mergeHints(candidate.hints, insights.hints),
                });
                discovered.set(enrichedCandidate.url, enrichedCandidate);

                const trackLinks = this.extractTrackLinks(html, candidate.url, sourceUrl.origin);
                for (const link of trackLinks) {
                    const merged = this.mergeScheduleDetails(discovered.get(link.url), link);
                    discovered.set(merged.url, merged);
                    if (discovered.size >= MAX_SCHEDULE_LINKS) {
                        break;
                    }
                }

                for (const apiEndpoint of insights.apiEndpoints) {
                    const merged = this.mergeScheduleDetails(discovered.get(apiEndpoint.url), apiEndpoint);
                    discovered.set(merged.url, merged);
                }
            } catch (error) {
                Sentry.captureException(error, {
                    contexts: {
                        scheduleDiscovery: {
                            candidate,
                        },
                    },
                });
            }
        }

        return Array.from(discovered.values());
    }

    private static async fetchPage(url: string): Promise<string | null> {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), SCHEDULE_FETCH_TIMEOUT_MS);

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'tech-cal-bot/1.0 (+https://tech-cal.com)',
                    Accept: 'text/html,application/xhtml+xml',
                },
            });

            clearTimeout(timeout);

            if (!response.ok) {
                return null;
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
                return null;
            }

            return await response.text();
        } catch {
            return null;
        }
    }

    private static extractTrackLinks(html: string, baseUrl: string, origin: string): ScheduleLinkDetail[] {
        const links = new Map<string, ScheduleLinkDetail>();
        const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
        const absoluteBase = new URL(baseUrl);

        let match: RegExpExecArray | null;
        while ((match = anchorRegex.exec(html)) !== null) {
            const href = match[1];
            if (!href) {
                continue;
            }

            if (href.startsWith('mailto:') || href.startsWith('#') || href.startsWith('javascript:')) {
                continue;
            }

            try {
                const resolved = new URL(href, absoluteBase);

                if (resolved.origin !== origin) {
                    continue;
                }

                const lowerHref = resolved.toString().toLowerCase();
                const isSchedule = SCHEDULE_KEYWORDS.some((keyword) => lowerHref.includes(keyword));
                const hasTrackParam = TRACK_PARAM_KEYS.some((key) => lowerHref.includes(`${key}=`));
                const hasDayParam = DAY_PARAM_KEYS.some((key) => lowerHref.includes(`${key}=`));

                if (isSchedule || hasTrackParam || hasDayParam) {
                    const label = decodeHtml(match[2] || '').trim() || undefined;
                    const baseType: ScheduleLinkDetail['type'] = hasTrackParam
                        ? 'track'
                        : hasDayParam
                        ? 'day'
                        : isSchedule
                        ? 'schedule'
                        : 'unknown';
                    const detail = this.createScheduleDetail(resolved.toString(), baseType, label);
                    if (!detail) {
                        continue;
                    }

                    const additionalHints: ScheduleHint[] = [];
                    if (hasTrackParam) {
                        additionalHints.push('query-track');
                    }
                    if (hasDayParam) {
                        additionalHints.push('query-day');
                    }

                    const merged = this.mergeScheduleDetails(links.get(detail.url), {
                        ...detail,
                        hints: this.mergeHints(detail.hints, additionalHints),
                    });
                    links.set(merged.url, merged);
                }
            } catch {
                // ignore invalid URLs
            }
        }

        return Array.from(links.values()).slice(0, MAX_SCHEDULE_LINKS);
    }

    private static mergeHints(
        a?: ScheduleHint[] | null,
        b?: ScheduleHint[] | null
    ): ScheduleHint[] | undefined {
        const combined = [...(a ?? []), ...(b ?? [])];
        if (combined.length === 0) {
            return undefined;
        }
        return Array.from(new Set(combined));
    }

    private static mergeScheduleDetails(
        existing: ScheduleLinkDetail | undefined,
        incoming: ScheduleLinkDetail | undefined
    ): ScheduleLinkDetail {
        if (!incoming) {
            return existing ?? { url: '', type: 'unknown' };
        }
        if (!existing) {
            return incoming;
        }

        const resolvedExisting = existing;
        const resolvedIncoming = incoming;

        const mergedHints = this.mergeHints(resolvedExisting.hints, resolvedIncoming.hints);
        const mergedQueryParams = new Set([
            ...(resolvedExisting.queryParams ?? []),
            ...(resolvedIncoming.queryParams ?? []),
        ]);

        const priorityType =
            resolvedIncoming.type !== 'unknown' && resolvedExisting.type === 'unknown'
                ? resolvedIncoming.type
                : resolvedExisting.type === 'schedule' && resolvedIncoming.type !== 'schedule'
                ? resolvedIncoming.type
                : resolvedExisting.type;

        return {
            ...resolvedExisting,
            ...resolvedIncoming,
            type: priorityType,
            contentFormat: resolvedIncoming.contentFormat ?? resolvedExisting.contentFormat,
            hints: mergedHints,
            queryParams: mergedQueryParams.size > 0 ? Array.from(mergedQueryParams) : undefined,
        };
    }

    private static createScheduleDetail(
        urlString: string,
        defaultType: ScheduleLinkDetail['type'],
        label?: string
    ): ScheduleLinkDetail | null {
        try {
            const parsed = new URL(urlString);
            const queryKeys = Array.from(parsed.searchParams.keys());
            const hints: ScheduleHint[] = [];
            let type = defaultType;

            if (queryKeys.some((key) => TRACK_PARAM_KEYS.includes(key.toLowerCase()))) {
                hints.push('query-track');
                if (type === 'schedule' || type === 'unknown') {
                    type = 'track';
                }
            }
            if (queryKeys.some((key) => DAY_PARAM_KEYS.includes(key.toLowerCase()))) {
                hints.push('query-day');
                if (type === 'schedule' || type === 'unknown') {
                    type = 'day';
                }
            }

            return {
                url: parsed.toString(),
                type,
                label,
                contentFormat: 'html',
                queryParams: queryKeys.length > 0 ? queryKeys : undefined,
                hints: hints.length > 0 ? hints : undefined,
            };
        } catch {
            return null;
        }
    }

    private static analyzeScheduleHtml(html: string, baseUrl: URL): {
        hints: ScheduleHint[];
        apiEndpoints: ScheduleLinkDetail[];
    } {
        const hints: ScheduleHint[] = [];
        if (/(track-filter|data-track|track__|track-tab|filter-track|track-selector|tracks-filter)/i.test(html)) {
            hints.push('track-filter');
        }
        if (/(day-tab|schedule-day|data-day|day-selector|day-switcher|schedule__day)/i.test(html)) {
            hints.push('day-tabs');
        }
        if (/(time-filter|timeslot|time-slot|schedule-time-filter)/i.test(html)) {
            hints.push('time-filter');
        }

        const apiEndpoints: ScheduleLinkDetail[] = [];
        const fetchRegex = /fetch\((['"])([^'"]+?)\1/gi;
        let fetchMatch: RegExpExecArray | null;
        while ((fetchMatch = fetchRegex.exec(html)) !== null) {
            const endpoint = fetchMatch[2];
            if (!/(schedule|agenda|session|program)/i.test(endpoint)) {
                continue;
            }
            try {
                const resolved = new URL(endpoint, baseUrl);
                const lower = resolved.toString().toLowerCase();
                const endpointHints: ScheduleHint[] = ['api-endpoint'];
                let format: ScheduleLinkDetail['contentFormat'] = 'json';
                if (lower.includes('graphql')) {
                    format = 'graphql';
                    endpointHints.push('graphql-data');
                } else {
                    endpointHints.push('json-data');
                }
                apiEndpoints.push({
                    url: resolved.toString(),
                    type: 'api',
                    contentFormat: format,
                    hints: endpointHints,
                });
            } catch {
                // ignore invalid endpoints
            }
        }

        const staticJsonRegex = /['"](\/[^'"\s]*?(schedule|agenda|sessions)[^'"\s]*\.json)['"]/gi;
        let jsonMatch: RegExpExecArray | null;
        while ((jsonMatch = staticJsonRegex.exec(html)) !== null) {
            try {
                const resolved = new URL(jsonMatch[1], baseUrl);
                apiEndpoints.push({
                    url: resolved.toString(),
                    type: 'api',
                    contentFormat: 'json',
                    hints: ['api-endpoint', 'json-data'],
                });
            } catch {
                // ignore invalid JSON urls
            }
        }

        return {
            hints: Array.from(new Set(hints)),
            apiEndpoints,
        };
    }

    /**
     * Determine the best enrichment strategy based on site complexity
     */
    private static determineStrategy(
        complexity: SiteComplexity,
        relatedPages: string[]
    ): 'scrape' | 'crawl' | 'extract' {
        switch (complexity) {
            case 'SIMPLE':
                return 'scrape';
            case 'MULTI_PAGE':
                return relatedPages.length > 0 ? 'crawl' : 'scrape';
            case 'COMPLEX':
                // Use crawl mode to let Firecrawl discover pages
                return 'crawl';
        }
    }

    /**
     * Build crawl configuration based on site analysis
     */
    static getCrawlConfig(analysis: SiteAnalysis) {
        if (analysis.strategy !== 'crawl') {
            return null;
        }

        return {
            // Limit pages based on complexity
            limit:
                analysis.complexity === 'COMPLEX'
                    ? FIRECRAWL_CRAWL_LIMITS.COMPLEX
                    : FIRECRAWL_CRAWL_LIMITS.DEFAULT,

            // Exclude common non-event content
            excludePaths: [...FIRECRAWL_EXCLUDE_PATHS, '*/comments', '*/search'],

            // Allow subdomains for complex sites
            allowSubdomains: analysis.complexity === 'COMPLEX',

            // Main content only to avoid navigation/footer noise
            scrape_options: {
                formats: ['markdown', 'extract'],
                onlyMainContent: true,
            },
        };
    }
}
