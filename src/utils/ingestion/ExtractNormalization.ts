/**
 * Extract Normalization Utilities
 *
 * Helper functions for turning loosely structured Firecrawl extract payloads
 * into values that line up with our Supabase schema expectations.
 */

export type TimezoneSource = 'explicit' | 'city' | 'country' | 'fallback';

export interface NormalizedTimezone {
    timezone: string;
    source: TimezoneSource;
    confidence: number;
    raw?: string | null;
}

const TZ_ALIAS_MAP: Record<string, NormalizedTimezone> = Object.entries({
    pst: 'America/Los_Angeles',
    pdt: 'America/Los_Angeles',
    pt: 'America/Los_Angeles',
    'pacific time': 'America/Los_Angeles',
    est: 'America/New_York',
    edt: 'America/New_York',
    et: 'America/New_York',
    'eastern time': 'America/New_York',
    cst: 'America/Chicago',
    cdt: 'America/Chicago',
    ct: 'America/Chicago',
    mst: 'America/Denver',
    mdt: 'America/Denver',
    mt: 'America/Denver',
    bst: 'Europe/London',
    gmt: 'Etc/GMT',
    utc: 'UTC',
    cest: 'Europe/Paris',
    cet: 'Europe/Paris',
    ist: 'Asia/Kolkata',
    sgt: 'Asia/Singapore',
    awst: 'Australia/Perth',
    aest: 'Australia/Sydney',
    aedt: 'Australia/Sydney',
}).reduce((acc, [alias, tz]) => {
    acc[alias] = { timezone: tz, source: 'explicit', confidence: 0.9 } as NormalizedTimezone;
    return acc;
}, {} as Record<string, NormalizedTimezone>);

const CITY_TZ_HINTS: Record<string, NormalizedTimezone> = Object.entries({
    'san francisco': 'America/Los_Angeles',
    'los angeles': 'America/Los_Angeles',
    seattle: 'America/Los_Angeles',
    'new york': 'America/New_York',
    boston: 'America/New_York',
    atlanta: 'America/New_York',
    chicago: 'America/Chicago',
    denver: 'America/Denver',
    austin: 'America/Chicago',
    toronto: 'America/Toronto',
    london: 'Europe/London',
    paris: 'Europe/Paris',
    berlin: 'Europe/Berlin',
    singapore: 'Asia/Singapore',
    sydney: 'Australia/Sydney',
    melbourne: 'Australia/Melbourne',
    bangalore: 'Asia/Kolkata',
    bengaluru: 'Asia/Kolkata',
    mumbai: 'Asia/Kolkata',
}).reduce((acc, [city, tz]) => {
    acc[city] = { timezone: tz, source: 'city', confidence: 0.6 } as NormalizedTimezone;
    return acc;
}, {} as Record<string, NormalizedTimezone>);

const COUNTRY_TZ_HINTS: Record<string, NormalizedTimezone> = Object.entries({
    usa: 'America/New_York',
    us: 'America/New_York',
    'united states': 'America/New_York',
    canada: 'America/Toronto',
    uk: 'Europe/London',
    'united kingdom': 'Europe/London',
    ireland: 'Europe/Dublin',
    france: 'Europe/Paris',
    germany: 'Europe/Berlin',
    india: 'Asia/Kolkata',
    singapore: 'Asia/Singapore',
    australia: 'Australia/Sydney',
}).reduce((acc, [country, tz]) => {
    acc[country] = { timezone: tz, source: 'country', confidence: 0.4 } as NormalizedTimezone;
    return acc;
}, {} as Record<string, NormalizedTimezone>);

const TZ_OFFSET_REGEX = /(utc|gmt)\s*([+-]\d{1,2})/i;

const DEFAULT_TIMEZONE_RESULT: NormalizedTimezone = {
    timezone: 'UTC',
    source: 'fallback',
    confidence: 0.2,
};

const stripAccents = (value: string) =>
    value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const cleanWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

/**
 * Normalize timezone from explicit string, city, or country hints.
 */
