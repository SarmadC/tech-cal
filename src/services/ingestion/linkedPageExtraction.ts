import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import type { ExtractedAgendaItem, ExtractedEventData, ExtractedSpeaker } from '@/types/enrichment';
import type { SpeakerRecord } from '@/types/ingestion';
import { cleanEventDescription } from '@/utils/ingestion/DescriptionCleaner';
import { isDescriptionThin } from '@/utils/ingestion/DescriptionHeuristics';
import { parseDurationMinutes, parseLocalTime } from '@/utils/ingestion/ExtractNormalization';
import {
    extractCoreFieldsFromHtml,
    extractCoreFieldsFromJsonPayload,
    type ExtractedScheduleItem,
    type HtmlCoreExtractionResult,
} from './html';
import type { ExtractionProviderDocument } from './providers/ExtractionProvider';

const BROKEN_STYLESHEET_ERROR = 'Could not parse CSS stylesheet';
const MAX_PROVIDER_DOCUMENTS = 16;
const MAX_PROVIDER_DOCUMENT_CONTENT = 6_000;
const DEFAULT_MAX_HUB_PAGES = 3;
const DEFAULT_MAX_DETAIL_PAGES = 25;
export const DEFAULT_AGENTIC_VENDOR_HOST_ALLOWLIST = [
    'sched.com',
    'sessionize.com',
    'swapcard.com',
    'hopin.com',
    'airmeet.com',
    'goldcast.io',
    'eventfinity.co',
] as const;

