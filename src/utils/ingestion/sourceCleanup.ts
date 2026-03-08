const TECHMEME_REDIRECT_PATTERN = /techmeme\.com\/r2\//i;

const PLACEHOLDER_ORGANIZER_NAMES = new Set([
    '',
    'unknown',
    'unknown organizer',
    'tba',
    'tbd',
]);

const VIRTUAL_LOCATION_TERMS = [
    'google meet',
    'livestream',
    'meet.google',
    'online',
    'teams',
    'virtual',
    'webinar',
    'zoom',
];

const GENERIC_SUBDOMAINS = new Set([
    'blog',
    'community',
    'conference',
    'events',
    'event',
    'go',
    'info',
    'pages',
    'register',
    'tickets',
    'web',
    'www',
]);

const SECOND_LEVEL_TLDS = new Set([
    'ac',
    'co',
    'com',
    'edu',
    'gov',
    'net',
    'org',
]);

export function isTechmemeRedirect(url?: string | null): url is string {
    return Boolean(url && TECHMEME_REDIRECT_PATTERN.test(url));
}

export function resolveTechmemeUrl(rawUrl: string): string | null {
    if (!isTechmemeRedirect(rawUrl)) {
        return null;
    }

    const urlWithoutQuery = rawUrl.split('?')[0];
    const match = urlWithoutQuery.match(/techmeme\.com\/r2\/([^_]+)_(.+?)\.htm$/i);

    if (match) {
        const domain = match[1];
        let pathSegments = match[2];

        if (/^-[A-Za-z0-9]+$/.test(pathSegments)) {
            return `https://${domain}`;
        }

        pathSegments = pathSegments.replace(/-[A-Za-z0-9]+$/, '');

        if (!pathSegments) {
            return `https://${domain}`;
        }

        return `https://${domain}/${pathSegments.replace(/_/g, '/')}`;
    }

    const altMatch = urlWithoutQuery.match(/techmeme\.com\/r2\/([^_]+?)(?:-[A-Za-z0-9]+)?\.htm$/i);
    if (altMatch?.[1]) {
        return `https://${altMatch[1]}`;
    }

    return null;
}

export function normalizeHostname(hostname: string): string {
    const lower = hostname.trim().toLowerCase();
    return lower.startsWith('www.') ? lower.slice(4) : lower;
}

export function extractCanonicalDomain(url?: string | null): string | undefined {
    if (!url) {
        return undefined;
    }

    try {
        return normalizeHostname(new URL(url).hostname);
    } catch {
        return undefined;
    }
}

export function isPlaceholderOrganizerName(name?: string | null): boolean {
    if (!name) {
        return true;
    }

    return PLACEHOLDER_ORGANIZER_NAMES.has(name.trim().toLowerCase());
}

export function humanizeOrganizerNameFromDomain(domain: string): string {
    const normalizedDomain = normalizeHostname(domain);
    const labels = normalizedDomain.split('.').filter(Boolean);

    if (labels.length === 0) {
        return '';
    }

    const workingLabels = [...labels];
    if (workingLabels.length > 1) {
        workingLabels.pop();
    }
    if (
        workingLabels.length > 1 &&
        SECOND_LEVEL_TLDS.has(workingLabels[workingLabels.length - 1])
    ) {
        workingLabels.pop();
    }

    while (workingLabels.length > 1 && GENERIC_SUBDOMAINS.has(workingLabels[0])) {
        workingLabels.shift();
    }

    const baseLabel = workingLabels[workingLabels.length - 1] ?? labels[0];

    return baseLabel
        .split(/[-_]+/)
        .filter(Boolean)
        .map((segment) => {
            if (segment.length <= 3 && /^[a-z0-9]+$/i.test(segment)) {
                return segment.toUpperCase();
            }

            return segment.charAt(0).toUpperCase() + segment.slice(1);
        })
        .join(' ');
}

export function normalizeLocationValue(location?: string | null): string {
    if (!location || !location.trim()) {
        return 'Online';
    }

    const normalized = location.trim();
    const lower = normalized.toLowerCase();

    if (lower === 'tbd' || lower === 'tba') {
        return 'TBD';
    }

    if (lower === 'online' || lower === 'virtual') {
        return 'Online';
    }

    const parentheticalMatch = normalized.match(/^(.+?)\s+\(([^()]+)\)$/);
    if (parentheticalMatch && !normalized.includes(',')) {
        const primary = parentheticalMatch[1].trim();
        const secondary = parentheticalMatch[2].trim();
        const combined = `${primary} ${secondary}`.toLowerCase();
        const isVirtualLocation = VIRTUAL_LOCATION_TERMS.some((term) => combined.includes(term));

        if (primary && secondary && !isVirtualLocation) {
            return `${primary}, ${secondary}`;
        }
    }

    return normalized;
}
