import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { SpeakerRecord } from '@/types/ingestion';
import { applyDomainAdapters } from './adapters/registry';

export interface ExtractedScheduleItem {
    date?: string;
    startTime?: string;
    endTime?: string;
    title?: string;
    description?: string;
    speakers?: string[];
    location?: string;
    track?: string;
}

export interface HtmlCoreExtractionResult {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    location?: string;
    pricing?: {
        priceMin?: number | null;
        priceMax?: number | null;
        currency?: string | null;
        pricingType?: 'Free' | 'Paid' | 'Varies' | null;
        rawText?: string;
    };
    eventImageUrl?: string;
    agendaUrl?: string;
    schedule?: ExtractedScheduleItem[];
    speakers?: SpeakerRecord[];
    confidence: Record<string, number>;
    provenance: {
        sources: string[];
        usedReadability: boolean;
        jsonLdCount: number;
    };
    dailySchedule?: ExtractedScheduleItem[];
}

const DEFAULT_CONFIDENCE = 0.4;

function tryParseJson(text: string): unknown | null {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function toISODate(value: string | undefined | null): string | undefined {
    if (!value) return undefined;
    try {
        const iso = new Date(value);
        if (Number.isNaN(iso.getTime())) {
            return undefined;
        }
        return iso.toISOString();
    } catch {
        return undefined;
    }
}

function normalizeCurrency(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim().toUpperCase();
    if (trimmed.length === 3) {
        return trimmed;
    }
    return null;
}

function derivePricingType(min?: number | null, max?: number | null): 'Free' | 'Paid' | 'Varies' | null {
    if (min === 0 && (max === 0 || max == null)) {
        return 'Free';
    }
    if (min != null && max != null && min === max) {
        return 'Paid';
    }
    if (min != null || max != null) {
        return 'Varies';
    }
    return null;
}

function extractFromJsonLd(document: Document) {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const events: Array<Record<string, any>> = [];

    for (const script of scripts) {
        const raw = script.textContent?.trim();
        if (!raw) continue;

        const parsed = tryParseJson(raw);
        if (!parsed) continue;

        const payloads = Array.isArray(parsed) ? parsed : [parsed];
        for (const payload of payloads) {
            if (!payload || typeof payload !== 'object') continue;
            const type = payload['@type'] || payload['@context'];

            if (Array.isArray(type) ? type.includes('Event') : type === 'Event') {
                events.push(payload as Record<string, any>);
            } else if ((payload as Record<string, any>)['@graph']) {
                const graphPayload = (payload as Record<string, any>)['@graph'];
                if (Array.isArray(graphPayload)) {
                    graphPayload.forEach(item => {
                        const itemType = item?.['@type'];
                        if (Array.isArray(itemType) ? itemType.includes('Event') : itemType === 'Event') {
                            events.push(item as Record<string, any>);
                        }
                    });
                }
            }
        }
    }

    return events;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

/**
 * Validates that a URL belongs to an allowed host or its subdomains.
 * This prevents security issues from substring matching on URLs.
 * 
 * @param url - The URL string to validate
 * @param allowedHosts - Array of allowed hostnames (e.g., ['linkedin.com', 'github.com'])
 * @returns The URL if valid, undefined otherwise
 */
function validateUrlHost(url: string, allowedHosts: string[]): string | undefined {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        for (const allowedHost of allowedHosts) {
            const normalizedAllowedHost = allowedHost.toLowerCase();
            
            // Exact match
            if (hostname === normalizedAllowedHost) {
                return url;
            }
            
            // Subdomain match (e.g., www.linkedin.com, api.github.com)
            // Must end with '.' + allowedHost to prevent evil-linkedin.com from matching
            if (hostname.endsWith('.' + normalizedAllowedHost)) {
                return url;
            }
        }
        
        return undefined;
    } catch {
        // Invalid URL
        return undefined;
    }
}

function extractSpeakersFromJsonLd(eventPayload: Record<string, any>): SpeakerRecord[] {
    const performers = [
        ...asArray(eventPayload.performer),
        ...asArray(eventPayload.performers),
        ...asArray(eventPayload.speaker),
        ...asArray(eventPayload.speakers),
    ];

    const speakers: SpeakerRecord[] = [];

    for (const performer of performers) {
        if (!performer || typeof performer !== 'object') continue;
        const name = performer.name || performer.alternateName;
        if (!name || typeof name !== 'string') continue;

        const sameAs = typeof performer.sameAs === 'string' ? performer.sameAs : undefined;
        
        speakers.push({
            name: name.trim(),
            title: performer.jobTitle || undefined,
            company: performer.affiliation?.name || performer.worksFor?.name || undefined,
            bio: performer.description || undefined,
            linkedinUrl: sameAs ? validateUrlHost(sameAs, ['linkedin.com']) : undefined,
            photoUrl: performer.image || performer.logo || undefined,
            githubUrl: sameAs ? validateUrlHost(sameAs, ['github.com']) : undefined,
        });
    }

    return speakers;
}

function extractScheduleFromJsonLd(eventPayload: Record<string, any>): ExtractedScheduleItem[] {
    const scheduleItems: ExtractedScheduleItem[] = [];

    const eventSchedule = asArray(eventPayload.eventSchedule);
    for (const schedule of eventSchedule) {
        if (!schedule || typeof schedule !== 'object') continue;
        scheduleItems.push({
            date: toISODate(schedule.startDate),
            startTime: toISODate(schedule.startTime),
            endTime: toISODate(schedule.endDate),
            title: schedule.name || undefined,
            description: schedule.description || undefined,
            location: schedule.location?.name || undefined,
        });
    }

    const subEvents = asArray(eventPayload.subEvent || eventPayload.subEvents);
    for (const subEvent of subEvents) {
        if (!subEvent || typeof subEvent !== 'object') continue;
        scheduleItems.push({
            date: toISODate(subEvent.startDate),
            startTime: toISODate(subEvent.startDate),
            endTime: toISODate(subEvent.endDate),
            title: subEvent.name || undefined,
            description: subEvent.description || undefined,
            speakers: extractSpeakersFromJsonLd(subEvent).map(speaker => speaker.name),
            location: subEvent.location?.name || undefined,
        });
    }

    return scheduleItems;
}

function extractAgendaLink(document: Document): string | undefined {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
    for (const anchor of anchors) {
        const text = anchor.textContent?.toLowerCase() ?? '';
        if (text.includes('agenda') || text.includes('schedule') || text.includes('program')) {
            return anchor.href;
        }
    }
    return undefined;
}

function extractLocationFromDocument(document: Document): string | undefined {
    const selectors = [
        '[itemprop="location"] .p-name',
        '[itemprop="location"] [itemprop="name"]',
        '.event-location',
        '.event__location',
        '.location',
        '.venue',
    ];
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
            const text = el.textContent?.trim();
            if (text) {
                return text;
            }
        }
    }
    return undefined;
}

