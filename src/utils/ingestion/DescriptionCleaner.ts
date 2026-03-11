import { VALIDATION_LIMITS } from '@/config/ingestionConstants';

const HTML_BREAK_PATTERN = /<(br|div|p)\s*\/?>/gi;
const HTML_TAG_PATTERN = /<\/?[^>]+?>/g;
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\([^)]*\)/g;
const INLINE_URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const MULTIPLE_SPACE_PATTERN = /[ \t]{2,}/g;
const MULTIPLE_NEWLINE_PATTERN = /\n{3,}/g;
const CAMELCASE_BOUNDARY_PATTERN = /([a-z])([A-Z])/g;
const PUNCTUATION_BOUNDARY_PATTERN = /([.!?])([A-Z])/g;

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
const MAX_CONDENSED_SENTENCES = 4;
const MAX_CONDENSED_LENGTH = 700;

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

function collapseRepeatedTitlePhrases(value: string): string {
    let current = value;
    const repeatedPhrasePattern =
        /\b([A-Z0-9][A-Za-z0-9&.+/'’-]*(?:\s+[A-Z0-9][A-Za-z0-9&.+/'’-]*){1,6})\b(?:\s+\1\b){1,}/g;

    while (true) {
        const next = current.replace(repeatedPhrasePattern, '$1');
        if (next === current) {
            return current;
        }
        current = next;
    }
}

function stripOrganizerNoteSection(value: string): string {
    const organizerNotePattern = /\b(?:a\s+)?note from (?:the\s+)?organizers\b/i;
    const match = organizerNotePattern.exec(value);
    if (!match || match.index === undefined) {
        return value;
    }

    return value.slice(0, match.index).trim();
}

function splitIntoSentences(value: string): string[] {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return [];
    }

    const matched = normalized.match(/[^.!?]+[.!?]?/g);
    return (matched ?? [normalized]).map((sentence) => sentence.trim()).filter(Boolean);
}

function stripHeadingPrefixFromSentence(sentence: string): string {
    const tokens = sentence.split(/\s+/).filter(Boolean);
    const firstLowercaseIndex = tokens.findIndex((token) => /^[a-z]/.test(token));

    if (firstLowercaseIndex <= 1) {
        return sentence.trim();
    }

    const prefixTokens = tokens.slice(0, firstLowercaseIndex - 1);
    const prefixLooksLikeHeading =
        prefixTokens.length >= 2 &&
        prefixTokens.every((token) => /^[A-Z0-9][A-Za-z0-9&.+/'’-]*$/.test(token));

    if (!prefixLooksLikeHeading) {
        return sentence.trim();
    }

    return tokens.slice(firstLowercaseIndex - 1).join(' ').trim();
}

function condenseNoisyDescription(value: string): string {
    const sentences = splitIntoSentences(value)
        .map((sentence) => stripHeadingPrefixFromSentence(sentence))
        .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
        .filter((sentence) => sentence.length >= 25)
        .filter((sentence) => !/what can you expect/i.test(sentence));

    if (sentences.length === 0) {
        return value;
    }

    const selected: string[] = [];
    let totalLength = 0;

    for (const sentence of sentences) {
        const canonical = sentence.toLowerCase();
        if (selected.some((existing) => existing.toLowerCase() === canonical)) {
            continue;
        }

        if (selected.length >= MAX_CONDENSED_SENTENCES) {
            break;
        }

        if (selected.length > 0 && totalLength + sentence.length + 1 > MAX_CONDENSED_LENGTH) {
            break;
        }

        selected.push(sentence);
        totalLength += sentence.length + 1;
    }

    return selected.length > 0 ? selected.join(' ') : value;
}

export function cleanEventDescription(raw?: string | null): string | undefined {
    if (!raw) {
        return undefined;
    }

    const text = stripOrganizerNoteSection(
        collapseRepeatedTitlePhrases(
            decodeEntities(raw)
        .replace(/\r\n/g, '\n')
        .replace(CAMELCASE_BOUNDARY_PATTERN, '$1 $2')
        .replace(PUNCTUATION_BOUNDARY_PATTERN, '$1 $2')
        .replace(HTML_BREAK_PATTERN, '\n')
        .replace(MARKDOWN_IMAGE_PATTERN, '')
        .replace(HTML_TAG_PATTERN, ' ')
        .replace(INLINE_URL_PATTERN, ' ')
        .replace(MULTIPLE_SPACE_PATTERN, ' ')
        .trim()
        )
    );

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
    cleaned = stripOrganizerNoteSection(collapseRepeatedTitlePhrases(cleaned));

    const shouldCondense =
        cleaned.length > 900 ||
        splitIntoSentences(cleaned).length > 6 ||
        /\b(?:a\s+)?note from (?:the\s+)?organizers\b/i.test(raw) ||
        /\b([A-Z0-9][A-Za-z0-9&.+/'’-]*(?:\s+[A-Z0-9][A-Za-z0-9&.+/'’-]*){1,6})\b(?:\s+\1\b){1,}/.test(raw);

    if (shouldCondense) {
        cleaned = condenseNoisyDescription(cleaned);
    }

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
