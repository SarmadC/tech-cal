import crypto from 'crypto';
import type { EventSourceRecord } from '@/types/ingestion';

const TRACKING_PARAM_PREFIXES = [
    'utm_',
    'mc_',
    'pk_',
    'trk_',
    'ga_',
    'fbclid',
    'gclid',
    'igshid',
    'yclid',
    'cmpid',
    'mkt_tok',
];

const TRACKING_PARAM_NAMES = new Set([
    'ref',
    'referrer',
    'source',
    'src',
    'campaign',
    'campaign_id',
    'cid',
    'affid',
    'affiliate',
    'session',
    'spm',
    's_cid',
]);

export interface NormalizedUrlResult {
    normalizedUrl: string;
    normalizedHost: string;
    normalizedPath: string;
    searchParams: string;
    hash: string;
}

/**
 * Strip known tracking parameters from the URL search params.
 */
function stripTrackingParams(url: URL): void {
    const params = url.searchParams;

    const keysToDelete: string[] = [];

    params.forEach((_, key) => {
        const lowerKey = key.toLowerCase();
        if (TRACKING_PARAM_NAMES.has(lowerKey)) {
            keysToDelete.push(key);
            return;
        }

        for (const prefix of TRACKING_PARAM_PREFIXES) {
            if (lowerKey.startsWith(prefix)) {
                keysToDelete.push(key);
                break;
            }
        }
    });

    for (const key of keysToDelete) {
        params.delete(key);
    }
}

/**
 * Normalize the hostname:
 * - lowercased
 * - strip leading www.
 */
function normalizeHostname(hostname: string): string {
    const lower = hostname.toLowerCase();
    return lower.startsWith('www.') ? lower.slice(4) : lower;
}

/**
 * Normalize URL path: remove duplicate slashes, trailing slash (unless root).
 */
function normalizePath(pathname: string): string {
    if (!pathname || pathname === '/') {
        return '';
    }

    const withoutDuplicateSlashes = pathname.replace(/\/{2,}/g, '/');
    if (withoutDuplicateSlashes === '/') {
        return '';
    }

    return withoutDuplicateSlashes.endsWith('/')
        ? withoutDuplicateSlashes.slice(0, -1)
        : withoutDuplicateSlashes;
}

/**
 * Build deterministic search params string (sorted).
 */
function buildSortedSearchParams(url: URL): string {
    const params = new URLSearchParams(url.searchParams);
    const entries = Array.from(params.entries());
    entries.sort(([aKey, aVal], [bKey, bVal]) => {
        if (aKey === bKey) {
            return aVal.localeCompare(bVal);
        }
        return aKey.localeCompare(bKey);
    });

    if (entries.length === 0) {
        return '';
    }

    const sorted = new URLSearchParams();
    for (const [key, value] of entries) {
        sorted.append(key, value);
    }
    return sorted.toString();
}

/**
 * Normalize URL for caching/canonicalization purposes.
 */
export function normalizeUrlForCaching(rawUrl: string): NormalizedUrlResult | null {
    if (!rawUrl || !rawUrl.trim()) {
        return null;
    }

    try {
        const trimmed = rawUrl.trim();
        const url = new URL(trimmed);

        // Remove hash fragments
        url.hash = '';

        // Strip tracking params
        stripTrackingParams(url);

        const normalizedHost = normalizeHostname(url.hostname);
        const normalizedPath = normalizePath(url.pathname);
        const sortedParams = buildSortedSearchParams(url);

        const normalizedUrl = `${url.protocol}//${normalizedHost}${normalizedPath ? `/${normalizedPath.replace(/^\//, '')}` : ''}${sortedParams ? `?${sortedParams}` : ''}`;

        const hash = createHash(normalizedUrl);

        return {
            normalizedUrl,
            normalizedHost,
            normalizedPath,
            searchParams: sortedParams,
            hash,
        };
    } catch {
        return null;
    }
}

/**
 * Compute SHA-256 hash for deterministic cache keys.
 */
export function createHash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Resolve Techmeme redirect URLs (techmeme.com/r2/...) to canonical URLs.
 *
 * Pattern: techmeme.com/r2/domain_path_segments-base64Hash.htm?cal=1
 * Steps: strip query + .htm, split domain from path at first _, remove trailing -hash, replace _ with /
 * Example: techmeme.com/r2/blockworks.co_event_permissionless-RWjwjofT.htm?cal=1
 *       -> https://blockworks.co/event/permissionless
 */
export function resolveTechmemeUrl(rawUrl: string): string | null {
    if (!rawUrl || !rawUrl.includes('techmeme.com/r2/')) {
        return null;
    }

    // Strip query params
    const urlWithoutQuery = rawUrl.split('?')[0];

    // Match: techmeme.com/r2/{slug}.htm
    const match = urlWithoutQuery.match(/techmeme\.com\/r2\/([^_]+)_(.+?)\.htm$/);
    if (match) {
        const domain = match[1];
        let pathSegments = match[2];

        // Remove trailing base64 hash suffix (e.g. -RWjwjofT)
        pathSegments = pathSegments.replace(/-[a-zA-Z0-9]+$/, '');

        if (!pathSegments) {
            return `https://${domain}`;
        }

        // Replace underscores with slashes
        const path = pathSegments.replace(/_/g, '/');
        return `https://${domain}/${path}`;
    }

    // Domain-only pattern: techmeme.com/r2/domain-hash.htm
    const altMatch = urlWithoutQuery.match(/techmeme\.com\/r2\/([^_]+?)(?:-[a-zA-Z0-9]+)?\.htm$/);
    if (altMatch?.[1]) {
        return `https://${altMatch[1]}`;
    }

    return null;
}

export function applyUrlCanonicalization(record: EventSourceRecord): void {
    if (!record.provenance) {
        return;
    }

    // Resolve Techmeme redirect URLs before canonicalization
    if (record.sourceUrl?.includes('techmeme.com/r2/')) {
        const resolved = resolveTechmemeUrl(record.sourceUrl);
        if (resolved) {
            record.sourceUrl = resolved;
        }
    }

    const normalizedSource = record.sourceUrl ? normalizeUrlForCaching(record.sourceUrl) : null;
    if (normalizedSource) {
        record.normalizedSourceUrl = normalizedSource.normalizedUrl;
        record.normalizedSourceUrlHash = normalizedSource.hash;
        record.sourceDomain = normalizedSource.normalizedHost;

        record.provenance.normalized_url = normalizedSource.normalizedUrl;
        record.provenance.normalized_url_hash = normalizedSource.hash;
        record.provenance.source_domain = normalizedSource.normalizedHost;
    }

    const normalizedRegistration = record.registrationUrl
        ? normalizeUrlForCaching(record.registrationUrl)
        : null;
    if (normalizedRegistration) {
        record.normalizedRegistrationUrl = normalizedRegistration.normalizedUrl;
        record.normalizedRegistrationUrlHash = normalizedRegistration.hash;

        record.provenance.registration_normalized_url = normalizedRegistration.normalizedUrl;
        record.provenance.registration_normalized_url_hash = normalizedRegistration.hash;
    }

    if (!record.sourceDomain && normalizedSource) {
        record.sourceDomain = normalizedSource.normalizedHost;
    }
}



