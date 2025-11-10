/**
 * Firecrawl Site Analyzer
 *
 * Intelligently classifies event website complexity and detects site structure
 * to determine the best enrichment strategy (scrape, crawl, or extract).
 */

import { FIRECRAWL_EXCLUDE_PATHS, FIRECRAWL_CRAWL_LIMITS } from '@/config/ingestionConstants';
import * as Sentry from '@sentry/nextjs';

export type SiteComplexity = 'SIMPLE' | 'MULTI_PAGE' | 'COMPLEX';

export interface SiteAnalysis {
    complexity: SiteComplexity;
    strategy: 'scrape' | 'crawl' | 'extract';
    relatedPages: string[];
    priorityPages: string[]; // Schedule/agenda/speakers pages (critical for data extraction)
    needsMultiPageCrawl: boolean;
    confidence: number; // 0-1
}

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
    static async analyze(sourceUrl: string, registrationUrl?: string): Promise<SiteAnalysis> {
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

            return {
                complexity,
                strategy,
                relatedPages: [...priorityPages, ...otherPages], // Priority pages first
                priorityPages,
                needsMultiPageCrawl: relatedPages.length > 0 || complexity === 'COMPLEX',
                confidence,
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