const AGENDA_KEYWORDS = /(agenda|schedule|program|timetable|itinerary|session list|conference program|tracks?|talks?)/i;
const SPEAKER_KEYWORDS = /(speakers?|presenters?|panelists?|experts?|instructors?|hosts?)/i;
const SESSION_DETAIL_KEYWORDS = /(session details?|view session|session page|speaker profile|profile)/i;
const NOISE_LINK_KEYWORDS = /(register|registration|tickets?|pricing|sponsor|exhibitor|venue|hotel|travel|faq|contact|privacy|terms)/i;
const AGENDA_PATH_HINTS = /(\/agenda(?:\/|$)|\/schedule(?:\/|$)|\/program(?:\/|$)|\/talks?(?:\/|$))/i;
const TRACK_HUB_PATH_HINTS = /\/track\/[^/]+\/[^/?#]+$/i;
const SESSION_PATH_HINTS = /(\/sessions?\/[^/?#]+|\/agenda\/[^/]+\/|\/program\/[^/]+\/|\/talks?\/[^/?#]+|\/tracks?\/[^/]+\/[^/]+\/[^/]+|\/presentation\/[^/]+\/[^/?#]+|\/speaker\/[^/]+)/i;
const REGISTRATION_CTA_KEYWORDS = /\b(register|registration|tickets?|buy tickets?|get tickets?|reserve (?:your )?spot|book now|sign up)\b/i;
const DAY_SWITCH_KEYWORDS = /\b(pre-event|day\s+\d+|day one|day two|day three|day four|workshop day)\b/i;
const LOAD_MORE_KEYWORDS = /\b(load more|show more|view more|see more|more sessions|more talks|show all)\b/i;
const EXPAND_SECTION_KEYWORDS = /\b(details|expand|show details|view details|learn more|read more|more info)\b/i;
const ABSOLUTE_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}/i;
const OFFSET_WITHOUT_COLON_PATTERN = /([+-]\d{2})(\d{2})$/;

export type LinkedPageKind = 'primary' | 'agenda' | 'speakers' | 'session';
export type PageInteractionType = 'switch_day' | 'expand_section' | 'load_more';

export interface PageInteractionCandidate {
    id: string;
    actionType: PageInteractionType;
    label: string;
    selector: string;
    pageUrl: string;
    score: number;
    kind: Extract<LinkedPageKind, 'agenda' | 'session'>;
}

export interface InteractionSignals {
    expectedAgendaDays?: number;
    detectedDayLabels?: string[];
    collapsedAgendaCount?: number;
    loadMoreCount?: number;
}

export interface LinkedPageDocument {
    kind: LinkedPageKind;
    label: string;
    url: string;
    content: string;
    extracted: HtmlCoreExtractionResult;
    evidenceSource?: 'page_html' | 'embedded_json' | 'interaction' | 'network_json';
    originActionLabel?: string;
    candidateLinks?: CandidateLink[];
    interactionCandidates?: PageInteractionCandidate[];
    interactionSignals?: InteractionSignals;
    registrationCtaUrls?: string[];
}

export interface CandidateLink {
    url: string;
    label: string;
    kind: Exclude<LinkedPageKind, 'primary'>;
    score: number;
    host: string;
}

export interface PageLoadResult {
    html: string;
    finalUrl?: string;
    evidenceSource?: 'page_html' | 'interaction';
    originActionLabel?: string;
    capturedPayloads?: Array<{
        url: string;
        contentType?: string;
        bodyText: string;
    }>;
}

export interface LinkedPageCollectionOptions {
    sourceUrl: string;
    html: string;
    finalUrl?: string;
    loadPage: (url: string) => Promise<PageLoadResult>;
    maxHubPages?: number;
    maxDetailPages?: number;
    allowedHosts?: string[];
}

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const normalizeText = (value?: string | null): string =>
    (value ?? '').replace(/\s+/g, ' ').trim();

const normalizeNameKey = (value: string): string =>
    normalizeText(value).toLowerCase();

const normalizeUrlForTraversal = (rawUrl: string): string | null => {
    try {
        const parsed = new URL(rawUrl);
        parsed.hash = '';
        return parsed.toString();
    } catch {
        return null;
    }
};

const normalizeAllowedHost = (host: string): string =>
    host.trim().toLowerCase().replace(/^www\./, '');

const matchesAllowedHost = (hostname: string, allowedHost: string): boolean => {
    const normalizedHostname = normalizeAllowedHost(hostname);
    const normalizedAllowedHost = normalizeAllowedHost(allowedHost);

    return (
        normalizedHostname === normalizedAllowedHost
        || normalizedHostname.endsWith(`.${normalizedAllowedHost}`)
    );
};

const buildAllowedHosts = (baseHostname: string, additionalHosts: string[] = []): string[] =>
    Array.from(
        new Set(
            [baseHostname, normalizeAllowedHost(baseHostname), ...additionalHosts.map(normalizeAllowedHost)]
                .filter(Boolean)
        )
    );

const cssEscape = (value: string): string =>
    value.replace(/["\\]/g, '\\$&');

const buildElementSelector = (element: Element): string => {
    const htmlElement = element as HTMLElement;
    const id = htmlElement.getAttribute('id');
    if (id) {
        return `#${cssEscape(id)}`;
    }

    const testId =
        htmlElement.getAttribute('data-testid')
        || htmlElement.getAttribute('data-test')
        || htmlElement.getAttribute('data-qa');
    if (testId) {
        return `[data-testid="${cssEscape(testId)}"], [data-test="${cssEscape(testId)}"], [data-qa="${cssEscape(testId)}"]`;
    }

    const href = htmlElement.getAttribute('href');
    if (element.tagName.toLowerCase() === 'a' && href) {
        return `a[href="${cssEscape(href)}"]`;
    }

    const ariaControls = htmlElement.getAttribute('aria-controls');
    if (ariaControls) {
        return `${element.tagName.toLowerCase()}[aria-controls="${cssEscape(ariaControls)}"]`;
    }

    const parts: string[] = [];
    let current: Element | null = element;
    while (current && current.tagName.toLowerCase() !== 'html') {
        const parent: Element | null = current.parentElement;
        const siblings = parent
            ? Array.from(parent.children).filter((child: Element) => child.tagName === current?.tagName)
            : [];
        const index = siblings.length > 1 ? siblings.indexOf(current) + 1 : 0;
        const selector = `${current.tagName.toLowerCase()}${index > 0 ? `:nth-of-type(${index})` : ''}`;
        parts.unshift(selector);
        current = parent;
    }

    return parts.join(' > ');
};

const hashInteractionId = (value: string): string => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }

    return Math.abs(hash).toString(36);
};

const scoreInteractionCandidate = (actionType: PageInteractionType, label: string): number => {
    const normalizedLabel = label.toLowerCase();
    let score = 70;

    if (actionType === 'switch_day') {
        score = 95;
    } else if (actionType === 'load_more') {
        score = 85;
    }

    if (/agenda|schedule|program|session|talk/.test(normalizedLabel)) {
        score += 5;
    }

    return score;
};

const classifyInteractionElement = (element: HTMLElement): PageInteractionType | null => {
    const text = [
        element.textContent,
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
    ]
        .filter(isNonEmptyString)
        .join(' ')
        .toLowerCase();

    if (!text) {
        return null;
    }

    if (DAY_SWITCH_KEYWORDS.test(text) || element.getAttribute('role') === 'tab') {
        return 'switch_day';
    }

    if (LOAD_MORE_KEYWORDS.test(text)) {
        return 'load_more';
    }

    if (
        EXPAND_SECTION_KEYWORDS.test(text)
        || element.getAttribute('aria-expanded') === 'false'
        || element.tagName.toLowerCase() === 'summary'
    ) {
        return 'expand_section';
    }

    return null;
};

const discoverInteractionCandidates = (
    html: string,
    baseUrl: string,
): { candidates: PageInteractionCandidate[]; signals: InteractionSignals } => {
    let document: Document;
    try {
        document = new JSDOM(html, { url: baseUrl }).window.document;
    } catch {
        return { candidates: [], signals: {} };
    }

    const seenIds = new Set<string>();
    const dayLabels = new Set<string>();
    let collapsedAgendaCount = 0;
    let loadMoreCount = 0;

    const candidates: PageInteractionCandidate[] = [];
    const actionableElements = Array.from(
        document.querySelectorAll<HTMLElement>('button, [role="tab"], a[href], summary, [aria-controls]')
    );

    actionableElements.forEach((element) => {
        const actionType = classifyInteractionElement(element);
        if (!actionType) {
            return;
        }

        const label = normalizeText(
            [
                element.textContent,
                element.getAttribute('aria-label'),
                element.getAttribute('title'),
            ]
                .filter(isNonEmptyString)
                .join(' ')
        );
        if (!label) {
            return;
        }

        const selector = buildElementSelector(element);
        const id = `${actionType}:${hashInteractionId(`${baseUrl}|${label}|${selector}`)}`;
        if (seenIds.has(id)) {
            return;
        }
        seenIds.add(id);

        if (actionType === 'switch_day') {
            dayLabels.add(label);
        } else if (actionType === 'expand_section') {
            collapsedAgendaCount += 1;
        } else if (actionType === 'load_more') {
            loadMoreCount += 1;
        }

        candidates.push({
            id,
            actionType,
            label,
            selector,
            pageUrl: baseUrl,
            score: scoreInteractionCandidate(actionType, label),
            kind: 'agenda',
        });
    });

    return {
        candidates,
        signals: {
            expectedAgendaDays: dayLabels.size >= 2 ? dayLabels.size : undefined,
            detectedDayLabels: dayLabels.size > 0 ? Array.from(dayLabels) : undefined,
            collapsedAgendaCount: collapsedAgendaCount || undefined,
            loadMoreCount: loadMoreCount || undefined,
        },
    };
};

const inferAgendaType = (...values: Array<string | undefined>): string | undefined => {
    const combined = values.filter(isNonEmptyString).join(' ').toLowerCase();
    if (!combined) return undefined;

    if (/(keynote|opening remarks|closing remarks)/.test(combined)) return 'keynote';
    if (/(workshop|hands-on|lab)/.test(combined)) return 'workshop';
    if (/(panel|fireside chat|roundtable)/.test(combined)) return 'panel';
    if (/(networking|meetup|reception|happy hour|coffee|run & coffee)/.test(combined)) return 'networking';
    if (/(break|intermission)/.test(combined)) return 'break';
    if (/(registration|check-in|doors open)/.test(combined)) return 'registration';
    if (/(lunch|breakfast|dinner|meal)/.test(combined)) return 'meal';
    if (/(expo|exhibit|booth)/.test(combined)) return 'exhibition';
    if (/(support|office hours|qa|q&a)/.test(combined)) return 'support';
    if (/(talk|session|presentation)/.test(combined)) return 'talk';
    return 'other';
};

const toAgendaTime = (value?: string): string | undefined => {
    if (!value) return undefined;
    const normalizedValue = normalizeText(value);
    if (ABSOLUTE_DATETIME_PATTERN.test(normalizedValue)) {
        const absoluteDate = new Date(normalizedValue);
        if (!Number.isNaN(absoluteDate.getTime())) {
            if (/z$/i.test(normalizedValue) || /[+-]\d{2}:\d{2}$/i.test(normalizedValue)) {
                return normalizedValue;
            }
            if (OFFSET_WITHOUT_COLON_PATTERN.test(normalizedValue)) {
                return normalizedValue.replace(OFFSET_WITHOUT_COLON_PATTERN, '$1:$2');
            }
            return normalizedValue;
        }
    }
    return parseLocalTime(normalizedValue) ?? normalizedValue;
};

const extractAgendaTimes = (
    startValue?: string,
    endValue?: string,
): { startTime?: string; endTime?: string } => {
    if (endValue) {
        return {
            startTime: toAgendaTime(startValue),
            endTime: toAgendaTime(endValue),
        };
    }

    const normalizedStart = normalizeText(startValue);
    if (!normalizedStart) {
        return {};
    }

    const rangeMatch = normalizedStart.match(/^(.+?)\s*(?:-|–|to)\s*(.+)$/i);
    if (rangeMatch) {
        return {
            startTime: toAgendaTime(rangeMatch[1]),
            endTime: toAgendaTime(rangeMatch[2]),
        };
    }

    return {
        startTime: toAgendaTime(normalizedStart),
        endTime: undefined,
    };
};

const toAgendaDuration = (startTime?: string, endTime?: string): number | undefined => {
    const normalizedStart = toAgendaTime(startTime);
    const normalizedEnd = toAgendaTime(endTime);
    if (!normalizedStart || !normalizedEnd) {
        return undefined;
    }

    const startMatch = normalizedStart.match(/^(\d{2}):(\d{2})$/);
    const endMatch = normalizedEnd.match(/^(\d{2}):(\d{2})$/);
    if (!startMatch || !endMatch) {
        return undefined;
    }

    const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
    const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
    let duration = endMinutes - startMinutes;
    if (duration < 0) {
        duration += 24 * 60;
    }

    return parseDurationMinutes(duration);
};

const buildAgendaKey = (item: Partial<ExtractedAgendaItem>): string => {
    const title = normalizeText(item.title);
    const start = normalizeText(item.startTime);
    const day = item.dayNumber ?? 0;
    const location = normalizeText(item.location).toLowerCase();
    return `${title.toLowerCase()}|${start}|${day}|${location}`;
};

const extractAgendaDateKey = (value?: string): string | undefined => {
    const normalized = normalizeText(value);
    const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1];
};

const extractAgendaClockKey = (value?: string): string | undefined => {
    const normalized = normalizeText(value);
    if (!normalized) {
        return undefined;
    }

    const absoluteMatch = normalized.match(/^\d{4}-\d{2}-\d{2}t(\d{2}:\d{2})/i);
    if (absoluteMatch) {
        return absoluteMatch[1];
    }

    const localTime = parseLocalTime(normalized);
    if (localTime) {
        return localTime;
    }

    const timeMatch = normalized.match(/^(\d{1,2}:\d{2})/);
    if (!timeMatch) {
        return undefined;
    }

    const [hours, minutes] = timeMatch[1].split(':').map(Number);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const buildAgendaMatchBaseKey = (item: Partial<ExtractedAgendaItem>): string | undefined => {
    const title = normalizeText(item.title).toLowerCase();
    const location = normalizeText(item.location).toLowerCase();
    const clock = extractAgendaClockKey(item.startTime);

    if (!title || !clock) {
        return undefined;
    }

    return `${title}|${location}|${clock}`;
};

const buildAgendaSpecificMatchKey = (item: Partial<ExtractedAgendaItem>): string | undefined => {
    const baseKey = buildAgendaMatchBaseKey(item);
    if (!baseKey) {
        return undefined;
    }

    if (item.dayNumber != null) {
        return `${baseKey}|day:${item.dayNumber}`;
    }

    const dateKey = extractAgendaDateKey(item.startTime);
    if (dateKey) {
        return `${baseKey}|date:${dateKey}`;
    }

    return undefined;
};

const buildSpeakerKey = (speaker: Partial<ExtractedSpeaker>): string => {
    const linkedIn = normalizeText(speaker.linkedinUrl);
    if (linkedIn) {
        return `linkedin:${linkedIn.toLowerCase()}`;
    }
    return `name:${normalizeNameKey(speaker.name ?? '')}`;
};

const mergeSpeaker = (
    preferred: Partial<ExtractedSpeaker>,
    fallback: Partial<ExtractedSpeaker>,
): ExtractedSpeaker => ({
    name: preferred.name ?? fallback.name ?? '',
    title: preferred.title ?? fallback.title,
    company: preferred.company ?? fallback.company,
    bio: preferred.bio ?? fallback.bio,
    linkedinUrl: preferred.linkedinUrl ?? fallback.linkedinUrl,
    photoUrl: preferred.photoUrl ?? fallback.photoUrl,
    twitterUrl: preferred.twitterUrl ?? fallback.twitterUrl,
    websiteUrl: preferred.websiteUrl ?? fallback.websiteUrl,
});

const mergeAgendaItem = (
    preferred: Partial<ExtractedAgendaItem>,
    fallback: Partial<ExtractedAgendaItem>,
): ExtractedAgendaItem => {
    const topics = Array.from(new Set([...(preferred.topics ?? []), ...(fallback.topics ?? [])])).filter(Boolean);

    return {
        title: preferred.title ?? fallback.title ?? '',
        startTime: preferred.startTime ?? fallback.startTime,
        endTime: preferred.endTime ?? fallback.endTime,
        description: preferred.description ?? fallback.description,
        location: preferred.location ?? fallback.location,
        track: preferred.track ?? fallback.track,
        topics: topics.length > 0 ? topics : undefined,
        dayNumber: preferred.dayNumber ?? fallback.dayNumber,
        agendaType: preferred.agendaType ?? fallback.agendaType,
        difficultyLevel: preferred.difficultyLevel ?? fallback.difficultyLevel,
        capacity: preferred.capacity ?? fallback.capacity,
        prerequisites: preferred.prerequisites ?? fallback.prerequisites,
        isRequired: preferred.isRequired ?? fallback.isRequired,
        durationMinutes: preferred.durationMinutes ?? fallback.durationMinutes,
        speakers: Array.from(new Set([...(preferred.speakers ?? []), ...(fallback.speakers ?? [])])).filter(Boolean),
    };
};

const pickRicherText = (
    current?: string,
    candidate?: string,
): string | undefined => {
    const normalizedCurrent = normalizeText(current);
    const normalizedCandidate = normalizeText(candidate);

    if (!normalizedCurrent) {
        return normalizedCandidate;
    }

    if (!normalizedCandidate) {
        return normalizedCurrent;
    }

    const currentThin = isDescriptionThin(normalizedCurrent);
    const candidateThin = isDescriptionThin(normalizedCandidate);
    if (currentThin && candidateThin) {
        return normalizedCandidate;
    }
    if (currentThin !== candidateThin) {
        return currentThin ? normalizedCandidate : normalizedCurrent;
    }

    return normalizedCandidate.length > normalizedCurrent.length * 1.1
        ? normalizedCandidate
        : normalizedCurrent;
};

const mergePricing = (
    preferred: ExtractedEventData['pricing'],
    fallback: ExtractedEventData['pricing'],
): ExtractedEventData['pricing'] => {
    if (!preferred) return fallback;
    if (!fallback) return preferred;

    return {
        priceMin: preferred.priceMin ?? fallback.priceMin,
        priceMax: preferred.priceMax ?? fallback.priceMax,
        currency: preferred.currency ?? fallback.currency,
        pricingType: preferred.pricingType ?? fallback.pricingType,
    };
};

const stripNonContentMarkup = (html: string): string =>
    html
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<canvas\b[^>]*>[\s\S]*?<\/canvas>/gi, ' ')
        .replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, ' ');

