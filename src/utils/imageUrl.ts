/**
 * Return a safe image src for next/image.
 * Accept only absolute http(s) URLs or root-relative paths.
 * Normalize remote URLs to HTTPS so they satisfy Next image policies.
 */
export function getSafeImageSrc(src?: string | null): string | null {
  if (!src) return null;

  const value = src.trim();
  if (!value) return null;

  if (value.startsWith('/')) return value;

  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      if (parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
      }
      return parsed.toString();
    }
  } catch {
    // Intentionally ignore malformed URLs and return null below.
  }

  return null;
}

export function appendImageVersion(src: string, version?: string | null): string {
  if (!version) return src;

  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}v=${encodeURIComponent(version)}`;
}

export function getVersionedImageSrc(src?: string | null, version?: string | null): string | null {
  const safeSrc = getSafeImageSrc(src);
  if (!safeSrc) return null;

  return appendImageVersion(safeSrc, version);
}

type BrowserSafeImageOptions = {
  width?: number;
  quality?: number;
};

const NEXT_ALLOWED_IMAGE_WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 384,
  640, 750, 828, 1080, 1200, 1920, 2048, 3840,
] as const;

function normalizeNextImageWidth(width: number): number {
  const requestedWidth = Math.max(16, Math.round(width));
  return NEXT_ALLOWED_IMAGE_WIDTHS.find((candidate) => candidate >= requestedWidth)
    ?? NEXT_ALLOWED_IMAGE_WIDTHS[NEXT_ALLOWED_IMAGE_WIDTHS.length - 1];
}

function isSvgImageUrl(src: string): boolean {
  try {
    const parsed = new URL(src, 'https://kure-cal.local');
    return parsed.pathname.toLowerCase().endsWith('.svg');
  } catch {
    return src.toLowerCase().includes('.svg');
  }
}

/**
 * Route remote images through Next's same-origin optimizer so browsers like Chrome
 * do not hotlink external avatar URLs directly.
 */
export function getBrowserSafeImageSrc(
  src?: string | null,
  { width = 96, quality = 75 }: BrowserSafeImageOptions = {}
): string | null {
  const safeSrc = getSafeImageSrc(src);
  if (!safeSrc) return null;

  if (safeSrc.startsWith('/')) {
    return safeSrc;
  }

  // Remote SVGs are safer to render directly than to push through Next's optimizer.
  if (isSvgImageUrl(safeSrc)) {
    return safeSrc;
  }

  const normalizedWidth = normalizeNextImageWidth(width);
  const normalizedQuality = Math.min(100, Math.max(1, Math.round(quality)));
  return `/_next/image?url=${encodeURIComponent(safeSrc)}&w=${normalizedWidth}&q=${normalizedQuality}`;
}
