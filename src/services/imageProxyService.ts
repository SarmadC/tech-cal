import { createHash } from 'node:crypto';

import * as Sentry from '@sentry/nextjs';

import { fetchWithSafeRedirects } from '@/lib/ssrfProtection';
import { imageExtFromMimeType, sanitizeStoragePath } from '@/lib/storagePathUtils';
import type { SupabaseClientType } from '@/types';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/svg+xml',
]);

export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
    if (!url?.trim()) return false;
    try {
        const parsed = new URL(url);
        return (
            parsed.hostname.endsWith('.supabase.co') &&
            parsed.pathname.includes('/storage/v1/object/public/')
        );
    } catch {
        return false;
    }
}

// Produces a deterministic, filesystem-safe path segment from a source URL.
export function urlStorageKey(prefix: string, sourceUrl: string): string {
    const hash = createHash('sha256')
        .update(sourceUrl.trim().toLowerCase())
        .digest('hex')
        .slice(0, 12);
    return `${prefix}/${hash}`;
}

// Downloads an external image and uploads it to Supabase Storage.
// Returns the public Supabase URL on success, null on any failure.
// Callers should fall back to the original URL when null is returned.
export async function proxyImageToStorage(params: {
    sourceUrl: string;
    bucket: string;
    storagePath: string; // path without extension, e.g. "events/abc123def456"
    supabaseClient: SupabaseClientType;
}): Promise<string | null> {
    const { sourceUrl, bucket, storagePath, supabaseClient } = params;

    if (isSupabaseStorageUrl(sourceUrl)) {
        return sourceUrl;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        let response: Response;
        try {
            response = await fetchWithSafeRedirects(sourceUrl, {
                method: 'GET',
                headers: { Accept: 'image/*,*/*;q=0.8' },
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            return null;
        }

        const rawContentType = response.headers.get('content-type') ?? '';
        const contentType = rawContentType.split(';')[0].trim().toLowerCase();

        if (!SUPPORTED_TYPES.has(contentType)) {
            return null;
        }

        const contentLength = Number(response.headers.get('content-length') ?? '0');
        if (contentLength > MAX_IMAGE_BYTES) {
            return null;
        }

        const blob = await response.blob();
        if (blob.size === 0 || blob.size > MAX_IMAGE_BYTES) {
            return null;
        }

        const filePath = sanitizeStoragePath(`${storagePath}.${imageExtFromMimeType(contentType)}`);

        const { error: uploadError } = await supabaseClient.storage
            .from(bucket)
            .upload(filePath, blob, {
                cacheControl: '31536000',
                contentType,
                upsert: true,
            });

        if (uploadError) {
            return null;
        }

        const { data: urlData } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
        return urlData.publicUrl;
    } catch (error) {
        Sentry.captureException(error, {
            extra: { function: 'proxyImageToStorage', sourceUrl, bucket, storagePath },
            level: 'warning',
        });
        return null;
    }
}