const fallbackTextFromHtml = (html: string): string =>
    html
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/\s+/g, ' ')
        .trim();

const extractReadableText = (html: string): string => {
    const sanitizedHtml = stripNonContentMarkup(html);

    try {
        const virtualConsole = new VirtualConsole();
        virtualConsole.on('jsdomError', (error: Error) => {
            if (error.message.includes(BROKEN_STYLESHEET_ERROR)) {
                return;
            }
            console.warn('[linkedPageExtraction] JSDOM parse warning:', error.message);
        });

        const dom = new JSDOM(sanitizedHtml, { virtualConsole });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        const text = normalizeText(article?.textContent || dom.window.document.body?.textContent || '');
        if (text) {
            return text;
        }
    } catch {
        // Fall back below.
    }

    return fallbackTextFromHtml(sanitizedHtml);
};

const summarizeExtraction = (extracted: HtmlCoreExtractionResult): string => {
    const lines: string[] = [];

    if (isNonEmptyString(extracted.title)) {
        lines.push(`Title: ${normalizeText(extracted.title)}`);
    }
    if (isNonEmptyString(extracted.description)) {
        lines.push(`Description: ${normalizeText(extracted.description)}`);
    }
    if (isNonEmptyString(extracted.location)) {
        lines.push(`Location: ${normalizeText(extracted.location)}`);
    }
    if (extracted.schedule && extracted.schedule.length > 0) {
        lines.push('Agenda:');
        extracted.schedule.slice(0, 20).forEach((item) => {
            const title = normalizeText(item.title) || 'Untitled';
            const start = normalizeText(item.startTime || item.date);
            const end = normalizeText(item.endTime);
            const track = normalizeText(item.track);
            const location = normalizeText(item.location);
            const speakers = (item.speakers ?? []).map(normalizeText).filter(Boolean).join(', ');
            lines.push(
                `- ${title}${start ? ` | start ${start}` : ''}${end ? ` | end ${end}` : ''}${track ? ` | track ${track}` : ''}${location ? ` | room ${location}` : ''}${speakers ? ` | speakers ${speakers}` : ''}`
            );
        });
    }
    if (extracted.speakers && extracted.speakers.length > 0) {
        lines.push('Speakers:');
        extracted.speakers.slice(0, 20).forEach((speaker) => {
            const parts = [speaker.name, speaker.title, speaker.company].filter(Boolean).join(' | ');
            if (parts) {
                lines.push(`- ${parts}`);
            }
        });
    }

    return lines.join('\n');
};

