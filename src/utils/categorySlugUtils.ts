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

/**
 * Resolve the canonical city label from a city slug.
 */
export function findCityBySlug(cities: string[], citySlug: string): string | null {
    return cities.find((city) => cityNameToSlug(city) === citySlug) || null;
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