function extractPricingFromDocument(document: Document) {
    const priceSelectors = [
        '[itemprop="price"]',
        '.event-price',
        '.pricing',
        '.ticket-price',
    ];

    for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const text = el.textContent?.trim();
        if (!text) continue;
        return { rawText: text };
    }
    return undefined;
}

function extractAgendaFromDocument(document: Document): ExtractedScheduleItem[] {
    const schedule: ExtractedScheduleItem[] = [];
    const seen = new Set<string>();

    const timeNodes = Array.from(document.querySelectorAll('time'));
    timeNodes.forEach((timeNode) => {
        const container =
            timeNode.closest('li, article, .agenda-item, .schedule-item, tr') ||
            timeNode.parentElement;
        if (!container) return;

        const datetime = timeNode.getAttribute('datetime') || timeNode.textContent || '';
        const normalizedTime = datetime.trim();
        if (!normalizedTime) return;

        const titleNode =
            container.querySelector('h3, h4, h5, strong, .session-title, .agenda-title') ||
            container.querySelector('[class*="title"]');
        const title = titleNode?.textContent?.trim() || '';

        const descriptionNode =
            container.querySelector('p') ||
            container.querySelector('.session-description') ||
            container.querySelector('[class*="description"]');
        const description = descriptionNode?.textContent?.trim();

        const speakerNodes = Array.from(
            container.querySelectorAll('.speaker-name, .session-speaker, .presenter, [class*="speaker"] strong')
        );
        const speakers =
            speakerNodes
                .map((node) => node.textContent?.trim())
                .filter((value): value is string => !!value) ?? [];

        const key = `${normalizedTime}|${title}`;
        if (seen.has(key)) {
            return;
        }
        seen.add(key);

        const startTime = toISODate(normalizedTime) || normalizedTime;

        schedule.push({
            startTime,
            title: title || undefined,
            description,
            speakers: speakers.length > 0 ? speakers : undefined,
        });
    });

    if (schedule.length === 0) {
        const rows = Array.from(document.querySelectorAll('table tr'));
        rows.forEach((row) => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            if (cells.length < 2) return;
            const timeText = cells[0].textContent?.trim();
            const title = cells[1].textContent?.trim();
            if (!timeText || !title) return;
            const key = `${timeText}|${title}`;
            if (seen.has(key)) return;
            seen.add(key);
            schedule.push({
                startTime: toISODate(timeText) || timeText,
                title,
            });
        });
    }

    return schedule;
}

