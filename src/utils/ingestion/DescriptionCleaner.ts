import { VALIDATION_LIMITS } from '@/config/ingestionConstants';

const HTML_BREAK_PATTERN = /<(br|div|p)\s*\/?>/gi;
const HTML_TAG_PATTERN = /<\/?[^>]+?>/g;
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\([^)]*\)/g;
const INLINE_URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const MULTIPLE_SPACE_PATTERN = /[ \t]{2,}/g;
const MULTIPLE_NEWLINE_PATTERN = /\n{3,}/g;

const MARKETING_PATTERNS: RegExp[] = [
    /from techmeme's event calendar/i,
    /register (today|now)/i,
    /subscribe/i,
    /share on (linkedin|facebook|x|twitter|email)/i,
    /^share$/i,
    /^partner with us/i,
    /^get access/i,
    /^join the .*network/i,
    /^skip to content/i,
    /accessibility( help| statement)?/i,
    /cookie (policy|preferences)/i,
    /privacy policy/i,
    /terms of service/i,
    /book (now|tickets)/i,
    /buy tickets/i,
    /become a sponsor/i,
    /sponsor/i,
    /follow us/i,
    /^meet us/i,
    /^share$/i,
];

const STRIP_LINE_PATTERNS: RegExp[] = [
    /^\s*[-*•]\s*$/u,
    /^\s*#*\s*$/u,
    /^\s*@\w+/,
    /^\s*!\[[^\]]*]\([^)]*\)\s*$/,
];

const MIN_CONTENT_LENGTH = 18;

const ACRONYM_MAX_LENGTH = 3;

const KNOWN_ACRONYMS = new Set([
    'AI',
    'API',
    'APAC',
    'EMEA',
    'USA',
    'UK',
    'UN',
    'NASA',
    'IBM',
    'AWS',
    'GCP',
    'CFP',
    'VR',
    'AR',
    'XR',
    'NFT',
    'IOT',
    'IPO',
    'GTM',
    'DEI',
    'ML',
    'DL',
    'QA',
]);

const LOWERCASE_CONNECTORS = new Set(['AND', 'OR', 'THE', 'WITH', 'FOR', 'IN', 'OF', 'ON', 'AT', 'TO', 'BY', 'FROM']);

const ENTITY_MAP: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&mdash;': '—',
    '&ndash;': '–',
    '&quot;': '"',
    '&#39;': "'",
};

function decodeEntities(value: string): string {
    return value.replace(/&[a-z#0-9]+;/gi, (entity) => ENTITY_MAP[entity.toLowerCase()] ?? entity);
}

function transformSegment(segment: string): string {
    if (!segment) {
        return segment;
    }
    const lettersOnly = segment.replace(/[^A-Za-z]/g, '');
    if (lettersOnly.length === 0) {
        return segment;
    }

    const upperLetters = lettersOnly.toUpperCase();
    if (LOWERCASE_CONNECTORS.has(upperLetters)) {
        const lower = segment.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }

    const upperCandidate = segment.toUpperCase();
    if (lettersOnly.length <= ACRONYM_MAX_LENGTH || KNOWN_ACRONYMS.has(upperLetters)) {
        return upperCandidate;
    }

    const lower = segment.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function transformWord(word: string): string {
    const leading = word.match(/^[^A-Za-z0-9]+/u)?.[0] ?? '';
    const trailing = word.match(/[^A-Za-z0-9]+$/u)?.[0] ?? '';
    const core = word.slice(leading.length, word.length - trailing.length);

    if (!core) {
        return word;
    }

    if (core.includes('-')) {
        const parts = core.split('-').map(transformSegment);
        return `${leading}${parts.join('-')}${trailing}`;
    }

    return `${leading}${transformSegment(core)}${trailing}`;
}

function normalizeUppercaseLine(line: string): string {
    const trimmed = line.trim();
    const lettersOnly = trimmed.replace(/[^A-Za-z]/g, '');
    const isAllCaps = lettersOnly.length >= MIN_CONTENT_LENGTH / 2 && trimmed === trimmed.toUpperCase();
    if (!isAllCaps) {
        return trimmed;
    }

    return trimmed
        .split(/\s+/)
        .map(transformWord)
        .join(' ');
}

function shouldDropLine(line: string): boolean {
    if (!line) {
        return true;
    }
    if (MARKETING_PATTERNS.some((pattern) => pattern.test(line))) {
        return true;
    }
    if (INLINE_URL_PATTERN.test(line)) {
        // reset lastIndex for subsequent checks
        INLINE_URL_PATTERN.lastIndex = 0;
        return true;
    }
    INLINE_URL_PATTERN.lastIndex = 0;
    return STRIP_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

export function cleanEventDescription(raw?: string | null): string | undefined {
    if (!raw) {
        return undefined;
    }

    const text = decodeEntities(raw)
        .replace(/\r\n/g, '\n')
        .replace(HTML_BREAK_PATTERN, '\n')
        .replace(MARKDOWN_IMAGE_PATTERN, '')
        .replace(HTML_TAG_PATTERN, ' ')
        .replace(INLINE_URL_PATTERN, ' ')
        .replace(MULTIPLE_SPACE_PATTERN, ' ')
        .trim();

    if (!text) {
        return undefined;
    }

    const lineBuffer: string[] = [];
    for (const rawLine of text.split('\n')) {
        const decoded = decodeEntities(rawLine).replace(MULTIPLE_SPACE_PATTERN, ' ').trim();
        if (!decoded) {
            continue;
        }

        const normalized = normalizeUppercaseLine(decoded);
        if (shouldDropLine(normalized)) {
            continue;
        }

        const lowerNormalized = normalized.toLowerCase();
        const alreadyExists = lineBuffer.some((existing) => existing.toLowerCase() === lowerNormalized);
        if (!alreadyExists) {
            lineBuffer.push(normalized);
        }
    }

    let cleaned = lineBuffer.join('\n\n').replace(MULTIPLE_NEWLINE_PATTERN, '\n\n').trim();

    if (cleaned.length < MIN_CONTENT_LENGTH) {
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
    }

    if (cleaned.length < MIN_CONTENT_LENGTH) {
        const fallback = lineBuffer[0]?.replace(/\s+/g, ' ').trim();
        return fallback && fallback.length > 0 ? fallback : undefined;
    }

    if (cleaned.length > VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH) {
        cleaned = cleaned.slice(0, VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH).trim();
    }

    return cleaned;
}

export default cleanEventDescription;