export function normalizeTimezone(
    explicit?: string | null,
    location?: { city?: string | null; country?: string | null },
    fallbackTimezone = 'UTC'
): NormalizedTimezone {
    if (explicit) {
        const cleaned = cleanWhitespace(explicit);
        if (cleaned.includes('/')) {
            // Assume valid IANA identifier
            return {
                timezone: cleaned,
                source: 'explicit',
                confidence: 0.95,
                raw: explicit,
            };
        }

        const aliasKey = stripAccents(cleaned).replace(/[()]/g, '');
        if (TZ_ALIAS_MAP[aliasKey]) {
            return { ...TZ_ALIAS_MAP[aliasKey], raw: explicit };
        }

        const offsetMatch = cleaned.match(TZ_OFFSET_REGEX);
        if (offsetMatch) {
            const offset = Number(offsetMatch[2]);
            const tz = offset === 0 ? 'UTC' : `Etc/GMT${offset > 0 ? '-' : '+'}${Math.abs(offset)}`;
            return {
                timezone: tz,
                source: 'explicit',
                confidence: 0.7,
                raw: explicit,
            };
        }

        const keyword = stripAccents(cleaned);
        if (keyword.includes('pacific')) {
            return { timezone: 'America/Los_Angeles', source: 'explicit', confidence: 0.85, raw: explicit };
        }
        if (keyword.includes('eastern')) {
            return { timezone: 'America/New_York', source: 'explicit', confidence: 0.85, raw: explicit };
        }
        if (keyword.includes('central')) {
            return { timezone: 'America/Chicago', source: 'explicit', confidence: 0.85, raw: explicit };
        }
        if (keyword.includes('mountain')) {
            return { timezone: 'America/Denver', source: 'explicit', confidence: 0.85, raw: explicit };
        }
        if (keyword.includes('british')) {
            return { timezone: 'Europe/London', source: 'explicit', confidence: 0.8, raw: explicit };
        }
    }

    const city = location?.city ? stripAccents(location.city) : undefined;
    if (city && CITY_TZ_HINTS[city]) {
        return { ...CITY_TZ_HINTS[city], raw: explicit ?? location?.city ?? null };
    }

    const country = location?.country ? stripAccents(location.country) : undefined;
    if (country && COUNTRY_TZ_HINTS[country]) {
        return { ...COUNTRY_TZ_HINTS[country], raw: explicit ?? location?.country ?? null };
    }

    return {
        timezone: fallbackTimezone || DEFAULT_TIMEZONE_RESULT.timezone,
        source: 'fallback',
        confidence: fallbackTimezone && fallbackTimezone !== 'UTC' ? 0.3 : DEFAULT_TIMEZONE_RESULT.confidence,
        raw: explicit ?? location?.city ?? location?.country ?? null,
    };
}

/**
 * Convert a loose time string to 24-hour HH:MM format.
 */
