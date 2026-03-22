// src/utils/categorySlugUtils.ts
// Slug conversion utilities for category and city hub pages

const PLURAL_MAP: Record<string, string> = {
    conference: 'conferences',
    hackathon: 'hackathons',
    workshop: 'workshops',
    meetup: 'meetups',
    webinar: 'webinars',
    summit: 'summits',
    bootcamp: 'bootcamps',
    seminar: 'seminars',
    panel: 'panels',
    livestream: 'livestreams',
    launch: 'launches',
    demo: 'demos',
    talk: 'talks',
    symposium: 'symposiums',
};

const SINGULAR_MAP = Object.fromEntries(
    Object.entries(PLURAL_MAP).map(([singular, plural]) => [plural, singular])
);

interface NamedCategory {
    name: string | null;
}

/**
 * Convert a category name (from event_type.name) to a URL slug.
 * "Conference" → "conferences", "Product Launch" → "product-launches"
 */
export function categoryNameToSlug(name: string): string {
    const lower = name.toLowerCase().trim();
    const words = lower.split(/\s+/);
    const lastWord = words[words.length - 1];

    // Pluralize the last word if we have a mapping
    if (PLURAL_MAP[lastWord]) {
        words[words.length - 1] = PLURAL_MAP[lastWord];
    } else if (!lastWord.endsWith('s')) {
        words[words.length - 1] = lastWord + 's';
    }

    return words.join('-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Convert a URL slug back to a DB lookup pattern (singular, for ilike).
 * "conferences" → "conference", "product-launches" → "product launch%"
 */
export function slugToCategoryPattern(slug: string): string {
    const words = slug.split('-');
    const lastWord = words[words.length - 1];

    // Singularize the last word
    if (SINGULAR_MAP[lastWord]) {
        words[words.length - 1] = SINGULAR_MAP[lastWord];
    } else if (lastWord.endsWith('s')) {
        words[words.length - 1] = lastWord.slice(0, -1);
    }

    return words.join(' ') + '%';
}

/**
 * Deterministically resolve an event type row from a category slug.
 */
export function findCategoryBySlug<T extends NamedCategory>(
    categories: T[],
    slug: string
): T | null {
    return (
        categories.find(
            (category) =>
                typeof category.name === 'string' &&
                categoryNameToSlug(category.name) === slug
        ) || null
    );
}

/**
 * Convert a city name to a URL slug.
 * "San Francisco, CA" → "san-francisco-ca"
 */
export function cityNameToSlug(cityName: string): string {
    return cityName
        .toLowerCase()
        .trim()
        .replace(/[,.']/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

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

export function findCitiesBySlug(cities: string[], citySlug: string): string[] {
    return cities
        .filter((city) => cityNameToSlug(city) === citySlug)
        .sort(compareCityLabelPreference);
}

export function groupCitiesBySlug(cities: string[]): Array<{ citySlug: string; cityNames: string[] }> {
    const cityGroups = new Map<string, string[]>();

    for (const city of cities) {
        const cityName = city.trim();

        if (!cityName) {
            continue;
        }

        const citySlug = cityNameToSlug(cityName);
        const existing = cityGroups.get(citySlug);

        if (existing) {
            if (!existing.includes(cityName)) {
                existing.push(cityName);
            }
            continue;
        }

        cityGroups.set(citySlug, [cityName]);
    }

    return Array.from(cityGroups.entries()).map(([citySlug, cityNames]) => ({
        citySlug,
        cityNames: cityNames.sort(compareCityLabelPreference),
    }));
}

/**
 * Resolve the canonical city label from a city slug.
 */
export function findCityBySlug(cities: string[], citySlug: string): string | null {
    return findCitiesBySlug(cities, citySlug)[0] || null;
}

/**
 * Convert a city slug back to a display name (title case).
 * "san-francisco-ca" → "San Francisco Ca"
 */
export function slugToCityName(slug: string): string {
    return slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