const buildDocumentContent = (html: string, extracted: HtmlCoreExtractionResult): string => {
    const summary = summarizeExtraction(extracted);
    const readable = extractReadableText(html);
    const combined = [summary, readable].filter(Boolean).join('\n\n');
    return combined.slice(0, MAX_PROVIDER_DOCUMENT_CONTENT);
};

const buildPayloadDocumentContent = (payloadText: string, extracted: HtmlCoreExtractionResult): string => {
    const summary = summarizeExtraction(extracted);
    const combined = [summary, payloadText].filter(Boolean).join('\n\n');
    return combined.slice(0, MAX_PROVIDER_DOCUMENT_CONTENT);
};

export const buildLinkedPageDocumentFromHtml = (
    html: string,
    url: string,
    kind: LinkedPageKind,
    label: string,
    allowedHosts: string[] = [],
    metadata: {
        evidenceSource?: LinkedPageDocument['evidenceSource'];
        originActionLabel?: string;
    } = {},
): LinkedPageDocument => {
    const extracted = extractCoreFieldsFromHtml(html, url);
    const interaction = discoverInteractionCandidates(html, url);
    return {
        kind,
        label,
        url,
        content: buildDocumentContent(html, extracted),
        extracted,
        evidenceSource: metadata.evidenceSource ?? 'page_html',
        originActionLabel: metadata.originActionLabel,
        candidateLinks: discoverCandidateLinks(html, url, allowedHosts),
        interactionCandidates: interaction.candidates,
        interactionSignals: interaction.signals,
        registrationCtaUrls: discoverRegistrationCtaUrls(html, url),
    };
};