function extractSpeakersFromDocument(document: Document): SpeakerRecord[] {
    const speakers: SpeakerRecord[] = [];
    const seen = new Set<string>();
    const speakerElements = Array.from(
        document.querySelectorAll(
            '.speaker, .speaker-card, .speaker-item, .event-speaker, .presenter, [class*="speaker-card"], [class*="speaker"]'
        )
    );

    speakerElements.forEach((element) => {
        const nameNode =
            element.querySelector('h3, h4, h5, strong, .speaker-name, .name') || element.querySelector('[class*="name"]');
        const name = nameNode?.textContent?.trim();
        if (!name || seen.has(name.toLowerCase())) {
            return;
        }

        const titleNode =
            element.querySelector('.speaker-title, .role, .title, .position, em') ||
            element.querySelector('[class*="title"]');
        const companyNode =
            element.querySelector('.speaker-company, .company, .organization') ||
            element.querySelector('[class*="company"]');
        const bioNode =
            element.querySelector('.speaker-bio, .bio, .description, p') ||
            element.querySelector('[class*="bio"]');
        const imageNode = element.querySelector('img');

        speakers.push({
            name,
            title: titleNode?.textContent?.trim() || undefined,
            company: companyNode?.textContent?.trim() || undefined,
            bio: bioNode?.textContent?.trim() || undefined,
            photoUrl: imageNode?.getAttribute('src') || undefined,
        });
        seen.add(name.toLowerCase());
    });

    return speakers;
}

