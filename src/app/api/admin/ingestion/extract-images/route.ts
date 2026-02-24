/**
 * API Route: Extract Images from URL
 *
 * Fetches a web page and extracts image URLs for logo selection.
 * Also supports direct image URLs (SVG, PNG, JPG, etc.).
 * Uses server-side fetch to parse HTML and find <img> tags, or returns direct image URLs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import { fetchWithSafeRedirects, validateUrlForServerFetch } from '@/lib/ssrfProtection';

// Use Node.js runtime for better fetch support and external URL access
export const runtime = 'nodejs';

interface ExtractedImage {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
}

/**
 * Extract absolute URL from potentially relative src
 */
function resolveUrl(src: string, baseUrl: string): string | null {
    try {
        // Handle data URLs - skip them
        if (src.startsWith('data:')) {
            return null;
        }

        // Handle protocol-relative URLs
        if (src.startsWith('//')) {
            return `https:${src}`;
        }

        // Handle absolute URLs
        if (src.startsWith('http://') || src.startsWith('https://')) {
            return src;
        }

        // Handle relative URLs
        const base = new URL(baseUrl);
        return new URL(src, base).toString();
    } catch {
        return null;
    }
}

/**
 * Check if URL is a direct image URL (not an HTML page)
 */
function isDirectImageUrl(url: string): boolean {
    const lower = url.toLowerCase();
    const imageExtensions = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.avif'];
    // Check if URL ends with image extension (ignoring query params)
    const urlWithoutQuery = lower.split('?')[0];
    return imageExtensions.some((ext) => urlWithoutQuery.endsWith(ext));
}

/**
 * Check if URL is likely a logo or icon based on path/filename
 */
function isLikelyLogo(url: string): boolean {
    const lower = url.toLowerCase();
    const logoPatterns = [
        '/logo',
        'logo.',
        'logo-',
        'logo_',
        '/icon',
        'icon.',
        'brand',
        'favicon',
        '/img/logo',
        '/images/logo',
        '/assets/logo',
    ];
    return logoPatterns.some((pattern) => lower.includes(pattern));
}

/**
 * Score an image based on likelihood of being a logo
 */
function scoreImage(img: ExtractedImage): number {
    let score = 0;

    // Prefer images with logo-related paths
    if (isLikelyLogo(img.src)) {
        score += 50;
    }

    // Prefer SVG (vector logos)
    if (img.src.toLowerCase().endsWith('.svg')) {
        score += 30;
    }

    // Prefer PNG (often used for logos with transparency)
    if (img.src.toLowerCase().endsWith('.png')) {
        score += 10;
    }

    // Prefer square or horizontal aspect ratios (common for logos)
    if (img.width && img.height) {
        const ratio = img.width / img.height;
        if (ratio >= 0.8 && ratio <= 1.2) {
            // Square-ish
            score += 20;
        } else if (ratio > 1.2 && ratio <= 4) {
            // Horizontal
            score += 15;
        }

        // Prefer reasonable sizes (not tiny icons, not huge banners)
        const area = img.width * img.height;
        if (area >= 1000 && area <= 100000) {
            score += 10;
        }
    }

    // Prefer images with alt text containing logo keywords
    if (img.alt) {
        const altLower = img.alt.toLowerCase();
        if (altLower.includes('logo') || altLower.includes('brand') || altLower.includes('icon')) {
            score += 25;
        }
    }

    return score;
}

/**
 * Parse HTML and extract image elements
 */
