/**
 * DOM utility functions for safe element ID generation and manipulation
 */

/**
 * Generate a safe DOM ID from a string
 * Removes special characters, normalizes spaces, and ensures valid ID format
 */
export function generateSafeId(input: string, prefix?: string): string {
  // Remove special characters and normalize whitespace
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Ensure ID starts with a letter (add prefix if needed)
  const safeId = normalized.match(/^[a-z]/) ? normalized : `id-${normalized}`;

  return prefix ? `${prefix}-${safeId}` : safeId;
}

/**
 * Generate aria-labelledby ID for a section
 */
export function generateSectionId(title: string): string {
  return generateSafeId(title, 'section');
}

/**
 * Generate aria-describedby ID for a section description
 */
export function generateSectionDescId(title: string): string {
  return generateSafeId(title, 'section') + '-desc';
}