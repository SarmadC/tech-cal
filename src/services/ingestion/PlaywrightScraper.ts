import { chromium, type Browser, type BrowserContext } from 'playwright';

const DEFAULT_USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
];

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

export class PlaywrightScraper {
    private readonly maxConcurrency: number;
    private activeCount = 0;
    private readonly queue: Array<() => void> = [];

    constructor(maxConcurrency: number = Number(process.env.LLM_ENRICHMENT_PLAYWRIGHT_CONCURRENCY || '2')) {
        this.maxConcurrency = Math.max(1, maxConcurrency);
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
            if (!useFetchFallback) {
                throw error;
            }
            console.warn('Playwright scrape failed for', url, 'falling back to fetch:', error instanceof Error ? error.message : 'Unknown error');
            const fallback = await this.fetchFallback(url, options.fetchTimeoutMs ?? timeoutMs, userAgent);
            return { ...fallback, usedPlaywright: false };
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