export function parseLocalTime(value?: string | null): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const isoMatch = trimmed.match(/T(\d{2}):(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}:${isoMatch[2]}`;
    }

    const normalized = trimmed.replace(/\./g, ':');
    const match = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!match) {
        return undefined;
    }

    let hours = Number(match[1]);
    const minutes = match[2] ? Number(match[2]) : 0;
    const meridiem = match[3]?.toLowerCase();

    if (Number.isNaN(hours) || hours > 24) {
        return undefined;
    }

    if (meridiem === 'am' && hours === 12) {
        hours = 0;
    } else if (meridiem === 'pm' && hours < 12) {
        hours += 12;
    }

    if (hours === 24) {
        hours = 0;
    }

    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    return `${hh}:${mm}`;
}

/**
 * Parse text duration into minutes (e.g., "60 minutes", "1.5 hours").
 */
export function parseDurationMinutes(value?: string | number | null): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim().toLowerCase();
    const hoursMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(hour|hr)/);
    if (hoursMatch) {
        const hours = Number(hoursMatch[1]);
        if (!Number.isNaN(hours)) {
            return Math.round(hours * 60);
        }
    }

    const minuteMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(minute|min)/);
    if (minuteMatch) {
        const minutes = Number(minuteMatch[1]);
        if (!Number.isNaN(minutes)) {
            return Math.round(minutes);
        }
    }

    const numberOnly = trimmed.match(/\d+/);
    if (numberOnly) {
        const numeric = Number(numberOnly[0]);
        if (!Number.isNaN(numeric)) {
            return numeric;
        }
    }

    return undefined;
}

/**
 * Calculate end time given start, optional end, and duration.
 */
export function deriveEndTime(
    startTimeLocal?: string | null,
    endTimeLocal?: string | null,
    durationMinutes?: number | string | null
): { endTimeLocal?: string; durationMinutes?: number } {
    const normalizedStart = parseLocalTime(startTimeLocal);
    const normalizedEnd = parseLocalTime(endTimeLocal);
    const parsedDuration = parseDurationMinutes(durationMinutes);

    if (normalizedEnd) {
        return { endTimeLocal: normalizedEnd, durationMinutes: parsedDuration };
    }

    if (!normalizedStart || !parsedDuration) {
        return { endTimeLocal: undefined, durationMinutes: parsedDuration };
    }

    const [startHours, startMinutes] = normalizedStart.split(':').map(Number);
    const totalMinutes = startHours * 60 + startMinutes + parsedDuration;
    const endHours = Math.floor((totalMinutes / 60) % 24);
    const endMinutes = totalMinutes % 60;

    return {
        endTimeLocal: `${endHours.toString().padStart(2, '0')}:${endMinutes
            .toString()
            .padStart(2, '0')}`,
        durationMinutes: parsedDuration,
    };
}

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    '₩': 'KRW',
    '₽': 'RUB',
    '₪': 'ILS',
    '₫': 'VND',
    '₱': 'PHP',
    '₦': 'NGN',
    '₴': 'UAH',
    '₡': 'CRC',
    'A$': 'AUD',
    'C$': 'CAD',
    'NZ$': 'NZD',
    'HK$': 'HKD',
    'S$': 'SGD',
};

const CURRENCY_CODE_REGEX = /\b([A-Z]{3})\b/;

/**
 * Parse price text like "$199", "USD 299", or "$99–$149" into numbers.
 */
export function parsePriceRangeText(
    raw?: string | number | null
): { min?: number; max?: number; currency?: string } | undefined {
    if (raw === undefined || raw === null) {
        return undefined;
    }

    if (typeof raw === 'number') {
        return { min: raw, max: raw };
    }

    const text = raw.trim();
    if (!text) {
        return undefined;
    }

    if (/free/i.test(text)) {
        return { min: 0, max: 0 };
    }

    const symbolEntry = Object.entries(CURRENCY_SYMBOL_MAP).find(([symbol]) => text.includes(symbol));
    const inferredFromSymbol = symbolEntry?.[1];

    const currencyCodeMatch = text.match(CURRENCY_CODE_REGEX);
    const inferredFromCode = currencyCodeMatch ? currencyCodeMatch[1] : undefined;

    const numberMatches = text.match(/\d+[\d.,]*/g);
    if (!numberMatches) {
        return inferredFromSymbol || inferredFromCode
            ? { currency: inferredFromSymbol ?? inferredFromCode }
            : undefined;
    }

    const amounts = numberMatches
        .map((match) => Number(match.replace(/,/g, '')))
        .filter((value) => !Number.isNaN(value));

    if (amounts.length === 0) {
        return inferredFromSymbol || inferredFromCode
            ? { currency: inferredFromSymbol ?? inferredFromCode }
            : undefined;
    }

    const [first, second] = amounts;
    const min = Math.min(first, second ?? first);
    const max = Math.max(first, second ?? first);

    return {
        min,
        max,
        currency: inferredFromSymbol ?? inferredFromCode,
    };
}

/**
 * Normalize a speaker name for comparison/deduplication.
 */
export function normalizeSpeakerName(name: string): string {
    return cleanWhitespace(name)
        .replace(/[,;]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Build a deterministic key for matching speakers in agenda items.
 */
export function buildSpeakerKey(name: string, company?: string | null): string {
    const normalizedName = normalizeSpeakerName(name).toLowerCase();
    const normalizedCompany = company ? cleanWhitespace(company).toLowerCase() : '';
    return `${normalizedName}|${normalizedCompany}`;
}


