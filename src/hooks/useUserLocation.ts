'use client';

import { useState, useEffect, useRef } from 'react';
import { AppProfile } from '@/types';

export interface UserLocation {
  city?: string;
  country?: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
  source: 'profile' | 'geolocation' | 'timezone' | 'fallback';
}

export function useUserLocation(userProfile: AppProfile | null) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const detectLocation = async () => {
      if (!isMountedRef.current) return;
      setIsLoading(true);
      setError(null);

      try {
        // 1. First, try to get location from user profile
        if (userProfile?.preferences) {
          const preferences = userProfile.preferences as Record<string, unknown>;
          const profileLocation = preferences?.location as Record<string, unknown>;

          if (profileLocation?.city && profileLocation?.country) {
            if (!isMountedRef.current) return;
            setLocation({
              city: profileLocation.city as string,
              country: profileLocation.country as string,
              timezone: userProfile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
              source: 'profile'
            });
            setIsLoading(false);
            return;
          }
        }

        // 2. Try browser geolocation API
        if ('geolocation' in navigator) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                  timeout: 10000,
                  enableHighAccuracy: false,
                  maximumAge: 5 * 60 * 1000 // Cache for 5 minutes
                }
              );
            });

            // Check if still mounted after async geolocation
            if (!isMountedRef.current) return;

            // Reverse geocode to get city/country (in a real app, you'd use a service)
            const { latitude, longitude } = position.coords;

            // For now, we'll use a simple timezone-based approach
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const locationFromTimezone = getLocationFromTimezone(timezone);

            setLocation({
              ...locationFromTimezone,
              latitude,
              longitude,
              timezone,
              source: 'geolocation'
            });
            setIsLoading(false);
            return;
          } catch (geoError) {
            console.warn('Geolocation failed:', geoError);
            // Fall through to timezone detection
          }
        }

        // Check if still mounted before setting fallback location
        if (!isMountedRef.current) return;

        // 3. Fallback to timezone-based detection
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const locationFromTimezone = getLocationFromTimezone(timezone);

        setLocation({
          ...locationFromTimezone,
          timezone,
          source: 'timezone'
        });

      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('Location detection failed:', err);
        setError('Unable to detect location');

        // Final fallback
        setLocation({
          timezone: 'UTC',
          source: 'fallback'
        });
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    detectLocation();

    return () => {
      isMountedRef.current = false;
    };
  }, [userProfile]);

  return { location, isLoading, error };
}

/**
 * Extract location information from timezone
 */
