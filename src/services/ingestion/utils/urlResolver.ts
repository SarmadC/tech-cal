/**
 * URL Resolver Utility
 * 
 * Handles URL resolution, normalization, and redirect pattern detection.
 * Extracted from collectors to follow DRY principle.
 */

import { URL_RESOLVER_CONFIG } from '@/config/ingestionConstants';
import { stripTrackingParams } from './urlCanonicalizer';

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
        const pathParts = parsed.pathname.split('/').filter(Boolean);

        if (pathParts.length < 2) {
            return [];
        }

        const rawTarget = pathParts[1]; // e.g. "websummit.com_-awzxRwUO" or "www.cisco.com-ABCDEFGH"
        const htmIndex = rawTarget.toLowerCase().indexOf('.htm');
        const withoutSuffix = htmIndex >= 0 ? rawTarget.slice(0, htmIndex) : rawTarget;
        
        // First, try splitting on '_-' pattern (underscore-hyphen tracking suffix)
        let [domainAndPath] = withoutSuffix.split('_-'); // portion before the tracking suffix
        
        if (!domainAndPath) {
            return [];
        }

        // Convert underscores into potential path separators
        const sections = domainAndPath.split('_').filter(Boolean);
        const domainCandidate = sections.shift() ?? domainAndPath;
        const hasPathSegments = sections.length > 0;
        
        // Only strip tracking suffixes from domain-only URLs (no path segments)
        // For domain-only cases like "cisco.com-ABCDEFGH", strip the tracking suffix
        if (!hasPathSegments && domainAndPath === withoutSuffix) {
            // Match hyphen followed by uppercase letters/numbers at the end (tracking suffix)
            const hyphenTrackingSuffixMatch = domainAndPath.match(/^(.+)-([A-Z0-9]+)$/);
            if (hyphenTrackingSuffixMatch) {
                const beforeHyphen = hyphenTrackingSuffixMatch[1];
                const afterHyphen = hyphenTrackingSuffixMatch[2];
                // If before hyphen contains a dot (domain) and after hyphen is all uppercase/alphanumeric, it's a tracking suffix
                if (beforeHyphen.includes('.') && /^[A-Z0-9]+$/.test(afterHyphen)) {
                    domainAndPath = beforeHyphen;
                    // Re-split after stripping suffix (should still be domain-only)
                    const newSections = domainAndPath.split('_').filter(Boolean);
                    const newDomainCandidate = newSections.shift() ?? domainAndPath;
                    const candidatePath = newSections.length > 0 ? `/${newSections.join('/')}` : '';
                    
                    const candidates = new Set<string>();
                    const addCandidate = (candidate: string) => {
                        if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
                            candidate = `https://${candidate}`;
                        }
                        candidates.add(candidate);
                    };
                    addCandidate(`${newDomainCandidate}${candidatePath}`);
                    if (!newDomainCandidate.startsWith('www.') && newDomainCandidate.includes('.')) {
                        addCandidate(`www.${newDomainCandidate}${candidatePath}`);
                    }
                    return Array.from(candidates);
                }
            }
        }
        
        // For cases with path segments, check if the last segment has a tracking suffix
        // This handles cases like "infrastructure-operations-cloud-us-OV2bEoTc"
        if (hasPathSegments) {
            const lastSegment = sections[sections.length - 1];
            // Check if last segment ends with a tracking suffix (alphanumeric after hyphen)
            const lastSegmentMatch = lastSegment.match(/^(.+)-([A-Za-z0-9]+)$/);
            if (lastSegmentMatch) {
                const beforeHyphen = lastSegmentMatch[1];
                const afterHyphen = lastSegmentMatch[2];
                // Tracking suffixes are typically:
                // - Short (6-10 chars), alphanumeric, often mixed case
                // - NOT all numbers (like "2024" which is legitimate)
                // - The part before must have lowercase letters and hyphens (indicating a path segment)
                const isAllNumbers = /^[0-9]+$/.test(afterHyphen);
                const isShortAlphanumeric = afterHyphen.length >= 6 && afterHyphen.length <= 10 && /^[A-Za-z0-9]+$/.test(afterHyphen);
                const hasLowercaseBefore = /[a-z]/.test(beforeHyphen);
                const hasHyphensBefore = beforeHyphen.includes('-');
                
                // If it's a short alphanumeric suffix (not all numbers) and the part before looks like a path segment, it's likely a tracking suffix
                if (!isAllNumbers && isShortAlphanumeric && hasLowercaseBefore && hasHyphensBefore) {
                    sections[sections.length - 1] = beforeHyphen;
                }
            }
        }

        const candidatePath = sections.length > 0 ? `/${sections.join('/')}` : '';

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

        // Strip tracking params (utm_*, fbclid, etc.) for consistent dedup
        stripTrackingParams(urlObj);

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
    
    const urlMatch = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
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
