import { cityNameToSlug } from '@/utils/categorySlugUtils';

export interface CitySummaryRow {
    location_city: string | null;
    location_country?: string | null;
    start_time: string | null;
    title?: string | null;
    slug?: string | null;
    location_latitude?: number | null;
    location_longitude?: number | null;
}

export interface CityPreviewEvent {
    title: string;
    slug: string;
    startTime: string;
}

export interface CitySummary {
    cityName: string;
    citySlug: string;
    eventCount: number;
    nextEventDate: string;
    latitude: number | null;
    longitude: number | null;
    previewEvents: CityPreviewEvent[];
}

export interface CountrySummaryCity {
    cityName: string;
    citySlug: string;
    eventCount: number;
    nextEventDate: string;
}

export interface CountrySummary {
    countryName: string;
    countryKey: string;
    eventCount: number;
    nextEventDate: string;
    cityCount: number;
    cities: CountrySummaryCity[];
    previewEvents: CityPreviewEvent[];
}

export const CITY_COORDINATE_FALLBACKS: Record<string, { lat: number; lng: number }> = {
    'San Francisco': { lat: 37.7749, lng: -122.4194 },
    'New York': { lat: 40.7128, lng: -74.0060 },
    'London': { lat: 51.5074, lng: -0.1278 },
    'Berlin': { lat: 52.5200, lng: 13.4050 },
    'Singapore': { lat: 1.3521, lng: 103.8198 },
    'Austin': { lat: 30.2672, lng: -97.7431 },
    'Seattle': { lat: 47.6062, lng: -122.3321 },
    'Toronto': { lat: 43.65107, lng: -79.347015 },
    'Bengaluru': { lat: 12.9716, lng: 77.5946 },
    'Paris': { lat: 48.8566, lng: 2.3522 },
    'Amsterdam': { lat: 52.3676, lng: 4.9041 },
    'Dubai': { lat: 25.2048, lng: 55.2708 },
};

function compareCityLabelPreference(a: string, b: string): number {
    const punctuationWeight = (value: string) =>
        Array.from(value).reduce((weight, character) => {
            if (character === '.') return weight + 3;
            if (character === ',') return weight + 2;
            if (character === '\'') return weight + 1;
            return weight;
        }, 0);

    const punctuationDiff = punctuationWeight(a) - punctuationWeight(b);
    if (punctuationDiff !== 0) {
        return punctuationDiff;
    }

    if (a.length !== b.length) {
        return b.length - a.length;
    }

    return a.localeCompare(b);
}

function pickPreferredCityName(cityNameCounts: Map<string, number>): string {
    return Array.from(cityNameCounts.entries())
        .sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }

            return compareCityLabelPreference(a[0], b[0]);
        })[0]?.[0] ?? '';
}

export function normalizeCountryName(country: string): string {
    const normalized = country.trim().toLowerCase();

    const aliases: Record<string, string> = {
        usa: 'united states of america',
        us: 'united states of america',
        'united states': 'united states of america',
        'u.s.': 'united states of america',
        'u.s.a.': 'united states of america',
        uk: 'united kingdom',
        'great britain': 'united kingdom',
        england: 'united kingdom',
        scotland: 'united kingdom',
        holland: 'netherlands',
        uae: 'united arab emirates',
        'czech republic': 'czechia',
    };

    return aliases[normalized] ?? normalized;
}

function sortAndTrimPreviewEvents(previewEvents: CityPreviewEvent[]): CityPreviewEvent[] {
    const uniquePreviewEvents = new Map<string, CityPreviewEvent>();

    for (const previewEvent of previewEvents) {
        const key = `${previewEvent.slug}:${previewEvent.startTime}`;

        if (!uniquePreviewEvents.has(key)) {
            uniquePreviewEvents.set(key, previewEvent);
        }
    }

    return Array.from(uniquePreviewEvents.values())
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .slice(0, 3);
}

function sortAndTrimCountryPreviewEvents(previewEvents: CityPreviewEvent[]): CityPreviewEvent[] {
    return Array.from(
        previewEvents.reduce<Map<string, CityPreviewEvent>>((acc, previewEvent) => {
            const key = `${previewEvent.slug}:${previewEvent.startTime}`;

            if (!acc.has(key)) {
                acc.set(key, previewEvent);
            }

            return acc;
        }, new Map())
            .values()
    )
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .slice(0, 5);
}