function getLocationFromTimezone(timezone: string): Partial<UserLocation> {
  // Comprehensive global cities mapping
  const timezoneToLocation: Record<string, { city: string; country: string }> = {
    // North America
    'America/New_York': { city: 'New York', country: 'USA' },
    'America/Los_Angeles': { city: 'Los Angeles', country: 'USA' },
    'America/Chicago': { city: 'Chicago', country: 'USA' },
    'America/Denver': { city: 'Denver', country: 'USA' },
    'America/Phoenix': { city: 'Phoenix', country: 'USA' },
    'America/Toronto': { city: 'Toronto', country: 'Canada' },
    'America/Vancouver': { city: 'Vancouver', country: 'Canada' },
    'America/Montreal': { city: 'Montreal', country: 'Canada' },
    'America/Mexico_City': { city: 'Mexico City', country: 'Mexico' },
    
    // Europe
    'Europe/London': { city: 'London', country: 'UK' },
    'Europe/Berlin': { city: 'Berlin', country: 'Germany' },
    'Europe/Paris': { city: 'Paris', country: 'France' },
    'Europe/Amsterdam': { city: 'Amsterdam', country: 'Netherlands' },
    'Europe/Madrid': { city: 'Madrid', country: 'Spain' },
    'Europe/Rome': { city: 'Rome', country: 'Italy' },
    'Europe/Stockholm': { city: 'Stockholm', country: 'Sweden' },
    'Europe/Copenhagen': { city: 'Copenhagen', country: 'Denmark' },
    'Europe/Oslo': { city: 'Oslo', country: 'Norway' },
    'Europe/Helsinki': { city: 'Helsinki', country: 'Finland' },
    'Europe/Zurich': { city: 'Zurich', country: 'Switzerland' },
    'Europe/Vienna': { city: 'Vienna', country: 'Austria' },
    'Europe/Prague': { city: 'Prague', country: 'Czech Republic' },
    'Europe/Warsaw': { city: 'Warsaw', country: 'Poland' },
    'Europe/Budapest': { city: 'Budapest', country: 'Hungary' },
    'Europe/Bucharest': { city: 'Bucharest', country: 'Romania' },
    'Europe/Athens': { city: 'Athens', country: 'Greece' },
    'Europe/Dublin': { city: 'Dublin', country: 'Ireland' },
    'Europe/Lisbon': { city: 'Lisbon', country: 'Portugal' },
    'Europe/Brussels': { city: 'Brussels', country: 'Belgium' },
    'Europe/Luxembourg': { city: 'Luxembourg', country: 'Luxembourg' },
    'Europe/Moscow': { city: 'Moscow', country: 'Russia' },
    'Europe/Kiev': { city: 'Kiev', country: 'Ukraine' },
    'Europe/Istanbul': { city: 'Istanbul', country: 'Turkey' },
    
    // Asia-Pacific
    'Asia/Tokyo': { city: 'Tokyo', country: 'Japan' },
    'Asia/Shanghai': { city: 'Shanghai', country: 'China' },
    'Asia/Hong_Kong': { city: 'Hong Kong', country: 'Hong Kong' },
    'Asia/Singapore': { city: 'Singapore', country: 'Singapore' },
    'Asia/Seoul': { city: 'Seoul', country: 'South Korea' },
    'Asia/Taipei': { city: 'Taipei', country: 'Taiwan' },
    'Asia/Bangkok': { city: 'Bangkok', country: 'Thailand' },
    'Asia/Manila': { city: 'Manila', country: 'Philippines' },
    'Asia/Jakarta': { city: 'Jakarta', country: 'Indonesia' },
    'Asia/Kuala_Lumpur': { city: 'Kuala Lumpur', country: 'Malaysia' },
    'Asia/Ho_Chi_Minh': { city: 'Ho Chi Minh City', country: 'Vietnam' },
    'Asia/Kolkata': { city: 'Mumbai', country: 'India' },
    'Asia/Mumbai': { city: 'Mumbai', country: 'India' },
    'Asia/Delhi': { city: 'Delhi', country: 'India' },
    'Asia/Bangalore': { city: 'Bangalore', country: 'India' },
    'Asia/Karachi': { city: 'Karachi', country: 'Pakistan' },
    'Asia/Dhaka': { city: 'Dhaka', country: 'Bangladesh' },
    'Asia/Dubai': { city: 'Dubai', country: 'UAE' },
    'Asia/Riyadh': { city: 'Riyadh', country: 'Saudi Arabia' },
    'Asia/Tel_Aviv': { city: 'Tel Aviv', country: 'Israel' },
    
    // Australia & New Zealand
    'Australia/Sydney': { city: 'Sydney', country: 'Australia' },
    'Australia/Melbourne': { city: 'Melbourne', country: 'Australia' },
    'Australia/Brisbane': { city: 'Brisbane', country: 'Australia' },
    'Australia/Perth': { city: 'Perth', country: 'Australia' },
    'Pacific/Auckland': { city: 'Auckland', country: 'New Zealand' },
    
    // South America
    'America/Sao_Paulo': { city: 'São Paulo', country: 'Brazil' },
    'America/Buenos_Aires': { city: 'Buenos Aires', country: 'Argentina' },
    'America/Lima': { city: 'Lima', country: 'Peru' },
    'America/Bogota': { city: 'Bogotá', country: 'Colombia' },
    'America/Santiago': { city: 'Santiago', country: 'Chile' },
    'America/Caracas': { city: 'Caracas', country: 'Venezuela' },
    
    // Africa
    'Africa/Cairo': { city: 'Cairo', country: 'Egypt' },
    'Africa/Lagos': { city: 'Lagos', country: 'Nigeria' },
    'Africa/Johannesburg': { city: 'Johannesburg', country: 'South Africa' },
    'Africa/Nairobi': { city: 'Nairobi', country: 'Kenya' },
    'Africa/Casablanca': { city: 'Casablanca', country: 'Morocco' },
  };

  // Return the mapped location or intelligent fallback
  const mappedLocation = timezoneToLocation[timezone];
  if (mappedLocation) {
    return mappedLocation;
  }

  // Intelligent fallback: extract region from timezone
  if (timezone.includes('/')) {
    const [continent, city] = timezone.split('/');
    
    // Clean up city name
    const cleanCity = city.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    
    // Map continent to region
    const continentMap: Record<string, string> = {
      'America': 'Americas',
      'Europe': 'Europe', 
      'Asia': 'Asia',
      'Africa': 'Africa',
      'Australia': 'Australia',
      'Pacific': 'Pacific',
      'Atlantic': 'Atlantic',
      'Indian': 'Indian Ocean'
    };
    
    return {
      city: cleanCity,
      country: continentMap[continent] || continent
    };
  }

  // Ultimate fallback
  return {
    city: 'Unknown Location',
    country: 'Global'
  };
}

/**
 * Format location for display
 */
export function formatLocation(location: UserLocation | null): string {
  if (!location) return 'Unknown location';
  
  if (location.city && location.country) {
    return `${location.city}, ${location.country}`;
  }
  
  if (location.country) {
    return location.country;
  }
  
  if (location.timezone) {
    return location.timezone.replace('_', ' ');
  }
  
  return 'Unknown location';
}

/**
 * Check if two locations are in the same region
 */
export function isSameRegion(loc1: UserLocation | null, loc2: UserLocation | null): boolean {
  if (!loc1 || !loc2) return false;
  
  // Same city
  if (loc1.city && loc2.city && loc1.city.toLowerCase() === loc2.city.toLowerCase()) {
    return true;
  }
  
  // Same country
  if (loc1.country && loc2.country && loc1.country.toLowerCase() === loc2.country.toLowerCase()) {
    return true;
  }
  
  // Same timezone region
  if (loc1.timezone && loc2.timezone) {
    const region1 = loc1.timezone.split('/')[0];
    const region2 = loc2.timezone.split('/')[0];
    return region1 === region2;
  }
  
  return false;
}