export const buildLinkedPageDocumentFromJsonPayload = (
    payloadText: string,
    url: string,
    kind: LinkedPageKind,
    label: string,
    metadata: {
        evidenceSource?: LinkedPageDocument['evidenceSource'];
        originActionLabel?: string;
    } = {},
): LinkedPageDocument | null => {
    try {
        const parsedPayload = JSON.parse(payloadText) as unknown;
        const extracted = extractCoreFieldsFromJsonPayload(parsedPayload, url, 'network.json');

        return {
            kind,
            label,
            url,
            content: buildPayloadDocumentContent(payloadText, extracted),
            extracted,
            evidenceSource: metadata.evidenceSource ?? 'network_json',
            originActionLabel: metadata.originActionLabel,
            candidateLinks: [],
            interactionCandidates: [],
            interactionSignals: {},
            registrationCtaUrls: [],
        };
    } catch {
        return null;
    }
};

const anchorScore = (kind: Exclude<LinkedPageKind, 'primary'>, path: string, text: string): number => {
    let score = kind === 'session' ? 40 : 60;
    if (kind === 'agenda' && /agenda|schedule|talks?/.test(path)) score += 20;
    if (kind === 'speakers' && /speakers?|presenters?/.test(path)) score += 20;
    if (kind === 'session' && SESSION_PATH_HINTS.test(path)) score += 25;
    if (/view|details?|profile/.test(text)) score += 5;
    return score;
};

const classifyCandidateLink = (
    anchor: HTMLAnchorElement,
    baseUrl: string,
    allowedHosts: string[],
): CandidateLink | null => {
    const rawHref = anchor.getAttribute('href');
    if (!rawHref) return null;

    let resolved: URL;
    try {
        resolved = new URL(rawHref, baseUrl);
    } catch {
        return null;
    }

    if (!['http:', 'https:'].includes(resolved.protocol)) {
        return null;
    }
    if (!allowedHosts.some((allowedHost) => matchesAllowedHost(resolved.hostname, allowedHost))) {
        return null;
    }

    const normalizedUrl = normalizeUrlForTraversal(resolved.toString());
    if (!normalizedUrl) {
        return null;
    }

    const label = normalizeText(anchor.textContent);
    const text = label.toLowerCase();
    const path = `${resolved.pathname}${resolved.search}`.toLowerCase();
    const combined = `${text} ${path}`;

    if (!combined || NOISE_LINK_KEYWORDS.test(combined)) {
        return null;
    }

    let kind: Exclude<LinkedPageKind, 'primary'> | null = null;
    if (TRACK_HUB_PATH_HINTS.test(path)) {
        kind = 'agenda';
    } else if (SESSION_PATH_HINTS.test(path) || SESSION_DETAIL_KEYWORDS.test(combined)) {
        kind = 'session';
    } else if (SPEAKER_KEYWORDS.test(combined)) {
        kind = 'speakers';
    } else if (AGENDA_PATH_HINTS.test(path) || AGENDA_KEYWORDS.test(combined)) {
        kind = 'agenda';
    }

    if (!kind) {
        return null;
    }

    return {
        url: normalizedUrl,
        label: label || resolved.pathname,
        kind,
        score: anchorScore(kind, path, text),
        host: resolved.hostname,
    };
};

const discoverRegistrationCtaUrls = (
    html: string,
    baseUrl: string,
): string[] => {
    let document: Document;
    try {
        document = new JSDOM(html, { url: baseUrl }).window.document;
    } catch {
        return [];
    }

    const seen = new Set<string>();
    const urls: string[] = [];

    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).forEach((anchor) => {
        const rawHref = anchor.getAttribute('href');
        if (!rawHref) {
            return;
        }

        let resolved: URL;
        try {
            resolved = new URL(rawHref, baseUrl);
        } catch {
            return;
        }

        if (!['http:', 'https:'].includes(resolved.protocol)) {
            return;
        }

        const label = [
            anchor.textContent,
            anchor.getAttribute('aria-label'),
            anchor.getAttribute('title'),
        ]
            .filter(isNonEmptyString)
            .join(' ');
        const combined = `${label} ${resolved.pathname} ${resolved.search}`.toLowerCase();
        if (!REGISTRATION_CTA_KEYWORDS.test(combined)) {
            return;
        }

        const normalizedUrl = normalizeUrlForTraversal(resolved.toString());
        if (!normalizedUrl || seen.has(normalizedUrl)) {
            return;
        }

        seen.add(normalizedUrl);
        urls.push(normalizedUrl);
    });

    return urls;
};

export const discoverCandidateLinks = (
    html: string,
    baseUrl: string,
    allowedHosts: string[] = [],
): CandidateLink[] => {
    let document: Document;
    try {
        document = new JSDOM(html, { url: baseUrl }).window.document;
    } catch {
        return [];
    }

    const seen = new Set<string>();
    const candidates: CandidateLink[] = [];

    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).forEach((anchor) => {
        const candidate = classifyCandidateLink(anchor, baseUrl, allowedHosts);
        if (!candidate || seen.has(candidate.url)) {
            return;
        }
        seen.add(candidate.url);
        candidates.push(candidate);
    });

    return candidates.sort((a, b) => b.score - a.score);
};

