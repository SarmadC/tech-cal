import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import type { ExtractedAgendaItem, ExtractedEventData, ExtractedSpeaker } from '@/types/enrichment';
import type { SpeakerRecord } from '@/types/ingestion';
import { parseDurationMinutes, parseLocalTime } from '@/utils/ingestion/ExtractNormalization';
import {
    extractCoreFieldsFromHtml,
    type ExtractedScheduleItem,
    type HtmlCoreExtractionResult,
} from './html';
import type { ExtractionProviderDocument } from './providers/ExtractionProvider';

const BROKEN_STYLESHEET_ERROR = 'Could not parse CSS stylesheet';
const MAX_PROVIDER_DOCUMENTS = 16;
const MAX_PROVIDER_DOCUMENT_CONTENT = 6_000;
const DEFAULT_MAX_HUB_PAGES = 3;
const DEFAULT_MAX_DETAIL_PAGES = 25;

const AGENDA_KEYWORDS = /(agenda|schedule|program|timetable|itinerary|session list|conference program|tracks?)/i;
const SPEAKER_KEYWORDS = /(speakers?|presenters?|panelists?|experts?|instructors?|hosts?)/i;
const SESSION_DETAIL_KEYWORDS = /(session details?|view session|session page|speaker profile|profile)/i;
const NOISE_LINK_KEYWORDS = /(register|registration|tickets?|pricing|sponsor|exhibitor|venue|hotel|travel|faq|contact|privacy|terms)/i;
const SESSION_PATH_HINTS = /(\/sessions?\/|\/agenda\/[^/]+\/|\/program\/[^/]+\/|\/talks?\/|\/tracks?\/[^/]+\/[^/]+|\/speaker\/[^/]+)/i;

export type LinkedPageKind = 'primary' | 'agenda' | 'speakers' | 'session';

export interface LinkedPageDocument {
    kind: LinkedPageKind;
    label: string;
    url: string;
    content: string;
    extracted: HtmlCoreExtractionResult;
}

interface CandidateLink {
    url: string;
    label: string;
    kind: Exclude<LinkedPageKind, 'primary'>;
    score: number;
}

export interface PageLoadResult {
    html: string;
    finalUrl?: string;
}

export interface LinkedPageCollectionOptions {
    sourceUrl: string;
    html: string;
    finalUrl?: string;
    loadPage: (url: string) => Promise<PageLoadResult>;
    maxHubPages?: number;
    maxDetailPages?: number;
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
    return parseLocalTime(value) ?? normalizeText(value);
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
    return `${title.toLowerCase()}|${start}|${day}`;
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
): ExtractedAgendaItem => ({
    title: preferred.title ?? fallback.title ?? '',
    startTime: preferred.startTime ?? fallback.startTime,
    endTime: preferred.endTime ?? fallback.endTime,
    description: preferred.description ?? fallback.description,
    location: preferred.location ?? fallback.location,
    track: preferred.track ?? fallback.track,
    dayNumber: preferred.dayNumber ?? fallback.dayNumber,
    agendaType: preferred.agendaType ?? fallback.agendaType,
    difficultyLevel: preferred.difficultyLevel ?? fallback.difficultyLevel,
    capacity: preferred.capacity ?? fallback.capacity,
    prerequisites: preferred.prerequisites ?? fallback.prerequisites,
    isRequired: preferred.isRequired ?? fallback.isRequired,
    durationMinutes: preferred.durationMinutes ?? fallback.durationMinutes,
    speakers: Array.from(new Set([...(preferred.speakers ?? []), ...(fallback.speakers ?? [])])).filter(Boolean),
});

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

const buildLinkedPageDocument = (
    html: string,
    url: string,
    kind: LinkedPageKind,
    label: string,
): LinkedPageDocument => {
    const extracted = extractCoreFieldsFromHtml(html, url);
    return {
        kind,
        label,
        url,
        content: buildDocumentContent(html, extracted),
        extracted,
    };
};

const anchorScore = (kind: Exclude<LinkedPageKind, 'primary'>, path: string, text: string): number => {
    let score = kind === 'session' ? 40 : 60;
    if (kind === 'agenda' && /agenda|schedule/.test(path)) score += 20;
    if (kind === 'speakers' && /speakers?|presenters?/.test(path)) score += 20;
    if (kind === 'session' && SESSION_PATH_HINTS.test(path)) score += 25;
    if (/view|details?|profile/.test(text)) score += 5;
    return score;
};

