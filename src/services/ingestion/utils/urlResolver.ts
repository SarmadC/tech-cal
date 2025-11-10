/**
 * URL Resolver Utility
 * 
 * Handles URL resolution, normalization, and redirect pattern detection.
 * Extracted from collectors to follow DRY principle.
 */

import { URL_RESOLVER_CONFIG } from '@/config/ingestionConstants';

/**
 * Check if URL matches TechMeme redirect pattern
 */
export function isTechMemeRedirect(url: string): boolean {
    return URL_RESOLVER_CONFIG.TECHMEME_REDIRECT_PATTERN.test(url);
}

/**
 * Derive likely destination URLs for TechMeme redirect links.
 * TechMeme encodes the target domain (and sometimes path) in the /r{n}/ segment (e.g., /r2/).
 */
export function resolveTechMemeRedirect(url: string): string[] {
    if (!isTechMemeRedirect(url)) {
        return [];
    }

    try {
        const parsed = new URL(url);
        const redirectSection = parsed.pathname.split('/r2/')[1];
        if (!redirectSection) {
            return [];
        }

        const encodedTarget = redirectSection.split('/')[0];
        if (!encodedTarget) {
            return [];
        }

        const withoutExtension = encodedTarget.replace(/\.htm$/i, '');
        const cleanTrackingSuffix = (value: string): string =>
            value.replace(/-[A-Za-z0-9]{6,}$/, '');

        const segments = withoutExtension.split('_').filter(Boolean);
        if (segments.length === 0) {
            return [];
        }

        const domainCandidateRaw = segments.shift()!;
        const domainCandidate = cleanTrackingSuffix(domainCandidateRaw);
        if (!domainCandidate) {
            return [];
        }

        if (segments.length > 0) {
            const lastIdx = segments.length - 1;
            segments[lastIdx] = cleanTrackingSuffix(segments[lastIdx]);
            if (!segments[lastIdx]) {
                segments.pop();
            }
        }

        const candidatePath = segments.length > 0 ? `/${segments.join('/')}` : '';

        const candidates = new Set<string>();

        const addCandidate = (candidate: string) => {
            if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
                candidate = `https://${candidate}`;
            }
            candidates.add(candidate);
        };

        addCandidate(`${domainCandidate}${candidatePath}`);

        // Add www-prefixed variant if not already present and domain looks bare.
        if (!domainCandidate.startsWith('www.') && domainCandidate.includes('.')) {
            addCandidate(`www.${domainCandidate}${candidatePath}`);
        }

        return Array.from(candidates);
    } catch {
        return [];
    }
}

/**
 * Normalize URLs for comparison (strip trailing slashes, lowercase)
 */
export function normalizeUrl(url: string): string {
    try {
        const urlObj = new URL(url.trim());
        let pathname = urlObj.pathname;
        if (pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }
        return `${urlObj.protocol}//${urlObj.hostname.toLowerCase()}${pathname}${urlObj.search}`;
    } catch {
        return url.trim().toLowerCase();
    }
}

/**
 * Normalize canonical URL for deduplication
 * - Case-insensitive hostname
 * - Strip trailing slashes
 * - Collapse default ports (:80, :443)
 * - For TechMeme URLs: drop query parameters
 */
export function normalizeCanonicalUrl(url: string | undefined): string | null {
    if (!url || !url.trim()) {
        return null;
    }

    try {
        const urlObj = new URL(url.trim());

        // Normalize hostname (case-insensitive)
        const hostname = urlObj.hostname.toLowerCase();

        // Collapse default ports
        if (
            urlObj.port === URL_RESOLVER_CONFIG.DEFAULT_HTTP_PORT &&
            urlObj.protocol === 'http:'
        ) {
            urlObj.port = '';
        } else if (
            urlObj.port === URL_RESOLVER_CONFIG.DEFAULT_HTTPS_PORT &&
            urlObj.protocol === 'https:'
        ) {
            urlObj.port = '';
        }

        // For TechMeme redirect URLs, drop query parameters
        if (isTechMemeRedirect(url)) {
            urlObj.search = '';
        }

        // Strip trailing slash from pathname
        let pathname = urlObj.pathname;
        if (pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }

        // Reconstruct normalized URL
        const normalized = `${urlObj.protocol}//${hostname}${urlObj.port ? `:${urlObj.port}` : ''}${pathname}${urlObj.search}`;
        return normalized;
    } catch {
        return null;
    }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | undefined {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '');
    } catch {
        return undefined;
    }
}

/**
 * Extract URL from text content (description, etc.)
 */
export function extractUrlFromText(text: string): string | undefined {
    if (!text) return undefined;
    
    const urlMatch = text.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/i);
    return urlMatch ? urlMatch[0] : undefined;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

