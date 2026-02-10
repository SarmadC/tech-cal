/**
 * API Route: Fetch Image from URL (Proxy)
 * 
 * Fetches an image from an external URL server-side to bypass CSP restrictions.
 * Returns the image as a blob that can be uploaded.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';

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

        // Validate URL format
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(imageUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        // Fetch the image server-side (bypasses CSP)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const response = await fetch(imageUrl, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'image',
                    'Sec-Fetch-Mode': 'no-cors',
                    'Sec-Fetch-Site': 'cross-site',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return NextResponse.json(
                    { error: `Failed to fetch image: HTTP ${response.status}` },
                    { status: 400 }
                );
            }

            // Get the image as a blob
            const blob = await response.blob();
            
            // Validate blob size
            if (blob.size === 0) {
                return NextResponse.json(
                    { error: 'Fetched image is empty (0 bytes)' },
                    { status: 400 }
                );
            }

            // Validate blob type
            const contentType = response.headers.get('content-type') || blob.type || 'image/png';
            if (!contentType.startsWith('image/') && !contentType.includes('svg')) {
                console.warn('Content type may not be an image:', contentType);
            }

            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');

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
                filename: imageUrl.split('/').pop()?.split('?')[0] || 'logo.png',
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

