import { chromium, type Browser, type BrowserContext } from 'playwright';

const DEFAULT_USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
];

type ScraperMode = 'auto' | 'playwright' | 'fetch';
const MISSING_BROWSER_ERROR_PATTERNS = [
    "Executable doesn't exist",
    'Please run the following command to download new browsers',
] as const;
const MAX_CAPTURED_NETWORK_PAYLOADS = 10;

export interface ScrapeOptions {
    timeoutMs?: number;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    blockResources?: Array<'image' | 'font' | 'media'>;
    postNavigationDelayMs?: number;
    userAgent?: string;
    useFetchFallback?: boolean;
    fetchTimeoutMs?: number;
}

export interface ScrapeResult {
    html: string;
    finalUrl: string;
    statusCode?: number;
    usedPlaywright: boolean;
}

export interface ObserveAction {
    selector: string;
    label?: string;
    actionType?: 'switch_day' | 'expand_section' | 'load_more';
}

export interface CapturedPayload {
    url: string;
    contentType?: string;
    bodyText: string;
}

export interface ObserveResult extends ScrapeResult {
    evidenceSource: 'page_html' | 'interaction';
    originActionLabel?: string;
    capturedPayloads?: CapturedPayload[];
}

export class PlaywrightScraper {
    private static browserUnavailable = false;
    private static warnedUnavailable = false;
    private readonly maxConcurrency: number;
    private readonly mode: ScraperMode;
    private activeCount = 0;
    private readonly queue: Array<() => void> = [];

    constructor(maxConcurrency: number = Number(process.env.LLM_ENRICHMENT_PLAYWRIGHT_CONCURRENCY || '2')) {
        this.maxConcurrency = Math.max(1, maxConcurrency);
        const configuredMode = (process.env.LLM_ENRICHMENT_SCRAPER_MODE || 'auto').trim().toLowerCase();
        this.mode = configuredMode === 'fetch' || configuredMode === 'playwright' ? configuredMode : 'auto';
    }

    async scrapeUrl(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
        const release = await this.acquireSlot();
        const timeoutMs = options.timeoutMs ?? 30000; // Increased from 15s to 30s
        const waitUntil = options.waitUntil ?? 'domcontentloaded'; // Changed from networkidle - more reliable
        const blockResources = options.blockResources ?? ['image', 'font', 'media'];
        const postNavigationDelayMs = options.postNavigationDelayMs ?? 1000; // Increased for dynamic content
        const userAgent = options.userAgent ?? this.pickUserAgent();
        const useFetchFallback = options.useFetchFallback ?? true; // Enable fallback by default

        let browser: Browser | null = null;
        let context: BrowserContext | null = null;

        try {
            if (this.shouldUseFetchOnly()) {
                const fallback = await this.fetchFallback(url, options.fetchTimeoutMs ?? timeoutMs, userAgent);
                return { ...fallback, usedPlaywright: false };
            }

            browser = await chromium.launch({ headless: true });
            context = await browser.newContext({ userAgent });

            const page = await context.newPage();
            if (blockResources.length > 0) {
                await page.route('**/*', (route) => {
                    const type = route.request().resourceType();
                    if (blockResources.includes(type as 'image' | 'font' | 'media')) {
                        return route.abort();
                    }
                    return route.continue();
                });
            }

            const response = await page.goto(url, { timeout: timeoutMs, waitUntil });
            if (postNavigationDelayMs > 0) {
                await page.waitForTimeout(postNavigationDelayMs);
            }

            const html = await page.content();
            const finalUrl = page.url();
            const statusCode = response?.status();

            return {
                html,
                finalUrl,
                statusCode,
                usedPlaywright: true,
            };
        } catch (error) {
            if (this.isMissingBrowserError(error)) {
                PlaywrightScraper.browserUnavailable = true;
                if (!PlaywrightScraper.warnedUnavailable) {
                    PlaywrightScraper.warnedUnavailable = true;
                    console.warn(
                        '[PlaywrightScraper] Playwright browser is unavailable in this runtime. Falling back to fetch for all subsequent scrapes.'
                    );
                }
            }
            if (!useFetchFallback) {
                throw error;
            }
            if (!this.isMissingBrowserError(error) || this.mode === 'playwright') {
                console.warn(
                    'Playwright scrape failed for',
                    url,
                    'falling back to fetch:',
                    error instanceof Error ? error.message : 'Unknown error'
                );
            }
            const fallback = await this.fetchFallback(url, options.fetchTimeoutMs ?? timeoutMs, userAgent);
            return { ...fallback, usedPlaywright: false };
        } finally {
            await context?.close();
            await browser?.close();
            release();
        }
    }