function sortAndTrimCountryCities(cities: CountrySummaryCity[]): CountrySummaryCity[] {
    return Array.from(
        cities.reduce<Map<string, CountrySummaryCity>>((acc, city) => {
            const existing = acc.get(city.citySlug);

            if (!existing) {
                acc.set(city.citySlug, city);
                return acc;
            }

            existing.eventCount += city.eventCount;

            if (city.nextEventDate < existing.nextEventDate) {
                existing.nextEventDate = city.nextEventDate;
            }

            if (compareCityLabelPreference(city.cityName, existing.cityName) < 0) {
                existing.cityName = city.cityName;
            }

            return acc;
        }, new Map())
            .values()
    )
        .sort((a, b) => {
            if (b.eventCount !== a.eventCount) {
                return b.eventCount - a.eventCount;
            }

            if (a.nextEventDate !== b.nextEventDate) {
                return a.nextEventDate.localeCompare(b.nextEventDate);
            }

            return a.cityName.localeCompare(b.cityName);
        })
        .slice(0, 6);
}

export function dedupeCitySummariesBySlug(citySummaries: CitySummary[]): CitySummary[] {
    const cityMap = new Map<string, CitySummary>();

    for (const city of citySummaries) {
        const existing = cityMap.get(city.citySlug);

        if (!existing) {
            cityMap.set(city.citySlug, {
                ...city,
                previewEvents: [...city.previewEvents],
            });
            continue;
        }

        existing.eventCount += city.eventCount;

        if (city.nextEventDate < existing.nextEventDate) {
            existing.nextEventDate = city.nextEventDate;
        }

        if (compareCityLabelPreference(city.cityName, existing.cityName) < 0) {
            existing.cityName = city.cityName;
        }

        if (
            (existing.latitude == null || existing.longitude == null) &&
            city.latitude != null &&
            city.longitude != null
        ) {
            existing.latitude = city.latitude;
            existing.longitude = city.longitude;
        }

        existing.previewEvents = sortAndTrimPreviewEvents([
            ...existing.previewEvents,
            ...city.previewEvents,
        ]);
    }

    return Array.from(cityMap.values()).sort((a, b) => {
        if (b.eventCount !== a.eventCount) {
            return b.eventCount - a.eventCount;
        }

        return a.cityName.localeCompare(b.cityName);
    });
}

export function buildCitySummaries(rows: CitySummaryRow[]): CitySummary[] {
    const cityMap = new Map<string, CitySummary & {
        coordinateSource: 'row' | 'fallback' | 'none';
        cityNameCounts: Map<string, number>;
    }>();

    for (const row of rows) {
        const cityName = row.location_city?.trim();
        const nextEventDate = row.start_time;

        if (!cityName || !nextEventDate) {
            continue;
        }

        const citySlug = cityNameToSlug(cityName);
        const existing = cityMap.get(citySlug);
        const fallbackCoordinates = CITY_COORDINATE_FALLBACKS[cityName];
        const rowHasCoordinates =
            typeof row.location_latitude === 'number' &&
            typeof row.location_longitude === 'number';
        const candidateLatitude: number | null = rowHasCoordinates
            ? (row.location_latitude ?? null)
            : fallbackCoordinates?.lat ?? null;
        const candidateLongitude: number | null = rowHasCoordinates
            ? (row.location_longitude ?? null)
            : fallbackCoordinates?.lng ?? null;
        const coordinateSource: 'row' | 'fallback' | 'none' = rowHasCoordinates
            ? 'row'
            : fallbackCoordinates
                ? 'fallback'
                : 'none';

        if (!existing) {
            cityMap.set(citySlug, {
                cityName,
                citySlug,
                eventCount: 1,
                nextEventDate,
                latitude: candidateLatitude,
                longitude: candidateLongitude,
                previewEvents: row.title && row.slug
                    ? [{ title: row.title, slug: row.slug, startTime: nextEventDate }]
                    : [],
                coordinateSource,
                cityNameCounts: new Map([[cityName, 1]]),
            });
            continue;
        }

        existing.eventCount += 1;
        existing.cityNameCounts.set(cityName, (existing.cityNameCounts.get(cityName) ?? 0) + 1);
        existing.cityName = pickPreferredCityName(existing.cityNameCounts);

        if (row.title && row.slug) {
            existing.previewEvents.push({
                title: row.title,
                slug: row.slug,
                startTime: nextEventDate,
            });
        }

        if (nextEventDate < existing.nextEventDate) {
            existing.nextEventDate = nextEventDate;
        }

        if (
            coordinateSource === 'row' &&
            existing.coordinateSource !== 'row' &&
            candidateLatitude != null &&
            candidateLongitude != null
        ) {
            existing.latitude = candidateLatitude;
            existing.longitude = candidateLongitude;
            existing.coordinateSource = 'row';
        } else if (
            coordinateSource === 'fallback' &&
            existing.coordinateSource === 'none' &&
            candidateLatitude != null &&
            candidateLongitude != null
        ) {
            existing.latitude = candidateLatitude;
            existing.longitude = candidateLongitude;
            existing.coordinateSource = 'fallback';
        }
    }

    return dedupeCitySummariesBySlug(
        Array.from(cityMap.values())
        .sort((a, b) => {
            if (b.eventCount !== a.eventCount) {
                return b.eventCount - a.eventCount;
            }

            return a.cityName.localeCompare(b.cityName);
        })
        .map(({ coordinateSource: _coordinateSource, cityNameCounts: _cityNameCounts, previewEvents, ...summary }) => ({
            ...summary,
            previewEvents: sortAndTrimPreviewEvents(previewEvents),
        }))
    );
}

