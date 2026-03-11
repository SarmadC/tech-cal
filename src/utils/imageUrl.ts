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
