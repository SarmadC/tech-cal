/**
 * API Route: Fetch Image from URL (Proxy)
 * 
 * Fetches an image from an external URL server-side to bypass CSP restrictions.
 * Returns the image as a blob that can be uploaded.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import { fetchWithSafeRedirects, validateUrlForServerFetch } from '@/lib/ssrfProtection';

function buildImageRequestHeaders(imageUrl: string, includeDocumentContext = false): HeadersInit {
    const imageOrigin = new URL(imageUrl).origin;

    return {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': `${imageOrigin}/`,
        'Origin': imageOrigin,
        ...(includeDocumentContext
            ? {
                  'Sec-Fetch-Dest': 'document',
                  'Sec-Fetch-Mode': 'navigate',
                  'Sec-Fetch-Site': 'same-origin',
                  'Upgrade-Insecure-Requests': '1',
              }
            : {
                  'Sec-Fetch-Dest': 'image',
                  'Sec-Fetch-Mode': 'no-cors',
                  'Sec-Fetch-Site': 'same-origin',
              }),
    };
}

async function fetchImageWithFallbacks(imageUrl: string, signal: AbortSignal): Promise<Response> {
    const attempts: Array<HeadersInit> = [
        buildImageRequestHeaders(imageUrl),
        buildImageRequestHeaders(imageUrl, true),
        {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Referer': `${new URL(imageUrl).origin}/`,
        },
    ];

    let lastResponse: Response | null = null;

    for (const headers of attempts) {
        const response = await fetchWithSafeRedirects(imageUrl, {
            headers,
            signal,
        });

        if (response.ok) {
            return response;
        }

        lastResponse = response;

        if (response.status !== 403) {
            return response;
        }
    }

    if (lastResponse) {
        return lastResponse;
    }

    throw new Error('Failed to fetch image');
}

function normalizeImageMimeType(mimeType?: string | null): string {
    const normalized = (mimeType || '').split(';')[0].trim().toLowerCase();

    if (normalized === 'image/pjpeg') return 'image/jpeg';
    if (normalized === 'image/x-png') return 'image/png';
    if (normalized === 'image/svg') return 'image/svg+xml';

    return normalized;
}

function getExtensionForMimeType(mimeType: string): string {
    switch (mimeType) {
        case 'image/png':
            return 'png';
        case 'image/jpeg':
        case 'image/jpg':
            return 'jpg';
        case 'image/svg+xml':
            return 'svg';
        case 'image/webp':
            return 'webp';
        case 'image/avif':
            return 'avif';
        case 'image/x-icon':
        case 'image/vnd.microsoft.icon':
            return 'ico';
        default:
            return '';
    }
}

function getFilenameForContentType(imageUrl: string, contentType: string): string {
    const rawName = imageUrl.split('/').pop()?.split('?')[0] || 'image';
    const baseName = rawName.replace(/\.[^.]+$/, '');
    const extension = getExtensionForMimeType(contentType);

    if (!extension) return rawName;

    return `${baseName}.${extension}`;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { imageUrl } = body;

        if (!imageUrl || typeof imageUrl !== 'string') {
            return NextResponse.json({ error: 'Missing required field: imageUrl' }, { status: 400 });
        }

        const validation = await validateUrlForServerFetch(imageUrl);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.reason }, { status: 400 });
        }

        // Fetch the image server-side (bypasses CSP)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const response = await fetchImageWithFallbacks(imageUrl, controller.signal);

            clearTimeout(timeoutId);

            if (!response.ok) {
                return NextResponse.json(
                    { error: `Failed to fetch image: HTTP ${response.status}` },
                    { status: 400 }
                );
            }

            const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
            
            // Check Content-Length if available
            const contentLengthHeader = response.headers.get('content-length');
            if (contentLengthHeader) {
                const contentLength = parseInt(contentLengthHeader, 10);
                if (contentLength > MAX_IMAGE_SIZE) {
                    return NextResponse.json(
                        { error: 'Image too large. Maximum size is 5MB.' },
                        { status: 400 }
                    );
                }
            }

            if (!response.body) {
                return NextResponse.json(
                    { error: 'Empty response body' },
                    { status: 400 }
                );
            }

            const chunks: Uint8Array[] = [];
            let totalBytes = 0;

            // Handle both Web Streams and Node Streams
            if ('getReader' in response.body) {
                const reader = response.body.getReader();
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        if (value) {
                            totalBytes += value.length;
                            if (totalBytes > MAX_IMAGE_SIZE) {
                                await reader.cancel('File size exceeds limit').catch(() => {});
                                return NextResponse.json(
                                    { error: 'Image too large. Maximum size is 5MB.' },
                                    { status: 400 }
                                );
                            }
                            chunks.push(value);
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            } else {
                // Async iterator fallback for Node streams
                for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
                    totalBytes += chunk.length;
                    if (totalBytes > MAX_IMAGE_SIZE) {
                        return NextResponse.json(
                            { error: 'Image too large. Maximum size is 5MB.' },
                            { status: 400 }
                        );
                    }
                    chunks.push(chunk);
                }
            }

            // Validate image size
            if (totalBytes === 0) {
                return NextResponse.json(
                    { error: 'Fetched image is empty (0 bytes)' },
                    { status: 400 }
                );
            }

            // Validate content type
            const contentType = normalizeImageMimeType(
                response.headers.get('content-type') || 'image/png'
            );
            if (!contentType.startsWith('image/') && !contentType.includes('svg')) {
                console.warn('Content type may not be an image:', contentType);
            }

            // Combine chunks into a single Buffer
            let offset = 0;
            const combinedBuffer = new Uint8Array(totalBytes);
            for (const chunk of chunks) {
                combinedBuffer.set(chunk, offset);
                offset += chunk.length;
            }
            
            const base64 = Buffer.from(combinedBuffer).toString('base64');

            if (!base64 || base64.length === 0) {
                return NextResponse.json(
                    { error: 'Failed to encode image data' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                imageData: base64,
                contentType,
                filename: getFilenameForContentType(imageUrl, contentType),
            });
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
                return NextResponse.json({ error: 'Request timeout' }, { status: 408 });
            }
            return NextResponse.json(
                { error: `Failed to fetch image: ${err instanceof Error ? err.message : 'Unknown error'}` },
                { status: 400 }
            );
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('Error fetching image:', {
            message: errorMessage,
            stack: errorStack,
            error,
        });
        return NextResponse.json(
            { error: `Internal server error: ${errorMessage}` },
            { status: 500 }
        );
    }
}