function extractImagesFromHtml(html: string, baseUrl: string): ExtractedImage[] {
    const images: ExtractedImage[] = [];

    // Match <img> tags with various attribute formats
    const imgRegex = /<img[^>]+>/gi;
    const matches = html.match(imgRegex) || [];

    for (const imgTag of matches) {
        // Extract src attribute
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        if (!srcMatch) continue;

        const rawSrc = srcMatch[1];
        const resolvedSrc = resolveUrl(rawSrc, baseUrl);
        if (!resolvedSrc) continue;

        // Extract alt attribute
        const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1] : undefined;

        // Extract width attribute
        const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
        const width = widthMatch ? parseInt(widthMatch[1], 10) : undefined;

        // Extract height attribute
        const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
        const height = heightMatch ? parseInt(heightMatch[1], 10) : undefined;

        images.push({ src: resolvedSrc, alt, width, height });
    }

    // Also extract from srcset attributes (for responsive images)
    const srcsetRegex = /srcset=["']([^"']+)["']/gi;
    let srcsetMatch;
    while ((srcsetMatch = srcsetRegex.exec(html)) !== null) {
        const srcsetValue = srcsetMatch[1];
        const srcsetParts = srcsetValue.split(',');
        for (const part of srcsetParts) {
            const src = part.trim().split(/\s+/)[0];
            const resolvedSrc = resolveUrl(src, baseUrl);
            if (resolvedSrc && !images.some((img) => img.src === resolvedSrc)) {
                images.push({ src: resolvedSrc });
            }
        }
    }

    // Extract from og:image and other meta tags
    const metaImageRegex = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi;
    let metaMatch;
    while ((metaMatch = metaImageRegex.exec(html)) !== null) {
        const resolvedSrc = resolveUrl(metaMatch[1], baseUrl);
        if (resolvedSrc && !images.some((img) => img.src === resolvedSrc)) {
            images.push({ src: resolvedSrc, alt: 'Open Graph Image' });
        }
    }

    // Also check reverse order meta tags
    const metaImageRegex2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi;
    while ((metaMatch = metaImageRegex2.exec(html)) !== null) {
        const resolvedSrc = resolveUrl(metaMatch[1], baseUrl);
        if (resolvedSrc && !images.some((img) => img.src === resolvedSrc)) {
            images.push({ src: resolvedSrc, alt: 'Open Graph Image' });
        }
    }

    return images;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'Missing required field: url' }, { status: 400 });
        }

        const validation = await validateUrlForServerFetch(url);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.reason }, { status: 400 });
        }

        // Check if URL is a direct image URL
        if (isDirectImageUrl(url)) {
            // Verify the image URL is accessible (use HEAD to avoid downloading large images)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout (increased from 10s)

            try {
                // Try HEAD first (lightweight check)
                let response = await fetchWithSafeRedirects(url, {
                    method: 'HEAD',
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

                // If HEAD fails (405 Method Not Allowed or 404), try GET as fallback
                if (!response.ok && (response.status === 405 || response.status === 404)) {
                    response = await fetchWithSafeRedirects(url, {
                        method: 'GET',
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
                }

                clearTimeout(timeoutId);

                // If still not OK, return error
                if (!response.ok) {
                    return NextResponse.json(
                        { error: `Failed to fetch image: HTTP ${response.status} ${response.statusText}` },
                        { status: 400 }
                    );
                }

                // Check if response is actually an image
                const contentType = response.headers.get('content-type') || '';
                if (!contentType.startsWith('image/') && !contentType.includes('svg')) {
                    return NextResponse.json(
                        { error: 'URL does not appear to be an image' },
                        { status: 400 }
                    );
                }

                // Return the direct image URL
                const directImage: ExtractedImage = {
                    src: url,
                    alt: 'Direct image URL',
                };

                return NextResponse.json({
                    success: true,
                    images: [directImage],
                    total: 1,
                });
            } catch (err) {
                clearTimeout(timeoutId);
                if (err instanceof Error && err.name === 'AbortError') {
                    return NextResponse.json({ error: 'Request timeout - the server took too long to respond' }, { status: 408 });
                }
                
                // Provide more specific error messages
                let errorMessage = 'Failed to fetch image';
                if (err instanceof Error) {
                    const errMsg = err.message.toLowerCase();
                    if (errMsg.includes('network') || errMsg.includes('fetch')) {
                        errorMessage = 'Network error: Unable to reach the server. Please check the URL and try again.';
                    } else if (errMsg.includes('certificate') || errMsg.includes('ssl') || errMsg.includes('tls')) {
                        errorMessage = 'SSL/TLS error: The server certificate could not be verified.';
                    } else if (errMsg.includes('dns')) {
                        errorMessage = 'DNS error: Could not resolve the domain name.';
                    } else {
                        errorMessage = `Failed to fetch image: ${err.message}`;
                    }
                }
                
                return NextResponse.json(
                    { error: errorMessage },
                    { status: 400 }
                );
            }
        }

        // Not a direct image URL - fetch and parse HTML
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout (increased from 10s)

        let html: string;
        try {
            const response = await fetchWithSafeRedirects(url, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'max-age=0',
                    'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                    'Connection': 'keep-alive',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return NextResponse.json(
                    { error: `Failed to fetch URL: HTTP ${response.status} ${response.statusText}` },
                    { status: 400 }
                );
            }

            html = await response.text();
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
                return NextResponse.json({ error: 'Request timeout - the server took too long to respond' }, { status: 408 });
            }
            
            // Provide more specific error messages
            let errorMessage = 'Failed to fetch URL';
            if (err instanceof Error) {
                const errMsg = err.message.toLowerCase();
                // Log the full error for debugging (server-side only)
                console.error('Failed to fetch URL:', url, {
                    message: err.message,
                    name: err.name,
                    stack: err.stack,
                });
                
                if (errMsg.includes('network') || errMsg.includes('fetch') || errMsg.includes('econnrefused') || errMsg.includes('enotfound')) {
                    errorMessage = 'Network error: Unable to reach the server. The server may be blocking automated requests or experiencing connectivity issues. Please verify the URL is accessible and try again.';
                } else if (errMsg.includes('certificate') || errMsg.includes('ssl') || errMsg.includes('tls') || errMsg.includes('cert')) {
                    errorMessage = 'SSL/TLS error: The server certificate could not be verified.';
                } else if (errMsg.includes('dns') || errMsg.includes('getaddrinfo')) {
                    errorMessage = 'DNS error: Could not resolve the domain name. Please check the URL is correct.';
                } else if (errMsg.includes('timeout') || errMsg.includes('timed out')) {
                    errorMessage = 'Request timeout: The server took too long to respond.';
                } else {
                    errorMessage = `Failed to fetch URL: ${err.message}`;
                }
            }
            
            return NextResponse.json(
                { error: errorMessage },
                { status: 400 }
            );
        }

        // Extract images from HTML
        const images = extractImagesFromHtml(html, url);

        // Deduplicate by src
        const uniqueImages = Array.from(new Map(images.map((img) => [img.src, img])).values());

        // Score and sort by likelihood of being a logo
        const scoredImages = uniqueImages.map((img) => ({
            ...img,
            score: scoreImage(img),
        }));

        scoredImages.sort((a, b) => b.score - a.score);

        // Return top results
        const topImages = scoredImages.slice(0, 20).map(({ score: _score, ...img }) => img);

        return NextResponse.json({
            success: true,
            images: topImages,
            total: uniqueImages.length,
        });
    } catch (error) {
        console.error('Error extracting images:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
