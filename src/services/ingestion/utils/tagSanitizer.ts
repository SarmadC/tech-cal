/**
 * Tag Sanitizer
 *
 * Filters out non-content tags (languages, locations, event formats, metadata noise)
 * before they enter the ingestion pipeline. Used by collectors and the EventNormalizer.
 */

/** ISO 639-1 language codes */
const LANGUAGE_CODES = new Set([
    'en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'pl', 'ru', 'ja', 'zh', 'ko',
    'ar', 'hi', 'tr', 'sv', 'da', 'no', 'fi', 'cs', 'sk', 'ro', 'hu', 'bg',
    'hr', 'sl', 'uk', 'vi', 'th', 'he', 'id', 'ms', 'el', 'ca', 'et', 'lv',
    'lt', 'sr', 'sq', 'mk', 'bs', 'is', 'ga', 'mt', 'cy', 'eu', 'gl',
]);

/** Full language names */
const LANGUAGE_NAMES = new Set([
    'english', 'french', 'german', 'spanish', 'portuguese', 'italian',
    'dutch', 'polish', 'russian', 'japanese', 'chinese', 'korean',
    'arabic', 'hindi', 'turkish', 'swedish', 'danish', 'norwegian',
    'finnish', 'czech', 'slovak', 'romanian', 'hungarian', 'bulgarian',
    'croatian', 'slovenian', 'ukrainian', 'vietnamese', 'thai', 'hebrew',
    'indonesian', 'malay', 'greek', 'catalan', 'estonian', 'latvian',
    'lithuanian', 'serbian', 'mandarin', 'cantonese',
]);

/** Event format terms (handled by event_format field) */
const FORMAT_TERMS = new Set([
    'online', 'virtual', 'in-person', 'hybrid', 'remote', 'on-site',
    'onsite', 'offline', 'digital', 'on-demand', 'live',
]);

/** Geographic/location noise (not tech content) */
const GEOGRAPHIC_TERMS = new Set([
    'usa', 'uk', 'europe', 'asia', 'americas', 'global', 'worldwide',
    'international', 'emea', 'apac', 'latam', 'north america',
    'south america', 'africa', 'middle east', 'oceania',
]);

/** Generic event terms (not content tags) */
const GENERIC_EVENT_TERMS = new Set([
    'conference', 'event', 'meetup', 'webinar', 'summit', 'symposium',
    'convention', 'expo', 'exhibition', 'forum', 'gathering',
    'free', 'paid', 'tbd', 'tba', 'n/a', 'na',
]);

/** Tech terms that happen to match location/language names — never filter these */
const TECH_TERM_ALLOWLIST = new Set([
    'java', 'go', 'dart', 'swift', 'ruby', 'rust', 'r', 'c',
    'scala', 'julia', 'haskell', 'elm', 'crystal', 'elixir',
]);

/** Metadata noise patterns */
const NOISE_PREFIXES = ['social:', 'lang:', 'format:', 'location:', 'country:', 'city:'];

/**
 * Filter out non-content tags from a raw tag array.
 * Removes languages, locations, event formats, and metadata noise.
 */
export function sanitizeCollectorTags(tags: string[]): string[] {
    return tags.filter(tag => {
        const trimmed = tag.trim();
        if (!trimmed) return false;

        const lower = trimmed.toLowerCase();

        // Protect known tech terms that look like other things
        if (TECH_TERM_ALLOWLIST.has(lower)) return true;

        // Filter language codes and names
        if (LANGUAGE_CODES.has(lower)) return false;
        if (LANGUAGE_NAMES.has(lower)) return false;

        // Filter event format terms
        if (FORMAT_TERMS.has(lower)) return false;

        // Filter geographic noise
        if (GEOGRAPHIC_TERMS.has(lower)) return false;

        // Filter generic event terms
        if (GENERIC_EVENT_TERMS.has(lower)) return false;

        // Filter metadata noise prefixes
        if (NOISE_PREFIXES.some(prefix => lower.startsWith(prefix))) return false;

        return true;
    });
}
