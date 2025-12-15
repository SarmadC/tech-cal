/**
 * Location Scoring Service
 * 
 * Provides location-based relevance scoring for events.
 * Online/hybrid events receive full scores, while in-person events
 * are scored based on geographic proximity to the user.
 */

import { Event } from '@/types';

export interface UserLocation {
  city?: string;
  country?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface EventLocationData {
  location?: string;
  eventFormat?: 'Online' | 'In-person' | 'Hybrid' | null;
  livestreamUrl?: string | null;
  // Structured venue data (from events_with_venue view)
  venueCity?: string | null;
  venueCountry?: string | null;
}

export interface LocationScoreResult {
  score: number; // 0-1
  reason: string;
  isVirtual: boolean;
}

// Country to continent mapping for proximity scoring
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // North America
  'usa': 'north_america',
  'united states': 'north_america',
  'us': 'north_america',
  'canada': 'north_america',
  'mexico': 'north_america',
  
  // Europe
  'uk': 'europe',
  'united kingdom': 'europe',
  'germany': 'europe',
  'france': 'europe',
  'spain': 'europe',
  'italy': 'europe',
  'netherlands': 'europe',
  'belgium': 'europe',
  'switzerland': 'europe',
  'austria': 'europe',
  'sweden': 'europe',
  'norway': 'europe',
  'denmark': 'europe',
  'finland': 'europe',
  'poland': 'europe',
  'czech republic': 'europe',
  'ireland': 'europe',
  'portugal': 'europe',
  'greece': 'europe',
  'hungary': 'europe',
  'romania': 'europe',
  'ukraine': 'europe',
  'russia': 'europe',
  'turkey': 'europe',
  
  // Asia
  'japan': 'asia',
  'china': 'asia',
  'south korea': 'asia',
  'korea': 'asia',
  'taiwan': 'asia',
  'hong kong': 'asia',
  'singapore': 'asia',
  'india': 'asia',
  'thailand': 'asia',
  'vietnam': 'asia',
  'indonesia': 'asia',
  'malaysia': 'asia',
  'philippines': 'asia',
  'pakistan': 'asia',
  'bangladesh': 'asia',
  'uae': 'asia',
  'united arab emirates': 'asia',
  'saudi arabia': 'asia',
  'israel': 'asia',
  
  // Oceania
  'australia': 'oceania',
  'new zealand': 'oceania',
  
  // South America
  'brazil': 'south_america',
  'argentina': 'south_america',
  'chile': 'south_america',
  'colombia': 'south_america',
  'peru': 'south_america',
  'venezuela': 'south_america',
  
  // Africa
  'south africa': 'africa',
  'nigeria': 'africa',
  'egypt': 'africa',
  'kenya': 'africa',
  'morocco': 'africa',
};

// Timezone prefix to continent mapping
const TIMEZONE_TO_CONTINENT: Record<string, string> = {
  'america': 'americas',
  'europe': 'europe',
  'asia': 'asia',
  'australia': 'oceania',
  'pacific': 'oceania',
  'africa': 'africa',
};

/**
 * Location Scoring Service
 */
export class LocationScoringService {
  /**
   * Calculate location relevance score for an event
   * 
   * @param event - The event to score
   * @param userLocation - User's location information
   * @returns LocationScoreResult with score (0-1), reason, and virtual flag
   */
  static calculateLocationScore(
    event: Event | EventLocationData,
    userLocation?: UserLocation | null
  ): LocationScoreResult {
    // Check if event is virtual/online
    const isVirtual = this.isVirtualEvent(event);
    
    if (isVirtual) {
      return {
        score: 1.0,
        reason: 'Online event - accessible from anywhere',
        isVirtual: true,
      };
    }
    
    // If no user location provided, return neutral score
    if (!userLocation) {
      return {
        score: 0.8,
        reason: 'Location not available',
        isVirtual: false,
      };
    }
    
    // Get event location details
    const eventLocation = this.extractEventLocation(event);
    
    if (!eventLocation.city && !eventLocation.country && !eventLocation.locationString) {
      return {
        score: 0.8,
        reason: 'Event location not specified',
        isVirtual: false,
      };
    }
    
    // Check for same city match
    if (this.isSameCity(eventLocation, userLocation)) {
      return {
        score: 1.0,
        reason: `In your city (${userLocation.city})`,
        isVirtual: false,
      };
    }
    
    // Check for same country match
    if (this.isSameCountry(eventLocation, userLocation)) {
      return {
        score: 0.85,
        reason: `In your country (${userLocation.country})`,
        isVirtual: false,
      };
    }
    
    // Check for same continent/region
    if (this.isSameContinent(eventLocation, userLocation)) {
      return {
        score: 0.7,
        reason: 'In your region',
        isVirtual: false,
      };
    }
    
    // Different continent - lower score but not zero
    return {
      score: 0.5,
      reason: 'International event',
      isVirtual: false,
    };
  }
  
  /**
   * Check if an event is virtual/online (accessible from anywhere)
   */
  static isVirtualEvent(event: Event | EventLocationData): boolean {
    // Check eventFormat field
    if (event.eventFormat === 'Online' || event.eventFormat === 'Hybrid') {
      return true;
    }
    
    // Check for livestream URL (indicates online accessibility)
    if (event.livestreamUrl) {
      return true;
    }
    
    // Check location string for virtual indicators
    const location = ('location' in event ? event.location : undefined)?.toLowerCase() || '';
    const virtualKeywords = ['virtual', 'online', 'remote', 'webinar', 'livestream', 'digital', 'zoom', 'teams', 'webex'];
    
    return virtualKeywords.some(keyword => location.includes(keyword));
  }
  
