import { NextRequest } from 'next/server';
import { SITE_URL } from '@/config/site';

function normalizeOrigin(value: string): string | null {
    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
}

function normalizeHostToOrigin(host: string, proto: string): string | null {
    const firstHost = host.split(',')[0]?.trim();
    if (!firstHost || firstHost.includes('/') || firstHost.includes(' ')) {
        return null;
    }

    return normalizeOrigin(`${proto}://${firstHost}`);
}

export function getAllowedOrigins(): Set<string> {
    const allowed = new Set<string>();
    const add = (value: string | undefined | null) => {
        if (!value) return;
        const normalized = normalizeOrigin(value);
        if (normalized) {
            allowed.add(normalized);
        }
    };

    add(SITE_URL);
    add(process.env.NEXT_PUBLIC_SITE_URL);
    add(process.env.SITE_URL);

    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        const value = process.env.NEXT_PUBLIC_VERCEL_URL.startsWith('http')
            ? process.env.NEXT_PUBLIC_VERCEL_URL
            : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
        add(value);
    }

    if (process.env.VERCEL_URL) {
        add(`https://${process.env.VERCEL_URL}`);
    }

    const extraOrigins = process.env.AUTH_ALLOWED_ORIGINS;
    if (extraOrigins) {
        extraOrigins
            .split(',')
            .map((origin) => origin.trim())
            .forEach(add);
    }

    add('http://localhost:3000');
    add('http://127.0.0.1:3000');

    return allowed;
}

export function getClientIdentifier(request: NextRequest): string | null {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const firstIp = forwardedFor.split(',')[0]?.trim();
        if (firstIp) return firstIp;
    }

    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;

    return null;
}

export function validateSameOriginRequest(request: NextRequest): string | null {
    const allowedOrigins = getAllowedOrigins();
    const requestOrigin = normalizeOrigin(request.url);
    if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
        return 'Untrusted request origin';
    }

    const origin = request.headers.get('origin');
    if (origin) {
        const normalizedOrigin = normalizeOrigin(origin);
        if (!normalizedOrigin || normalizedOrigin !== requestOrigin || !allowedOrigins.has(normalizedOrigin)) {
            return 'Cross-site requests are not allowed';
        }
        return null;
    }

    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto =
        (request.headers.get('x-forwarded-proto') || 'https').split(',')[0]?.trim() || 'https';
    const forwardedOrigin = forwardedHost ? normalizeHostToOrigin(forwardedHost, forwardedProto) : null;
    if (forwardedOrigin && forwardedOrigin !== requestOrigin) {
        return 'Cross-site requests are not allowed';
    }

    const secFetchSite = request.headers.get('sec-fetch-site');
    if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
        return 'Cross-site requests are not allowed';
    }

    return null;
}