const mergeScheduleItems = (
    existing: ExtractedScheduleItem[],
    additions: ExtractedScheduleItem[],
): ExtractedScheduleItem[] => {
    const merged = [...existing];
    const keyToIndex = new Map<string, number>();

    merged.forEach((item, index) => {
        keyToIndex.set(buildAgendaKey({
            title: item.title,
            startTime: toAgendaTime(item.startTime || item.date),
            dayNumber: item.dayNumber,
            location: item.location,
        }), index);
    });

    additions.forEach((item) => {
        const { startTime, endTime } = extractAgendaTimes(item.startTime || item.date, item.endTime);
        const normalizedItem: ExtractedScheduleItem = {
            ...item,
            startTime,
            endTime,
            speakers: Array.from(new Set((item.speakers ?? []).map(normalizeText).filter(Boolean))),
            topics: (() => {
                const topics = Array.from(new Set((item.topics ?? []).map(normalizeText).filter(Boolean)));
                return topics.length > 0 ? topics : undefined;
            })(),
            title: normalizeText(item.title),
            description: isNonEmptyString(item.description) ? item.description.trim() : undefined,
            location: isNonEmptyString(item.location) ? item.location.trim() : undefined,
            track: isNonEmptyString(item.track) ? item.track.trim() : undefined,
        };

        const key = buildAgendaKey({
            title: normalizedItem.title,
            startTime: normalizedItem.startTime,
            dayNumber: normalizedItem.dayNumber,
            location: normalizedItem.location,
        });
        let existingIndex = keyToIndex.get(key);

        if (existingIndex === undefined && normalizedItem.title) {
            existingIndex = merged.findIndex((existing) =>
                normalizeText(existing.title).toLowerCase() === normalizedItem.title?.toLowerCase()
                && (existing.dayNumber ?? 0) === (normalizedItem.dayNumber ?? 0)
            );
            if (existingIndex >= 0) {
                keyToIndex.set(key, existingIndex);
            } else {
                existingIndex = undefined;
            }
        }

        if (existingIndex === undefined) {
            keyToIndex.set(key, merged.length);
            merged.push(normalizedItem);
            return;
        }

        const current = merged[existingIndex];
        merged[existingIndex] = {
            ...current,
            title: current.title || normalizedItem.title,
            startTime: current.startTime || normalizedItem.startTime,
            endTime: current.endTime || normalizedItem.endTime,
            description: pickRicherText(current.description, normalizedItem.description),
            location: current.location || normalizedItem.location,
            track: pickRicherText(current.track, normalizedItem.track),
            topics: (() => {
                const topics = Array.from(new Set([...(current.topics ?? []), ...(normalizedItem.topics ?? [])]));
                return topics.length > 0 ? topics : undefined;
            })(),
            dayNumber: current.dayNumber || normalizedItem.dayNumber,
            speakers: Array.from(new Set([...(current.speakers ?? []), ...(normalizedItem.speakers ?? [])])),
        };
    });

    return merged;
};

const mergeSpeakerRecords = (
    existing: SpeakerRecord[],
    additions: SpeakerRecord[],
): SpeakerRecord[] => {
    const merged = [...existing];
    const keyToIndex = new Map<string, number>();

    merged.forEach((speaker, index) => {
        const key = speaker.linkedinUrl
            ? `linkedin:${speaker.linkedinUrl.toLowerCase()}`
            : `name:${normalizeNameKey(speaker.name)}`;
        keyToIndex.set(key, index);
    });

    additions.forEach((speaker) => {
        const key = speaker.linkedinUrl
            ? `linkedin:${speaker.linkedinUrl.toLowerCase()}`
            : `name:${normalizeNameKey(speaker.name)}`;
        const existingIndex = keyToIndex.get(key);

        if (existingIndex === undefined) {
            keyToIndex.set(key, merged.length);
            merged.push(speaker);
            return;
        }

        const current = merged[existingIndex];
        merged[existingIndex] = {
            name: current.name || speaker.name,
            title: current.title || speaker.title,
            company: current.company || speaker.company,
            bio: current.bio || speaker.bio,
            linkedinUrl: current.linkedinUrl || speaker.linkedinUrl,
            githubUrl: current.githubUrl || speaker.githubUrl,
            photoUrl: current.photoUrl || speaker.photoUrl,
            twitterUrl: current.twitterUrl || speaker.twitterUrl,
            websiteUrl: current.websiteUrl || speaker.websiteUrl,
        };
    });

    return merged;
};

const toSyntheticScheduleItem = (document: LinkedPageDocument): ExtractedScheduleItem | null => {
    if (document.kind !== 'session') {
        return null;
    }

    const title = normalizeText(document.extracted.title);
    if (!title) {
        return null;
    }

    const hasSessionSignals = document.extracted.startTime
        || document.extracted.endTime
        || (document.extracted.speakers?.length ?? 0) > 0
        || isNonEmptyString(document.extracted.description);

    if (!hasSessionSignals) {
        return null;
    }

    return {
        title,
        startTime: toAgendaTime(document.extracted.startTime),
        endTime: toAgendaTime(document.extracted.endTime),
        description: document.extracted.description,
        location: document.extracted.location,
        speakers: document.extracted.speakers?.map((speaker) => speaker.name).filter(Boolean),
    };
};

