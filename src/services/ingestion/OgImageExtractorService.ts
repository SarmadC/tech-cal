/**
 * OG Image Extractor Service
 *
 * Extracts og:image meta tags from URLs for use as organizer logos.
 * Designed to be lightweight - only parses the <head> section.
 */

import { JSDOM } from 'jsdom';
import { OG_IMAGE_CONFIG } from '@/config/ingestionConstants';

export class OgImageExtractorService {
    /**
     * Extract og:image from a URL
     * Returns the image URL or null if not found/failed
     */
    static async extractOgImage(url: string): Promise<string | null> {
        if (!url) return null;

        // Check if domain should be skipped (event platforms that would return their own logo)
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');

            if (OG_IMAGE_CONFIG.SKIP_DOMAINS.some(skipDomain => domain.includes(skipDomain))) {
                console.debug(`Skipping og:image extraction for platform domain: ${domain}`);
                return null;
            }
        } catch {
            return null;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), OG_IMAGE_CONFIG.FETCH_TIMEOUT_MS);

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; TechCalBot/1.0)',
                    'Accept': 'text/html',
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.debug(`Failed to fetch ${url}: ${response.status}`);
                return null;
            }

            const html = await response.text();
            return this.extractOgImageFromHtml(html, url);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.debug(`Timeout fetching og:image from ${url}`);
            } else {
                console.debug(`Error fetching og:image from ${url}:`, error);
            }
            return null;
        }
    }

    /**
     * Extract logo from HTML string
     * Prioritizes actual logos over promotional banners
     *
     * Priority order:
     * 1. JSON-LD Organization.logo (most semantically accurate)
     * 2. apple-touch-icon (always a square logo, high quality)
     * 3. Large favicon (always a logo)
     * 4. og:image (last resort - often a banner, not a logo)
     */
    static extractOgImageFromHtml(html: string, baseUrl: string): string | null {
        try {
            // Extract just the head section for efficiency
            const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
            const headHtml = headMatch ? headMatch[0] : html;

            const dom = new JSDOM(headHtml);
            const document = dom.window.document;

            // 1. Try JSON-LD Organization.logo (most accurate)
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of jsonLdScripts) {
                try {
                    const data = JSON.parse(script.textContent || '');
                    // Handle both single object and array of objects
                    const items = Array.isArray(data) ? data : [data];
                    for (const item of items) {
                        if (item['@type'] === 'Organization' && item.logo) {
                            const logo = typeof item.logo === 'string' ? item.logo : item.logo?.url;
                            if (logo) {
                                return this.resolveUrl(logo, baseUrl);
                            }
                        }
                    }
                } catch {
                    // Invalid JSON, continue to next script
                }
            }

            // 2. Try apple-touch-icon (always a square logo, high quality 180x180)
            const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href');
            if (appleTouchIcon) {
                return this.resolveUrl(appleTouchIcon, baseUrl);
            }

            // Also try apple-touch-icon-precomposed
            const appleTouchIconPrecomposed = document.querySelector('link[rel="apple-touch-icon-precomposed"]')?.getAttribute('href');
            if (appleTouchIconPrecomposed) {
                return this.resolveUrl(appleTouchIconPrecomposed, baseUrl);
            }

            // 3. Try large favicon (prefer larger sizes)
            const largeFavicon = document.querySelector('link[rel="icon"][sizes="192x192"], link[rel="icon"][sizes="128x128"], link[rel="icon"][sizes="96x96"]')?.getAttribute('href');
            if (largeFavicon) {
                return this.resolveUrl(largeFavicon, baseUrl);
            }

            // 4. Fallback to og:image (might be a banner, but better than nothing)
            const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
            if (ogImage) {
                return this.resolveUrl(ogImage, baseUrl);
            }

            // 5. Last resort: twitter:image
            const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
            if (twitterImage) {
                return this.resolveUrl(twitterImage, baseUrl);
            }

            return null;
        } catch (error) {
            console.debug(`Error parsing HTML for logo:`, error);
            return null;
        }
    }

    /**
     * Resolve relative URLs to absolute URLs
     */
    private static resolveUrl(url: string, baseUrl: string): string {
        if (!url) return url;

        // Already absolute
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        try {
            return new URL(url, baseUrl).href;
        } catch {
            return url;
        }
    }
}