const classifyCandidateLink = (
    anchor: HTMLAnchorElement,
    baseUrl: string,
    host: string,
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
    if (resolved.hostname !== host) {
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
    if (SESSION_PATH_HINTS.test(path) || SESSION_DETAIL_KEYWORDS.test(combined)) {
        kind = 'session';
    } else if (SPEAKER_KEYWORDS.test(combined)) {
        kind = 'speakers';
    } else if (AGENDA_KEYWORDS.test(combined)) {
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
    };
};

const discoverCandidateLinks = (
    html: string,
    baseUrl: string,
    host: string,
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
        const candidate = classifyCandidateLink(anchor, baseUrl, host);
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
        }), index);
    });

    additions.forEach((item) => {
        const { startTime, endTime } = extractAgendaTimes(item.startTime || item.date, item.endTime);
        const normalizedItem: ExtractedScheduleItem = {
            ...item,
            startTime,
            endTime,
            speakers: Array.from(new Set((item.speakers ?? []).map(normalizeText).filter(Boolean))),
            title: normalizeText(item.title),
            description: isNonEmptyString(item.description) ? item.description.trim() : undefined,
            location: isNonEmptyString(item.location) ? item.location.trim() : undefined,
            track: isNonEmptyString(item.track) ? item.track.trim() : undefined,
        };

        const key = buildAgendaKey({
            title: normalizedItem.title,
            startTime: normalizedItem.startTime,
            dayNumber: normalizedItem.dayNumber,
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
            description: current.description || normalizedItem.description,
            location: current.location || normalizedItem.location,
            track: current.track || normalizedItem.track,
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
        return [buildLinkedPageDocument(options.html, options.sourceUrl, 'primary', 'Primary page')];
    }

    const primary = buildLinkedPageDocument(options.html, baseUrl, 'primary', 'Primary page');
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

    const queue = discoverCandidateLinks(options.html, baseUrl, parsedBase.hostname);
    if (primary.extracted.agendaUrl) {
        try {
            const resolvedAgendaUrl = normalizeUrlForTraversal(new URL(primary.extracted.agendaUrl, baseUrl).toString());
            if (resolvedAgendaUrl && !seenUrls.has(resolvedAgendaUrl)) {
                queue.unshift({
                    url: resolvedAgendaUrl,
                    label: 'Agenda page',
                    kind: 'agenda',
                    score: 100,
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

            const document = buildLinkedPageDocument(page.html, finalUrl, candidate.kind, candidate.label);
            documents.push(document);

            if (candidate.kind === 'session') {
                remainingDetailPages -= 1;
            } else {
                remainingHubPages -= 1;
            }

            if (candidate.kind !== 'session' && remainingDetailPages > 0) {
                const discovered = discoverCandidateLinks(page.html, finalUrl, parsedBase.hostname)
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
        dayNumber: item.dayNumber,
        agendaType: inferAgendaType(item.title, item.description, item.track),
        durationMinutes: toAgendaDuration(startTime, endTime),
        speakers: Array.from(new Set((item.speakers ?? []).map(normalizeText).filter(Boolean))),
    };
};

export function htmlExtractionToExtractedEventData(
    extraction: HtmlCoreExtractionResult,
): Partial<ExtractedEventData> {
    const agenda = (extraction.schedule ?? [])
        .map(toExtractedAgendaItem)
        .filter((item): item is ExtractedAgendaItem => Boolean(item));

    const speakers = (extraction.speakers ?? [])
        .map(toExtractedSpeaker)
        .filter((speaker) => isNonEmptyString(speaker.name));

    return {
        description: isNonEmptyString(extraction.description) ? extraction.description.trim() : undefined,
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
    [...(fallback.agenda ?? []), ...(preferred.agenda ?? [])].forEach((item) => {
        const key = buildAgendaKey(item);
        const existing = agendaMap.get(key);
        agendaMap.set(key, existing ? mergeAgendaItem(item, existing) : mergeAgendaItem(item, {}));
    });

    const tags = Array.from(new Set([...(preferred.tags ?? []), ...(fallback.tags ?? [])])).filter(Boolean);

    return {
        description: preferred.description ?? fallback.description,
        location: preferred.location ?? fallback.location,
        registrationUrl: preferred.registrationUrl ?? fallback.registrationUrl,
        eventFormat: preferred.eventFormat ?? fallback.eventFormat,
        pricing: mergePricing(preferred.pricing, fallback.pricing),
        speakers: speakersMap.size > 0 ? Array.from(speakersMap.values()) : undefined,
        agenda: agendaMap.size > 0 ? Array.from(agendaMap.values()) : undefined,
        tags: tags.length > 0 ? tags : undefined,
    };
}