export function buildCountrySummaries(rows: CitySummaryRow[]): CountrySummary[] {
    const countryMap = new Map<string, {
        countryName: string;
        countryKey: string;
        eventCount: number;
        nextEventDate: string;
        previewEvents: CityPreviewEvent[];
        countryNameCounts: Map<string, number>;
        cityMap: Map<string, CountrySummaryCity & { cityNameCounts: Map<string, number> }>;
    }>();

    for (const row of rows) {
        const countryName = row.location_country?.trim();
        const nextEventDate = row.start_time;

        if (!countryName || !nextEventDate) {
            continue;
        }

        const countryKey = normalizeCountryName(countryName);
        const existingCountry = countryMap.get(countryKey);

        if (!existingCountry) {
            const cityMap = new Map<string, CountrySummaryCity & { cityNameCounts: Map<string, number> }>();
            const cityName = row.location_city?.trim();

            if (cityName) {
                cityMap.set(cityNameToSlug(cityName), {
                    cityName,
                    citySlug: cityNameToSlug(cityName),
                    eventCount: 1,
                    nextEventDate,
                    cityNameCounts: new Map([[cityName, 1]]),
                });
            }

            countryMap.set(countryKey, {
                countryName,
                countryKey,
                eventCount: 1,
                nextEventDate,
                previewEvents: row.title && row.slug
                    ? [{ title: row.title, slug: row.slug, startTime: nextEventDate }]
                    : [],
                countryNameCounts: new Map([[countryName, 1]]),
                cityMap,
            });
            continue;
        }

        existingCountry.eventCount += 1;
        existingCountry.countryNameCounts.set(
            countryName,
            (existingCountry.countryNameCounts.get(countryName) ?? 0) + 1
        );
        existingCountry.countryName = pickPreferredCityName(existingCountry.countryNameCounts);

        if (nextEventDate < existingCountry.nextEventDate) {
            existingCountry.nextEventDate = nextEventDate;
        }

        if (row.title && row.slug) {
            existingCountry.previewEvents.push({
                title: row.title,
                slug: row.slug,
                startTime: nextEventDate,
            });
        }

        const cityName = row.location_city?.trim();
        if (!cityName) {
            continue;
        }

        const citySlug = cityNameToSlug(cityName);
        const existingCity = existingCountry.cityMap.get(citySlug);

        if (!existingCity) {
            existingCountry.cityMap.set(citySlug, {
                cityName,
                citySlug,
                eventCount: 1,
                nextEventDate,
                cityNameCounts: new Map([[cityName, 1]]),
            });
            continue;
        }

        existingCity.eventCount += 1;
        existingCity.cityNameCounts.set(cityName, (existingCity.cityNameCounts.get(cityName) ?? 0) + 1);
        existingCity.cityName = pickPreferredCityName(existingCity.cityNameCounts);

        if (nextEventDate < existingCity.nextEventDate) {
            existingCity.nextEventDate = nextEventDate;
        }
    }

    return Array.from(countryMap.values())
        .map(({ countryNameCounts: _countryNameCounts, cityMap, previewEvents, ...country }) => ({
            ...country,
            cityCount: cityMap.size,
            cities: sortAndTrimCountryCities(
                Array.from(cityMap.values()).map(({ cityNameCounts: _cityNameCounts, ...city }) => city)
            ),
            previewEvents: sortAndTrimCountryPreviewEvents(previewEvents),
        }))
        .sort((a, b) => {
            if (b.eventCount !== a.eventCount) {
                return b.eventCount - a.eventCount;
            }

            return a.countryName.localeCompare(b.countryName);
        });
}
