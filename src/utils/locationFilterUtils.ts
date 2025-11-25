/**
 * Location Filter Utilities
 * 
 * Provides helper functions for filtering events by location using normalized fields.
 * Supports fuzzy matching across city, state, country, and fallback to exact location match.
 */

// Type alias for Supabase query builder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventQueryBuilder = any;

/**
 * Builds a Supabase query filter for location matching
 * Uses normalized fields (city, state, country) with fallback to exact location match
 * 
 * This enables fuzzy matching:
 * - "San Francisco" matches "San Francisco, CA"
 * - "California" matches all events in California
 * - "USA" matches all US events
 * - Still matches exact location strings for backward compatibility
 * 
 * @param query - Supabase query builder
 * @param locations - Array of location strings to match (can be city, state, country, or exact location)
 * @returns Query builder with location filters applied
 */
export function applyLocationFilter(
  query: EventQueryBuilder,
  locations: string[] | undefined
): EventQueryBuilder {
  if (!locations || locations.length === 0) {
    return query;
  }

  // For each location, create OR conditions that match:
  // - location_city (normalized city)
  // - location_state (normalized state)
  // - location_country (normalized country)
  // - location (original location text as fallback)
  const conditions = locations
    .filter(loc => loc && loc.trim().length > 0)
    .map(loc => {
      const normalized = loc.trim();
      // Use ILIKE for case-insensitive partial matching
      // Each location can match any of the normalized fields or the original location
      return `location_city.ilike.%${normalized}%,location_state.ilike.%${normalized}%,location_country.ilike.%${normalized}%,location.ilike.%${normalized}%`;
    });

  if (conditions.length === 0) {
    return query;
  }

  // If multiple locations provided, they should be OR'd together
  // Each location matches if ANY of its conditions are true
  const orCondition = conditions.join(',');

  return query.or(orCondition);
}

/**
 * Alternative: Apply location filter with exact matching on normalized fields
 * Useful when you want to match exact city/state/country values
 * 
 * @param query - Supabase query builder
 * @param locations - Array of location strings
 * @param matchType - 'fuzzy' (default) or 'exact'
 * @returns Query builder with location filters applied
 */
export function applyLocationFilterExact(
  query: EventQueryBuilder,
  locations: string[] | undefined,
  matchType: 'fuzzy' | 'exact' = 'fuzzy'
): EventQueryBuilder {
  if (!locations || locations.length === 0) {
    return query;
  }

  const validLocations = locations.filter(loc => loc && loc.trim().length > 0);
  if (validLocations.length === 0) {
    return query;
  }

  if (matchType === 'exact') {
    // Exact matching on normalized fields
    const cityMatches = validLocations.filter(loc => {
      // Heuristic: if it's a single word, likely a city
      return loc.trim().split(/\s+/).length === 1;
    });
    const stateMatches = validLocations.filter(loc => {
      // Heuristic: if it's a known state name or abbreviation
      return loc.trim().length <= 2 || loc.includes(' ');
    });
    const countryMatches = validLocations.filter(loc => {
      // Heuristic: if it's a country name
      return loc.length > 2;
    });

    const conditions: string[] = [];
    
    if (cityMatches.length > 0) {
      conditions.push(`location_city.in.(${cityMatches.join(',')})`);
    }
    if (stateMatches.length > 0) {
      conditions.push(`location_state.in.(${stateMatches.join(',')})`);
    }
    if (countryMatches.length > 0) {
      conditions.push(`location_country.in.(${countryMatches.join(',')})`);
    }
    // Fallback to original location field
    if (validLocations.length > 0) {
      conditions.push(`location.in.(${validLocations.join(',')})`);
    }

    if (conditions.length > 0) {
      return query.or(conditions.join(','));
    }
  }

  // Default to fuzzy matching
  return applyLocationFilter(query, locations);
}


