/**
 * Extract city from a location string (e.g., "San Francisco, CA, USA" -> "San Francisco")
 */
export function extractCityFromLocation(location: string): string | undefined {
  if (!location) return undefined;
  const parts = location.split(',').map((p) => p.trim());
  return parts[0] || undefined;
}

/**
 * Extract country from a location string (e.g., "San Francisco, CA, USA" -> "USA")
 */
export function extractCountryFromLocation(location: string): string | undefined {
  if (!location) return undefined;
  const parts = location.split(',').map((p) => p.trim());
  return parts[parts.length - 1] || undefined;
}
