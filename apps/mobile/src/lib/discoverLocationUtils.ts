import { requireOptionalNativeModule } from 'expo-modules-core';

type ExpoLocationModule = typeof import('expo-location');

const TIMEZONE_TO_CITY_MAP: Record<string, string> = {
  'America/New_York': 'New York',
  'America/Los_Angeles': 'Los Angeles',
  'America/Chicago': 'Chicago',
  'America/Denver': 'Denver',
  'America/Edmonton': 'Edmonton',
  'America/Toronto': 'Toronto',
  'America/Vancouver': 'Vancouver',
  'Europe/London': 'London',
  'Europe/Berlin': 'Berlin',
  'Europe/Paris': 'Paris',
  'Europe/Amsterdam': 'Amsterdam',
  'Asia/Tokyo': 'Tokyo',
  'Asia/Singapore': 'Singapore',
  'Asia/Hong_Kong': 'Hong Kong',
  'Australia/Sydney': 'Sydney',
};

function trimLocationValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function cityFromTimezone(timezone: string | null | undefined) {
  const normalized = trimLocationValue(timezone);
  if (!normalized) {
    return null;
  }

  const mappedCity = TIMEZONE_TO_CITY_MAP[normalized];
  if (mappedCity) {
    return mappedCity;
  }

  const parts = normalized.split('/');
  if (parts.length < 2) {
    return null;
  }

  return parts[parts.length - 1]?.replace(/_/g, ' ') ?? null;
}

function firstResolvedCity(addresses: Array<Record<string, unknown>>) {
  for (const address of addresses) {
    const candidate = trimLocationValue(
      String(
        address.city ??
          address.district ??
          address.subregion ??
          address.region ??
          address.name ??
          ''
      )
    );

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

let cachedLocationModule: ExpoLocationModule | null | undefined;

function getExpoLocationModule() {
  if (cachedLocationModule !== undefined) {
    return cachedLocationModule;
  }

  if (!requireOptionalNativeModule('ExpoLocation')) {
    cachedLocationModule = null;
    return cachedLocationModule;
  }

  try {
    cachedLocationModule = require('expo-location') as ExpoLocationModule;
  } catch {
    cachedLocationModule = null;
  }

  return cachedLocationModule;
}

export function resolveTimezoneFallbackLocation(
  profileTimezone?: string | null,
  deviceTimezone?: string | null
) {
  return cityFromTimezone(profileTimezone) ?? cityFromTimezone(deviceTimezone);
}

export async function resolveCurrentLocationLabel(profileTimezone?: string | null) {
  const locationModule = getExpoLocationModule();

  if (!locationModule) {
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return resolveTimezoneFallbackLocation(profileTimezone, deviceTimezone);
  }

  try {
    const permission = await locationModule.requestForegroundPermissionsAsync();

    if (permission.granted) {
      try {
        const position = await locationModule.getCurrentPositionAsync({
          accuracy: locationModule.Accuracy.Balanced,
        });

        const addresses = await locationModule.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        const resolvedCity = firstResolvedCity(addresses as Array<Record<string, unknown>>);
        if (resolvedCity) {
          return resolvedCity;
        }
      } catch {
        // Fall through to timezone-based best effort.
      }
    }
  } catch {
    // Fall through to timezone-based best effort.
  }

  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return resolveTimezoneFallbackLocation(profileTimezone, deviceTimezone);
}
