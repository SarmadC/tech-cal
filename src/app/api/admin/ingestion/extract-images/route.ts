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

type ImageContext = 'logo' | 'event_image';

interface ExtractedImage {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    source?: string; // tracks where the image was found (e.g. 'og:image', 'json-ld', 'link-icon')
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
 * Check if URL path/alt contains event-banner-related keywords
 */
function isLikelyEventImage(url: string, alt?: string): boolean {
    const lower = url.toLowerCase() + ' ' + (alt || '').toLowerCase();
    const patterns = ['hero', 'banner', 'header', 'cover', 'featured', 'event-image', 'event_image', 'poster', 'thumbnail'];
    return patterns.some((p) => lower.includes(p));
}

/**
 * Score an image based on context (logo vs event_image)
 */
function scoreImage(img: ExtractedImage, context: ImageContext = 'logo'): number {
    if (context === 'event_image') {
        return scoreEventImage(img);
    }
    return scoreLogoImage(img);
}

function scoreLogoImage(img: ExtractedImage): number {
    let score = 0;

    // Prefer images with logo-related paths
    if (isLikelyLogo(img.src)) {
        score += 50;
    }

    // Link icons (apple-touch-icon, favicon) are strong logo signals
    if (img.source === 'link-icon') {
        score += 40;
    }

    // Favicon path
    if (img.src.toLowerCase().includes('favicon')) {
        score += 20;
    }

    // JSON-LD logo field
    if (img.source === 'json-ld-logo') {
        score += 60;
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
            score += 20;
        } else if (ratio > 1.2 && ratio <= 4) {
            score += 15;
        }

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

function scoreEventImage(img: ExtractedImage): number {
    let score = 0;

    // og:image / twitter:image are the strongest event image signals
    if (img.source === 'og:image' || img.source === 'twitter:image') {
        score += 80;
    }

    // JSON-LD image / thumbnailUrl
    if (img.source === 'json-ld-image' || img.source === 'json-ld-thumbnail') {
        score += 70;
    }

    // Large dimensions suggest a banner/hero
    if (img.width && img.width >= 600) {
        score += 30;
    }

    // Banner aspect ratio (1.5:1 to 3:1)
    if (img.width && img.height && img.height > 0) {
        const ratio = img.width / img.height;
        if (ratio >= 1.5 && ratio <= 3) {
            score += 25;
        }
    }

    // Header/hero/banner keywords in path or alt
    if (isLikelyEventImage(img.src, img.alt)) {
        score += 20;
    }

    // Deprioritize logo-related paths when looking for event images
    if (isLikelyLogo(img.src)) {
        score -= 20;
    }

    // Penalize tiny images
    if (img.width && img.width < 200) {
        score -= 30;
    }
    if (img.height && img.height < 200) {
        score -= 30;
    }

    return score;
}

/**
 * Helper to add an image if not already present
 */
function addIfNew(images: ExtractedImage[], img: ExtractedImage): void {
    if (!images.some((existing) => existing.src === img.src)) {
        images.push(img);
    }
}

/**
 * Extract the highest-resolution URL from a srcset value
 */
function getHighestResSrcset(srcsetValue: string, baseUrl: string): string | null {
    const parts = srcsetValue.split(',').map((p) => p.trim()).filter(Boolean);
    let bestSrc: string | null = null;
    let bestDescriptor = 0;

    for (const part of parts) {
        const tokens = part.split(/\s+/);
        const src = tokens[0];
        const descriptor = tokens[1] || '1x';
        const numericValue = parseFloat(descriptor) || 1;
        if (numericValue > bestDescriptor) {
            bestDescriptor = numericValue;
            bestSrc = src;
        }
    }

    return bestSrc ? resolveUrl(bestSrc, baseUrl) : null;
}

/**
 * Parse HTML and extract image elements from multiple sources
 */
function extractImagesFromHtml(html: string, baseUrl: string): ExtractedImage[] {
    const images: ExtractedImage[] = [];

    // 1. Standard <img> tags (src + lazy-load attributes)
    const imgRegex = /<img[^>]+>/gi;
    const imgMatches = html.match(imgRegex) || [];

    for (const imgTag of imgMatches) {
        // Try src, then lazy-load fallbacks
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        const dataSrcMatch = imgTag.match(/data-src=["']([^"']+)["']/i);
        const dataLazySrcMatch = imgTag.match(/data-lazy-src=["']([^"']+)["']/i);
        const dataOriginalMatch = imgTag.match(/data-original=["']([^"']+)["']/i);

        const rawSrc = srcMatch?.[1] || dataSrcMatch?.[1] || dataLazySrcMatch?.[1] || dataOriginalMatch?.[1];
        if (!rawSrc) continue;

        const resolvedSrc = resolveUrl(rawSrc, baseUrl);
        if (!resolvedSrc) continue;

        const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1] : undefined;

        const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
        const width = widthMatch ? parseInt(widthMatch[1], 10) : undefined;

        const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
        const height = heightMatch ? parseInt(heightMatch[1], 10) : undefined;

        addIfNew(images, { src: resolvedSrc, alt, width, height });
    }

    // 2. Srcset attributes (responsive images)
    const srcsetRegex = /srcset=["']([^"']+)["']/gi;
    let srcsetMatch;
    while ((srcsetMatch = srcsetRegex.exec(html)) !== null) {
        const srcsetValue = srcsetMatch[1];
        const srcsetParts = srcsetValue.split(',');
        for (const part of srcsetParts) {
            const src = part.trim().split(/\s+/)[0];
            const resolvedSrc = resolveUrl(src, baseUrl);
            if (resolvedSrc) {
                addIfNew(images, { src: resolvedSrc });
            }
        }
    }

    // 3. <picture><source> elements — pick highest-res from each
    const pictureSourceRegex = /<picture[^>]*>[\s\S]*?<\/picture>/gi;
    const pictureMatches = html.match(pictureSourceRegex) || [];
    for (const pictureBlock of pictureMatches) {
        const sourceRegex = /<source[^>]+srcset=["']([^"']+)["'][^>]*>/gi;
        let sourceMatch;
        while ((sourceMatch = sourceRegex.exec(pictureBlock)) !== null) {
            const bestSrc = getHighestResSrcset(sourceMatch[1], baseUrl);
            if (bestSrc) {
                addIfNew(images, { src: bestSrc, source: 'picture-source' });
            }
        }
    }

    // 4. og:image and twitter:image meta tags (both attribute orders)
    const metaPatterns = [
        /<meta[^>]+(?:property|name)=["'](og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi,
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](og:image|twitter:image)["']/gi,
    ];
    for (const regex of metaPatterns) {
        let metaMatch;
        while ((metaMatch = regex.exec(html)) !== null) {
            // In pattern 1: group 1 = property, group 2 = content
            // In pattern 2: group 1 = content, group 2 = property
            const isFirstPattern = metaMatch[1].startsWith('og:') || metaMatch[1].startsWith('twitter:');
            const content = isFirstPattern ? metaMatch[2] : metaMatch[1];
            const property = isFirstPattern ? metaMatch[1] : metaMatch[2];
            const resolvedSrc = resolveUrl(content, baseUrl);
            if (resolvedSrc) {
                addIfNew(images, {
                    src: resolvedSrc,
                    alt: property === 'og:image' ? 'Open Graph Image' : 'Twitter Card Image',
                    source: property as string,
                });
            }
        }
    }

    // 5. <link rel="icon|apple-touch-icon|..."> tags
    const linkIconRegex = /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed)["'][^>]*>/gi;
    const linkIconMatches = html.match(linkIconRegex) || [];
    for (const linkTag of linkIconMatches) {
        const hrefMatch = linkTag.match(/href=["']([^"']+)["']/i);
        if (!hrefMatch) continue;
        const resolvedSrc = resolveUrl(hrefMatch[1], baseUrl);
        if (resolvedSrc) {
            const sizesMatch = linkTag.match(/sizes=["'](\d+)x(\d+)["']/i);
            addIfNew(images, {
                src: resolvedSrc,
                alt: 'Site Icon',
                width: sizesMatch ? parseInt(sizesMatch[1], 10) : undefined,
                height: sizesMatch ? parseInt(sizesMatch[2], 10) : undefined,
                source: 'link-icon',
            });
        }
    }
    // Also match reverse attribute order (href before rel)
    const linkIconRegex2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed)["'][^>]*>/gi;
    let linkMatch2;
    while ((linkMatch2 = linkIconRegex2.exec(html)) !== null) {
        const resolvedSrc = resolveUrl(linkMatch2[1], baseUrl);
        if (resolvedSrc) {
            addIfNew(images, { src: resolvedSrc, alt: 'Site Icon', source: 'link-icon' });
        }
    }

    // 6. <meta name="msapplication-TileImage">
    const tileRegex = /<meta[^>]+name=["']msapplication-TileImage["'][^>]+content=["']([^"']+)["']/gi;
    let tileMatch;
    while ((tileMatch = tileRegex.exec(html)) !== null) {
        const resolvedSrc = resolveUrl(tileMatch[1], baseUrl);
        if (resolvedSrc) {
            addIfNew(images, { src: resolvedSrc, alt: 'Tile Image', source: 'link-icon' });
        }
    }

    // 7. Inline style background-image: url(...)
    const bgRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
    let bgMatch;
    while ((bgMatch = bgRegex.exec(html)) !== null) {
        const resolvedSrc = resolveUrl(bgMatch[1], baseUrl);
        if (resolvedSrc) {
            addIfNew(images, { src: resolvedSrc, source: 'css-background' });
        }
    }

    // 8. JSON-LD structured data
    const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jsonLdMatch;
    while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
        try {
            const data = JSON.parse(jsonLdMatch[1]);
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
                // Extract logo
                const logoVal = item.logo;
                const logoUrl = typeof logoVal === 'string' ? logoVal : logoVal?.url;
                if (logoUrl) {
                    const resolved = resolveUrl(logoUrl, baseUrl);
                    if (resolved) addIfNew(images, { src: resolved, alt: 'Organization Logo', source: 'json-ld-logo' });
                }
                // Extract image
                const imgVal = item.image;
                const imgUrls = Array.isArray(imgVal) ? imgVal : [imgVal];
                for (const u of imgUrls) {
                    const imgUrl = typeof u === 'string' ? u : u?.url;
                    if (imgUrl) {
                        const resolved = resolveUrl(imgUrl, baseUrl);
                        if (resolved) addIfNew(images, { src: resolved, alt: 'Structured Data Image', source: 'json-ld-image' });
                    }
                }
                // Extract thumbnailUrl
                if (item.thumbnailUrl) {
                    const resolved = resolveUrl(item.thumbnailUrl, baseUrl);
                    if (resolved) addIfNew(images, { src: resolved, alt: 'Thumbnail', source: 'json-ld-thumbnail' });
                }
            }
        } catch {
            // Invalid JSON-LD, skip
        }
    }

    // 9. Favicon fallback — if no link icons were found, try /favicon.ico
    const hasLinkIcon = images.some((img) => img.source === 'link-icon');
    if (!hasLinkIcon) {
        try {
            const faviconUrl = new URL('/favicon.ico', baseUrl).toString();
            addIfNew(images, { src: faviconUrl, alt: 'Favicon', source: 'link-icon' });
        } catch {
            // Invalid base URL
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
        const { url, context: imageContext } = body as { url?: string; context?: ImageContext };
        const resolvedContext: ImageContext = imageContext === 'event_image' ? 'event_image' : 'logo';

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

        // Score and sort by relevance to the requested context
        const scoredImages = uniqueImages.map((img) => ({
            ...img,
            score: scoreImage(img, resolvedContext),
        }));

        scoredImages.sort((a, b) => b.score - a.score);

        // Return top results (strip internal scoring/source metadata)
        const topImages = scoredImages.slice(0, 20).map(({ score: _score, source: _source, ...img }) => img);

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