    async observePage(
        url: string,
        action?: ObserveAction,
        options: ScrapeOptions = {},
    ): Promise<ObserveResult> {
        const release = await this.acquireSlot();
        const timeoutMs = options.timeoutMs ?? 30000;
        const waitUntil = options.waitUntil ?? 'domcontentloaded';
        const blockResources = options.blockResources ?? ['image', 'font', 'media'];
        const postNavigationDelayMs = options.postNavigationDelayMs ?? 1000;
        const userAgent = options.userAgent ?? this.pickUserAgent();
        const useFetchFallback = options.useFetchFallback ?? true;

        let browser: Browser | null = null;
        let context: BrowserContext | null = null;

        try {
            if (this.shouldUseFetchOnly()) {
                const fallback = await this.fetchFallback(url, options.fetchTimeoutMs ?? timeoutMs, userAgent);
                return {
                    ...fallback,
                    evidenceSource: action ? 'interaction' : 'page_html',
                    originActionLabel: action?.label,
                    capturedPayloads: [],
                };
            }

            browser = await chromium.launch({ headless: true });
            context = await browser.newContext({ userAgent });
            const page = await context.newPage();

            if (blockResources.length > 0) {
                await page.route('**/*', (route) => {
                    const type = route.request().resourceType();
                    if (blockResources.includes(type as 'image' | 'font' | 'media')) {
                        return route.abort();
                    }
                    return route.continue();
                });
            }

            const capturedPayloads: CapturedPayload[] = [];
            page.on('response', async (response) => {
                if (capturedPayloads.length >= MAX_CAPTURED_NETWORK_PAYLOADS) {
                    return;
                }

                const headers = response.headers();
                const contentType = headers['content-type'] || '';
                const responseUrl = response.url();
                const looksLikeJson =
                    contentType.includes('application/json')
                    || contentType.includes('+json')
                    || /\/graphql\b|\/api\//i.test(responseUrl);

                if (!looksLikeJson) {
                    return;
                }

                try {
                    const bodyText = await response.text();
                    if (!bodyText || bodyText.length > 200_000) {
                        return;
                    }

                    JSON.parse(bodyText);
                    capturedPayloads.push({
                        url: responseUrl,
                        contentType: contentType || undefined,
                        bodyText,
                    });
                } catch {
                    // Ignore unreadable responses.
                }
            });

            const response = await page.goto(url, { timeout: timeoutMs, waitUntil });
            if (postNavigationDelayMs > 0) {
                await page.waitForTimeout(postNavigationDelayMs);
            }

            if (action?.selector) {
                const locator = page.locator(action.selector).first();
                await locator.waitFor({ state: 'visible', timeout: Math.min(timeoutMs, 5000) });
                await locator.click({ timeout: Math.min(timeoutMs, 5000) });
                try {
                    await page.waitForLoadState('networkidle', { timeout: 3000 });
                } catch {
                    // Ignore pages that never reach networkidle.
                }
                await page.waitForTimeout(1000);
            }

            const html = await page.content();
            const finalUrl = page.url();
            const statusCode = response?.status();

            return {
                html,
                finalUrl,
                statusCode,
                usedPlaywright: true,
                evidenceSource: action ? 'interaction' : 'page_html',
                originActionLabel: action?.label,
                capturedPayloads,
            };
        } catch (error) {
            if (this.isMissingBrowserError(error)) {
                PlaywrightScraper.browserUnavailable = true;
                if (!PlaywrightScraper.warnedUnavailable) {
                    PlaywrightScraper.warnedUnavailable = true;
                    console.warn(
                        '[PlaywrightScraper] Playwright browser is unavailable in this runtime. Falling back to fetch for all subsequent observations.'
                    );
                }
            }

            if (!useFetchFallback) {
                throw error;
            }

            const fallback = await this.fetchFallback(url, options.fetchTimeoutMs ?? timeoutMs, userAgent);
            return {
                ...fallback,
                evidenceSource: action ? 'interaction' : 'page_html',
                originActionLabel: action?.label,
                capturedPayloads: [],
            };
        } finally {
            await context?.close();
            await browser?.close();
            release();
        }
    }

    private async fetchFallback(url: string, timeoutMs: number, userAgent: string): Promise<ScrapeResult> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': userAgent },
                signal: controller.signal,
            });
            const html = await response.text();
            return {
                html,
                finalUrl: response.url || url,
                statusCode: response.status,
                usedPlaywright: false,
            };
        } finally {
            clearTimeout(timer);
        }
    }

    private pickUserAgent(): string {
        const index = Math.floor(Math.random() * DEFAULT_USER_AGENTS.length);
        return DEFAULT_USER_AGENTS[index];
    }

    private shouldUseFetchOnly(): boolean {
        return this.mode === 'fetch' || (this.mode === 'auto' && PlaywrightScraper.browserUnavailable);
    }

    private isMissingBrowserError(error: unknown): boolean {
        const message = error instanceof Error ? error.message : '';
        return MISSING_BROWSER_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
    }

    private async acquireSlot(): Promise<() => void> {
        if (this.activeCount >= this.maxConcurrency) {
            await new Promise<void>((resolve) => this.queue.push(resolve));
        }
        this.activeCount += 1;
        return () => {
            this.activeCount -= 1;
            const next = this.queue.shift();
            if (next) next();
        };
    }
}