export async function collectLinkedPageDocuments(
    options: LinkedPageCollectionOptions,
): Promise<LinkedPageDocument[]> {
    const baseUrl = options.finalUrl ?? options.sourceUrl;
    let parsedBase: URL;
    try {
        parsedBase = new URL(baseUrl);
    } catch {
        return [buildLinkedPageDocumentFromHtml(options.html, options.sourceUrl, 'primary', 'Primary page')];
    }

    const allowedHosts = buildAllowedHosts(parsedBase.hostname, options.allowedHosts);
    const primary = buildLinkedPageDocumentFromHtml(
        options.html,
        baseUrl,
        'primary',
        'Primary page',
        allowedHosts
    );
    const documents: LinkedPageDocument[] = [primary];
    const seenUrls = new Set<string>();
    const normalizedBaseUrl = normalizeUrlForTraversal(baseUrl);
    if (normalizedBaseUrl) {
        seenUrls.add(normalizedBaseUrl);
    }

    const maxHubPages = options.maxHubPages ?? DEFAULT_MAX_HUB_PAGES;
    const maxDetailPages = options.maxDetailPages ?? DEFAULT_MAX_DETAIL_PAGES;
    let remainingHubPages = maxHubPages;
    let remainingDetailPages = maxDetailPages;

    const queue = discoverCandidateLinks(options.html, baseUrl, allowedHosts);
    if (primary.extracted.agendaUrl) {
        try {
            const agendaCandidate = new URL(primary.extracted.agendaUrl, baseUrl);
            if (!allowedHosts.some((allowedHost) => matchesAllowedHost(agendaCandidate.hostname, allowedHost))) {
                throw new Error('agenda_url_host_not_allowed');
            }
            const resolvedAgendaUrl = normalizeUrlForTraversal(agendaCandidate.toString());
            if (resolvedAgendaUrl && !seenUrls.has(resolvedAgendaUrl)) {
                queue.unshift({
                    url: resolvedAgendaUrl,
                    label: 'Agenda page',
                    kind: 'agenda',
                    score: 100,
                    host: agendaCandidate.hostname,
                });
            }
        } catch {
            // Ignore invalid linked agenda URLs.
        }
    }

    while (queue.length > 0) {
        const candidate = queue.shift();
        if (!candidate || seenUrls.has(candidate.url)) {
            continue;
        }

        if (candidate.kind === 'session' && remainingDetailPages <= 0) {
            continue;
        }
        if (candidate.kind !== 'session' && remainingHubPages <= 0) {
            continue;
        }

        seenUrls.add(candidate.url);

        try {
            const page = await options.loadPage(candidate.url);
            const finalUrl = normalizeUrlForTraversal(page.finalUrl ?? candidate.url) ?? candidate.url;

            if (seenUrls.has(finalUrl) && finalUrl !== candidate.url) {
                continue;
            }
            seenUrls.add(finalUrl);

            const document = buildLinkedPageDocumentFromHtml(
                page.html,
                finalUrl,
                candidate.kind,
                candidate.label,
                allowedHosts
            );
            documents.push(document);

            if (candidate.kind === 'session') {
                remainingDetailPages -= 1;
            } else {
                remainingHubPages -= 1;
            }

            if (candidate.kind !== 'session' && remainingDetailPages > 0) {
                const discovered = discoverCandidateLinks(page.html, finalUrl, allowedHosts)
                    .filter((item) => item.kind === 'session' || item.kind !== candidate.kind)
                    .sort((a, b) => b.score - a.score);

                for (const next of discovered) {
                    if (!seenUrls.has(next.url)) {
                        queue.push(next);
                    }
                }

                queue.sort((a, b) => b.score - a.score);
            }
        } catch (error) {
            console.warn('[linkedPageExtraction] Failed to load linked page', {
                url: candidate.url,
                kind: candidate.kind,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return documents;
}

export function mergeLinkedPageExtractions(documents: LinkedPageDocument[]): HtmlCoreExtractionResult {
    if (documents.length === 0) {
        return {
            confidence: {},
            provenance: { sources: [], usedReadability: false, jsonLdCount: 0 },
        };
    }

    const [primary, ...related] = documents;
    const merged: HtmlCoreExtractionResult = {
        ...primary.extracted,
        confidence: { ...primary.extracted.confidence },
        provenance: {
            sources: [...(primary.extracted.provenance.sources ?? [])],
            usedReadability: primary.extracted.provenance.usedReadability,
            jsonLdCount: primary.extracted.provenance.jsonLdCount,
        },
        schedule: primary.extracted.schedule ? [...primary.extracted.schedule] : undefined,
        speakers: primary.extracted.speakers ? [...primary.extracted.speakers] : undefined,
        dailySchedule: primary.extracted.dailySchedule ? [...primary.extracted.dailySchedule] : undefined,
    };

    for (const document of related) {
        const syntheticSchedule = toSyntheticScheduleItem(document);
        const scheduleAdditions = [
            ...(document.extracted.schedule ?? []),
            ...(syntheticSchedule ? [syntheticSchedule] : []),
        ];

        if (scheduleAdditions.length > 0) {
            merged.schedule = mergeScheduleItems(merged.schedule ?? [], scheduleAdditions);
            merged.confidence.schedule = Math.max(merged.confidence.schedule ?? 0, 0.7);
            merged.provenance.sources.push(`linked.${document.kind}.schedule`);
        }

        if (document.extracted.speakers && document.extracted.speakers.length > 0) {
            merged.speakers = mergeSpeakerRecords(merged.speakers ?? [], document.extracted.speakers);
            merged.confidence.speakers = Math.max(merged.confidence.speakers ?? 0, 0.7);
            merged.provenance.sources.push(`linked.${document.kind}.speakers`);
        }

        if (!merged.description && isNonEmptyString(document.extracted.description)) {
            merged.description = document.extracted.description;
            merged.confidence.description = Math.max(merged.confidence.description ?? 0, 0.65);
            merged.provenance.sources.push(`linked.${document.kind}.description`);
        }

        if (!merged.location && isNonEmptyString(document.extracted.location)) {
            merged.location = document.extracted.location;
            merged.confidence.location = Math.max(merged.confidence.location ?? 0, 0.65);
            merged.provenance.sources.push(`linked.${document.kind}.location`);
        }

        if (!merged.pricing && document.extracted.pricing) {
            merged.pricing = document.extracted.pricing;
            merged.confidence.pricing = Math.max(merged.confidence.pricing ?? 0, 0.65);
            merged.provenance.sources.push(`linked.${document.kind}.pricing`);
        }
    }

    return merged;
}

const toExtractedSpeaker = (speaker: SpeakerRecord): ExtractedSpeaker => ({
    name: speaker.name,
    title: speaker.title,
    company: speaker.company,
    bio: speaker.bio,
    linkedinUrl: speaker.linkedinUrl,
    photoUrl: speaker.photoUrl,
    twitterUrl: speaker.twitterUrl,
    websiteUrl: speaker.websiteUrl,
});

const toExtractedAgendaItem = (item: ExtractedScheduleItem): ExtractedAgendaItem | null => {
    const title = normalizeText(item.title);
    if (!title) {
        return null;
    }

    const { startTime, endTime } = extractAgendaTimes(item.startTime || item.date, item.endTime);

    return {
        title,
        startTime,
        endTime,
        description: isNonEmptyString(item.description) ? item.description.trim() : undefined,
        location: isNonEmptyString(item.location) ? item.location.trim() : undefined,
        track: isNonEmptyString(item.track) ? item.track.trim() : undefined,
        topics: (() => {
            const topics = Array.from(new Set((item.topics ?? []).map(normalizeText).filter(Boolean)));
            return topics.length > 0 ? topics : undefined;
        })(),
        dayNumber: item.dayNumber,
        agendaType: inferAgendaType(item.title, item.description, item.track),
        durationMinutes: toAgendaDuration(startTime, endTime),
        speakers: Array.from(new Set((item.speakers ?? []).map(normalizeText).filter(Boolean))),
    };
};

export function htmlExtractionToExtractedEventData(
    extraction: HtmlCoreExtractionResult,
): Partial<ExtractedEventData> {
    const description =
        cleanEventDescription(extraction.description) ??
        (isNonEmptyString(extraction.description) ? extraction.description.trim() : undefined);
    const agenda = (extraction.schedule ?? [])
        .map(toExtractedAgendaItem)
        .filter((item): item is ExtractedAgendaItem => Boolean(item));

    const speakers = (extraction.speakers ?? [])
        .map(toExtractedSpeaker)
        .filter((speaker) => isNonEmptyString(speaker.name));

    return {
        description,
        location: isNonEmptyString(extraction.location) ? extraction.location.trim() : undefined,
        pricing: extraction.pricing
            ? {
                priceMin: extraction.pricing.priceMin ?? undefined,
                priceMax: extraction.pricing.priceMax ?? undefined,
                currency: extraction.pricing.currency ?? undefined,
                pricingType: extraction.pricing.pricingType ?? undefined,
            }
            : undefined,
        speakers: speakers.length > 0 ? speakers : undefined,
        agenda: agenda.length > 0 ? agenda : undefined,
    };
}

export function buildStructuredExtractedEventData(
    documents: LinkedPageDocument[],
): Partial<ExtractedEventData> {
    return htmlExtractionToExtractedEventData(mergeLinkedPageExtractions(documents));
}

export function buildProviderDocuments(
    documents: LinkedPageDocument[],
): ExtractionProviderDocument[] {
    return documents.slice(0, MAX_PROVIDER_DOCUMENTS).map((document) => ({
        url: document.url,
        label: `${document.kind}: ${document.label}`,
        kind: document.kind,
        evidenceSource: document.evidenceSource,
        originActionLabel: document.originActionLabel,
        content: document.content.slice(0, MAX_PROVIDER_DOCUMENT_CONTENT),
    }));
}

export function mergeExtractedEventData(
    preferred: Partial<ExtractedEventData>,
    fallback: Partial<ExtractedEventData>,
): Partial<ExtractedEventData> {
    const speakersMap = new Map<string, ExtractedSpeaker>();
    [...(fallback.speakers ?? []), ...(preferred.speakers ?? [])].forEach((speaker) => {
        const key = buildSpeakerKey(speaker);
        const existing = speakersMap.get(key);
        speakersMap.set(key, existing ? mergeSpeaker(speaker, existing) : mergeSpeaker(speaker, {}));
    });

    const agendaMap = new Map<string, ExtractedAgendaItem>();
    const agendaSpecificMatchIndex = new Map<string, string>();
    const agendaBaseMatchIndex = new Map<string, Set<string>>();

    const indexAgendaItem = (key: string, item: Partial<ExtractedAgendaItem>) => {
        const specificMatchKey = buildAgendaSpecificMatchKey(item);
        if (specificMatchKey) {
            agendaSpecificMatchIndex.set(specificMatchKey, key);
        }

        const baseMatchKey = buildAgendaMatchBaseKey(item);
        if (baseMatchKey) {
            const existing = agendaBaseMatchIndex.get(baseMatchKey) ?? new Set<string>();
            existing.add(key);
            agendaBaseMatchIndex.set(baseMatchKey, existing);
        }
    };

    (preferred.agenda ?? []).forEach((item) => {
        const key = buildAgendaKey(item);
        const merged = mergeAgendaItem(item, {});
        agendaMap.set(key, merged);
        indexAgendaItem(key, merged);
    });

    (fallback.agenda ?? []).forEach((item) => {
        const exactKey = buildAgendaKey(item);
        const existingExact = agendaMap.get(exactKey);
        if (existingExact) {
            const merged = mergeAgendaItem(existingExact, item);
            agendaMap.set(exactKey, merged);
            indexAgendaItem(exactKey, merged);
            return;
        }

        const specificMatchKey = buildAgendaSpecificMatchKey(item);
        if (specificMatchKey) {
            const matchedKey = agendaSpecificMatchIndex.get(specificMatchKey);
            if (matchedKey) {
                const merged = mergeAgendaItem(agendaMap.get(matchedKey) ?? {}, item);
                agendaMap.set(matchedKey, merged);
                indexAgendaItem(matchedKey, merged);
                return;
            }
        }

        const baseMatchKey = buildAgendaMatchBaseKey(item);
        if (baseMatchKey) {
            const candidates = Array.from(agendaBaseMatchIndex.get(baseMatchKey) ?? []);
            if (candidates.length === 1) {
                const matchedKey = candidates[0];
                const merged = mergeAgendaItem(agendaMap.get(matchedKey) ?? {}, item);
                agendaMap.set(matchedKey, merged);
                indexAgendaItem(matchedKey, merged);
                return;
            }

            if (candidates.length > 1 && item.dayNumber == null && !extractAgendaDateKey(item.startTime)) {
                return;
            }
        }

        const merged = mergeAgendaItem(item, {});
        agendaMap.set(exactKey, merged);
        indexAgendaItem(exactKey, merged);
    });

    const tags = Array.from(new Set([...(preferred.tags ?? []), ...(fallback.tags ?? [])])).filter(Boolean);

    return {
        description: pickPreferredDescription(preferred.description, fallback.description),
        location: preferred.location ?? fallback.location,
        registrationUrl: preferred.registrationUrl ?? fallback.registrationUrl,
        eventFormat: preferred.eventFormat ?? fallback.eventFormat,
        pricing: mergePricing(preferred.pricing, fallback.pricing),
        speakers: speakersMap.size > 0 ? Array.from(speakersMap.values()) : undefined,
        agenda: agendaMap.size > 0 ? Array.from(agendaMap.values()) : undefined,
        tags: tags.length > 0 ? tags : undefined,
    };
}

const normalizeDescriptionForMerge = (value?: string): string | undefined => {
    const cleaned = cleanEventDescription(value);
    if (cleaned) {
        return cleaned;
    }

    return isNonEmptyString(value) ? value.trim() : undefined;
};

const pickPreferredDescription = (
    preferred?: string,
    fallback?: string,
): string | undefined => {
    const normalizedPreferred = normalizeDescriptionForMerge(preferred);
    const normalizedFallback = normalizeDescriptionForMerge(fallback);

    if (!normalizedPreferred) {
        return normalizedFallback;
    }

    if (!normalizedFallback) {
        return normalizedPreferred;
    }

    const preferredThin = isDescriptionThin(normalizedPreferred);
    const fallbackThin = isDescriptionThin(normalizedFallback);

    if (preferredThin !== fallbackThin) {
        return preferredThin ? normalizedFallback : normalizedPreferred;
    }

    if (normalizedFallback.length > normalizedPreferred.length * 1.25) {
        return normalizedFallback;
    }

    return normalizedPreferred;
};
