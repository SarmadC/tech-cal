/**
 * Generates SEO-friendly URL slug from event title and ID
 * Format: {title-slug}--{full-uuid}
 * Uses double-dash as separator since single dash appears in UUIDs
 * 
 * @example
 * generateEventSlug("React Summit 2024", "550e8400-e29b-41d4-a716-446655440000")
 * // "react-summit-2024--550e8400-e29b-41d4-a716-446655440000"
 */
export function generateEventSlug(title: string, id: string): string {
  const titleSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')      // Remove special chars
    .replace(/[\s_]+/g, '-')       // Spaces to hyphens
    .replace(/-{3,}/g, '--')       // 3+ hyphens to double-dash
    .replace(/^-+|-+$/g, '');      // Trim hyphens
  
  return `${titleSlug}--${id}`;
}

/**
 * Extracts event ID from slug
 * 
 * @example
 * extractIdFromSlug("react-summit-2024--550e8400-e29b-41d4-a716-446655440000")
 * // "550e8400-e29b-41d4-a716-446655440000"
 */
export function extractIdFromSlug(slug: string): string {
  // If already a UUID, return as-is
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
    return slug;
  }
  
  // Split by double-dash and get last part (the UUID)
  const parts = slug.split('--');
  if (parts.length > 1) {
    const id = parts[parts.length - 1];
    
    // Match standard UUID at the start of the string
    const match = id.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (match) {
      return match[1];
    }
  }
  
  // Fallback to original
  return slug;
}