  /**
   * Extract structured location data from an event
   */
  private static extractEventLocation(event: Event | EventLocationData): {
    city?: string;
    country?: string;
    locationString?: string;
  } {
    // Try structured venue data first
    const venueCity = 'venueCity' in event ? event.venueCity : undefined;
    const venueCountry = 'venueCountry' in event ? event.venueCountry : undefined;
    
    if (venueCity || venueCountry) {
      return {
        city: venueCity?.toLowerCase() || undefined,
        country: venueCountry?.toLowerCase() || undefined,
        locationString: ('location' in event ? event.location : undefined)?.toLowerCase(),
      };
    }
    
    // Fall back to parsing location string
    const locationString = ('location' in event ? event.location : undefined)?.toLowerCase() || '';
    
    return {
      city: undefined,
      country: undefined,
      locationString,
    };
  }
  
  /**
   * Check if event is in the same city as user
   */
  private static isSameCity(
    eventLocation: { city?: string; locationString?: string },
    userLocation: UserLocation
  ): boolean {
    const userCity = userLocation.city?.toLowerCase();
    if (!userCity) return false;
    
    // Check structured city data
    if (eventLocation.city && eventLocation.city === userCity) {
      return true;
    }
    
    // Check location string
    if (eventLocation.locationString?.includes(userCity)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if event is in the same country as user
   */
  private static isSameCountry(
    eventLocation: { country?: string; locationString?: string },
    userLocation: UserLocation
  ): boolean {
    const userCountry = userLocation.country?.toLowerCase();
    if (!userCountry) return false;
    
    // Check structured country data
    if (eventLocation.country && eventLocation.country === userCountry) {
      return true;
    }
    
    // Check location string
    if (eventLocation.locationString?.includes(userCountry)) {
      return true;
    }
    
    // Handle common country name variations
    const countryVariations: Record<string, string[]> = {
      'usa': ['united states', 'us', 'america'],
      'united states': ['usa', 'us', 'america'],
      'uk': ['united kingdom', 'britain', 'england'],
      'united kingdom': ['uk', 'britain', 'england'],
    };
    
    const variations = countryVariations[userCountry] || [];
    for (const variation of variations) {
      if (eventLocation.locationString?.includes(variation)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if event is in the same continent/region as user
   */
  private static isSameContinent(
    eventLocation: { country?: string; locationString?: string },
    userLocation: UserLocation
  ): boolean {
    const userContinent = this.getContinentFromLocation(userLocation);
    if (!userContinent) return false;
    
    const eventContinent = this.getContinentFromEventLocation(eventLocation);
    if (!eventContinent) return false;
    
    // Americas are considered close enough (North/South America)
    if (
      (userContinent === 'north_america' || userContinent === 'south_america' || userContinent === 'americas') &&
      (eventContinent === 'north_america' || eventContinent === 'south_america' || eventContinent === 'americas')
    ) {
      return true;
    }
    
    return userContinent === eventContinent;
  }
  
  /**
   * Get continent from user location
   */
  private static getContinentFromLocation(userLocation: UserLocation): string | null {
    // Try country mapping first
    if (userLocation.country) {
      const continent = COUNTRY_TO_CONTINENT[userLocation.country.toLowerCase()];
      if (continent) return continent;
    }
    
    // Try timezone mapping
    if (userLocation.timezone) {
      const timezonePrefix = userLocation.timezone.split('/')[0]?.toLowerCase();
      if (timezonePrefix) {
        return TIMEZONE_TO_CONTINENT[timezonePrefix] || null;
      }
    }
    
    return null;
  }
  
  /**
   * Get continent from event location
   */
  private static getContinentFromEventLocation(
    eventLocation: { country?: string; locationString?: string }
  ): string | null {
    // Try country mapping
    if (eventLocation.country) {
      const continent = COUNTRY_TO_CONTINENT[eventLocation.country];
      if (continent) return continent;
    }
    
    // Try to extract from location string
    if (eventLocation.locationString) {
      for (const [country, continent] of Object.entries(COUNTRY_TO_CONTINENT)) {
        if (eventLocation.locationString.includes(country)) {
          return continent;
        }
      }
      
      // Check for major cities that indicate continent
      const cityToContinentHints: Record<string, string> = {
        'new york': 'north_america',
        'san francisco': 'north_america',
        'los angeles': 'north_america',
        'seattle': 'north_america',
        'austin': 'north_america',
        'boston': 'north_america',
        'toronto': 'north_america',
        'vancouver': 'north_america',
        'london': 'europe',
        'berlin': 'europe',
        'paris': 'europe',
        'amsterdam': 'europe',
        'dublin': 'europe',
        'barcelona': 'europe',
        'munich': 'europe',
        'zurich': 'europe',
        'stockholm': 'europe',
        'tokyo': 'asia',
        'singapore': 'asia',
        'hong kong': 'asia',
        'shanghai': 'asia',
        'beijing': 'asia',
        'seoul': 'asia',
        'bangalore': 'asia',
        'mumbai': 'asia',
        'dubai': 'asia',
        'tel aviv': 'asia',
        'sydney': 'oceania',
        'melbourne': 'oceania',
        'auckland': 'oceania',
        'são paulo': 'south_america',
        'sao paulo': 'south_america',
        'buenos aires': 'south_america',
      };
      
      for (const [city, continent] of Object.entries(cityToContinentHints)) {
        if (eventLocation.locationString.includes(city)) {
          return continent;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Batch calculate location scores for multiple events
   */
  static calculateBatchLocationScores(
    events: Event[],
    userLocation?: UserLocation | null
  ): Map<string, LocationScoreResult> {
    const results = new Map<string, LocationScoreResult>();
    
    for (const event of events) {
      results.set(event.id, this.calculateLocationScore(event, userLocation));
    }
    
    return results;
  }
}

export default LocationScoringService;