export function extractCoreFieldsFromHtml(html: string, baseUrl?: string): HtmlCoreExtractionResult {
    const dom = new JSDOM(html, { url: baseUrl, pretendToBeVisual: false });
    const { document } = dom.window;

    const result: HtmlCoreExtractionResult = {
        confidence: {},
        provenance: {
            sources: [],
            usedReadability: false,
            jsonLdCount: 0,
        },
    };

    const jsonLdEvents = extractFromJsonLd(document);
    result.provenance.jsonLdCount = jsonLdEvents.length;

    if (jsonLdEvents.length > 0) {
        const primaryEvent = jsonLdEvents[0];
        if (primaryEvent.name && typeof primaryEvent.name === 'string') {
            result.title = primaryEvent.name.trim();
            result.confidence.title = 0.95;
            result.provenance.sources.push('jsonld.name');
        }
        const startDate = toISODate(primaryEvent.startDate);
        if (startDate) {
            result.startTime = startDate;
            result.confidence.startTime = 0.95;
            result.provenance.sources.push('jsonld.startDate');
        }
        const endDate = toISODate(primaryEvent.endDate);
        if (endDate) {
            result.endTime = endDate;
            result.confidence.endTime = 0.8;
            result.provenance.sources.push('jsonld.endDate');
        }
        const jsonDescription = primaryEvent.description;
        if (jsonDescription && typeof jsonDescription === 'string') {
            result.description = jsonDescription.trim();
            result.confidence.description = 0.7;
            result.provenance.sources.push('jsonld.description');
        }
        const jsonLocation = primaryEvent.location;
        if (jsonLocation && typeof jsonLocation === 'object') {
            const locationName = jsonLocation.name || jsonLocation.address?.streetAddress;
            if (locationName && typeof locationName === 'string') {
                result.location = locationName.trim();
                result.confidence.location = 0.85;
                result.provenance.sources.push('jsonld.location');
            }
        }
        const jsonImage = primaryEvent.image;
        if (jsonImage) {
            const image = Array.isArray(jsonImage) ? jsonImage[0] : jsonImage;
            if (typeof image === 'string') {
                result.eventImageUrl = image;
                result.confidence.eventImageUrl = 0.8;
                result.provenance.sources.push('jsonld.image');
            }
        }
        const offers = asArray(primaryEvent.offers);
        if (offers.length > 0) {
            const offer = offers[0];
            const price = offer.price != null ? Number(offer.price) : undefined;
            const highPrice = offer.highPrice != null ? Number(offer.highPrice) : undefined;
            const currency = normalizeCurrency(offer.priceCurrency || offer.currency);

            result.pricing = {
                priceMin: Number.isFinite(price) ? price : null,
                priceMax: Number.isFinite(highPrice) ? highPrice : Number.isFinite(price) ? price : null,
                currency: currency,
                pricingType: derivePricingType(
                    Number.isFinite(price) ? price : null,
                    Number.isFinite(highPrice) ? highPrice : null
                ),
            };
            result.confidence.pricing = 0.8;
            result.provenance.sources.push('jsonld.offers');
        }

        const scheduleItems = extractScheduleFromJsonLd(primaryEvent);
        if (scheduleItems.length > 0) {
            result.schedule = scheduleItems;
            result.confidence.schedule = 0.7;
            result.provenance.sources.push('jsonld.schedule');
        }

        const speakers = extractSpeakersFromJsonLd(primaryEvent);
        if (speakers.length > 0) {
            result.speakers = speakers;
            result.confidence.speakers = 0.65;
            result.provenance.sources.push('jsonld.speakers');
        }
    }

    if (!result.title) {
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
        const docTitle = document.querySelector('title')?.textContent;
        const metaTitle = ogTitle || twitterTitle || docTitle;
        if (metaTitle) {
            result.title = metaTitle.trim();
            result.confidence.title = DEFAULT_CONFIDENCE;
            result.provenance.sources.push('meta.title');
        }
    }

    if (!result.description) {
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
        const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
        const description = metaDescription || ogDescription;
        if (description) {
            result.description = description.trim();
            result.confidence.description = DEFAULT_CONFIDENCE;
            result.provenance.sources.push('meta.description');
        }
    }

    if (!result.eventImageUrl) {
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (ogImage) {
            result.eventImageUrl = ogImage;
            result.confidence.eventImageUrl = DEFAULT_CONFIDENCE;
            result.provenance.sources.push('meta.image');
        }
    }

    if (!result.location) {
        const location = extractLocationFromDocument(document);
        if (location) {
            result.location = location;
            result.confidence.location = DEFAULT_CONFIDENCE;
            result.provenance.sources.push('dom.location');
        }
    }

    if (!result.pricing) {
        const pricingText = extractPricingFromDocument(document);
        if (pricingText) {
            result.pricing = {
                rawText: pricingText.rawText,
                pricingType: pricingText.rawText.toLowerCase().includes('free') ? 'Free' : null,
            };
            result.confidence.pricing = 0.5;
            result.provenance.sources.push('dom.pricing');
        }
    }

    const agendaUrl = extractAgendaLink(document);
    if (agendaUrl) {
        result.agendaUrl = agendaUrl;
        result.confidence.agendaUrl = DEFAULT_CONFIDENCE;
        result.provenance.sources.push('dom.agenda-link');
    }

    if (!result.schedule || result.schedule.length === 0) {
        const domSchedule = extractAgendaFromDocument(document);
        if (domSchedule.length > 0) {
            result.schedule = domSchedule;
            result.confidence.schedule = Math.max(result.confidence.schedule ?? 0, 0.55);
            result.provenance.sources.push('dom.agenda');
        }
    }

    if (!result.speakers || result.speakers.length === 0) {
        const domSpeakers = extractSpeakersFromDocument(document);
        if (domSpeakers.length > 0) {
            result.speakers = domSpeakers;
            result.confidence.speakers = Math.max(result.confidence.speakers ?? 0, 0.5);
            result.provenance.sources.push('dom.speakers');
        }
    }

    if (baseUrl) {
        try {
            const urlObj = new URL(baseUrl);
            applyDomainAdapters(urlObj, document, result);
        } catch {
            // ignore invalid URLs
        }
    }

    const readability = new Readability(dom.window.document);
    const article = readability.parse();
    if (article?.textContent) {
        result.provenance.usedReadability = true;
        const articleText = article.textContent.trim();
        if (!result.description || (articleText.length > result.description.length && articleText.length > 100)) {
            result.description = articleText;
            result.confidence.description = Math.max(result.confidence.description ?? 0, 0.6);
            result.provenance.sources.push('readability.description');
        }
    }

    if (!result.confidence.title && result.title) {
        result.confidence.title = DEFAULT_CONFIDENCE;
    }
    if (!result.confidence.description && result.description) {
        result.confidence.description = DEFAULT_CONFIDENCE;
    }

    return result;
}

