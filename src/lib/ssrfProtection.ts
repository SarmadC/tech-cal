import dns from 'dns/promises';
import net from 'net';

const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254',
    'metadata.google.internal',
]);

function isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) return true;

    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
}

function isPrivateIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();
    if (normalized === '::1') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
        return true; // link local
    }
    return false;
}

function isPrivateIp(ip: string): boolean {
    const version = net.isIP(ip);
    if (version === 4) return isPrivateIPv4(ip);
    if (version === 6) return isPrivateIPv6(ip);
    return true;
}

export async function validateUrlForServerFetch(rawUrl: string): Promise<{ valid: true; url: URL } | { valid: false; reason: string }> {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(rawUrl);
    } catch {
        return { valid: false, reason: 'Invalid URL format' };
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { valid: false, reason: 'Invalid URL protocol' };
    }

    if (parsedUrl.username || parsedUrl.password) {
        return { valid: false, reason: 'URLs with credentials are not allowed' };
    }

    if (parsedUrl.port && !['80', '443'].includes(parsedUrl.port)) {
        return { valid: false, reason: 'Non-standard ports are not allowed' };
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.local')) {
        return { valid: false, reason: 'Host is not allowed' };
    }

    const directIpVersion = net.isIP(hostname);
    if (directIpVersion !== 0) {
        if (isPrivateIp(hostname)) {
            return { valid: false, reason: 'Private or loopback addresses are not allowed' };
        }
        return { valid: true, url: parsedUrl };
    }

    try {
        const resolved = await dns.lookup(hostname, { all: true, verbatim: true });
        if (!resolved.length) {
            return { valid: false, reason: 'Hostname could not be resolved' };
        }

        for (const record of resolved) {
            if (isPrivateIp(record.address)) {
                return { valid: false, reason: 'Host resolves to a private or loopback address' };
            }
        }
    } catch {
        return { valid: false, reason: 'Hostname resolution failed' };
    }

    return { valid: true, url: parsedUrl };
}

export async function fetchWithSafeRedirects(
    rawUrl: string,
    init: RequestInit,
    maxRedirects = 3
): Promise<Response> {
    let nextUrl = rawUrl;

    for (let i = 0; i <= maxRedirects; i += 1) {
        const validation = await validateUrlForServerFetch(nextUrl);
        if (!validation.valid) {
            throw new Error(`Unsafe redirect target: ${validation.reason}`);
        }

        const response = await fetch(validation.url.toString(), { ...init, redirect: 'manual' });
        const isRedirect = response.status >= 300 && response.status < 400;
        if (!isRedirect) {
            return response;
        }

        const location = response.headers.get('location');
        if (!location) {
            throw new Error('Redirect response missing Location header');
        }

        nextUrl = new URL(location, validation.url).toString();
    }

    throw new Error('Too many redirects');
}
