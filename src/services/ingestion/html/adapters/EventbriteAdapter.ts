import type { HtmlCoreExtractionResult } from '../EventHtmlExtractor';
import type { HtmlDomainAdapter } from './types';
import { toISODateTime } from './utils/dateUtils';

function parseNextData(document: Document): any | null {
    const script = document.querySelector('#__NEXT_DATA__');
    if (!script?.textContent) {
        return null;
    }
    try {
        return JSON.parse(script.textContent);
    } catch {
        return null;
    }
}

function extractEventbriteData(nextData: any): {
    title?: string;
    description?: string;
    start?: string;
    end?: string;
    venueName?: string;
    address?: string;
    city?: string;
    country?: string;
    imageUrl?: string;
    priceRange?: { min?: number; max?: number; currency?: string | null };
} | null {
    if (!nextData || typeof nextData !== 'object') {
        return null;
    }

    const eventData =
        nextData?.props?.pageProps?.event ||
        nextData?.props?.pageProps?.apolloState?.data?.[`Event:${nextData?.props?.pageProps?.event?.id}`];

    if (!eventData) {
        return null;
    }

    const ticketInfo = eventData.ticketAvailability || eventData.ticket_availability;
    const venue = eventData.venue || eventData.primary_venue;

    const priceMin = typeof ticketInfo?.minimumTicketPrice?.majorValue === 'number'
        ? ticketInfo.minimumTicketPrice.majorValue
        : undefined;
    const priceMax = typeof ticketInfo?.maximumTicketPrice?.majorValue === 'number'
        ? ticketInfo.maximumTicketPrice.majorValue
        : undefined;
    const currency = ticketInfo?.minimumTicketPrice?.currency || ticketInfo?.maximumTicketPrice?.currency || null;

    return {
        title: eventData.name?.text || eventData.name,
        description: eventData.description?.text || eventData.description,
        start: eventData.startDate || eventData.start_date,
        end: eventData.endDate || eventData.end_date,
        venueName: venue?.name?.text || venue?.name || undefined,
        address: venue?.address?.localized_address_display,
        city: venue?.address?.city,
        country: venue?.address?.country,
        imageUrl: eventData.image?.url || eventData.logo?.url,
        priceRange: { min: priceMin, max: priceMax, currency },
    };
}

export const eventbriteAdapter: HtmlDomainAdapter = {
    matches(url: URL): boolean {
        return url.hostname.endsWith('eventbrite.com');
    },
    apply(document: Document, result: HtmlCoreExtractionResult): void {
        const nextData = parseNextData(document);
        const eventData = extractEventbriteData(nextData);
        if (!eventData) {
            return;
        }

        if (eventData.title && (!result.title || result.title.length < eventData.title.length)) {
            result.title = eventData.title.trim();
            result.confidence.title = Math.max(result.confidence.title ?? 0, 0.98);
            result.provenance.sources.push('eventbrite.next_data.title');
        }

        if (eventData.description && (!result.description || eventData.description.length > (result.description?.length ?? 0))) {
            result.description = eventData.description.trim();
            result.confidence.description = Math.max(result.confidence.description ?? 0, 0.9);
            result.provenance.sources.push('eventbrite.next_data.description');
        }

        const startIso = toISODateTime(eventData.start);
        if (startIso) {
            result.startTime = startIso;
            result.confidence.startTime = Math.max(result.confidence.startTime ?? 0, 0.95);
            result.provenance.sources.push('eventbrite.next_data.start');
        }

        const endIso = toISODateTime(eventData.end);
        if (endIso) {
            result.endTime = endIso;
            result.confidence.endTime = Math.max(result.confidence.endTime ?? 0, 0.85);
            result.provenance.sources.push('eventbrite.next_data.end');
        }

        if (eventData.venueName) {
            const locationParts = [
                eventData.venueName,
                eventData.address,
                eventData.city,
                eventData.country,
            ]
                .filter(Boolean)
                .join(', ');

            if (locationParts) {
                result.location = locationParts;
                result.confidence.location = Math.max(result.confidence.location ?? 0, 0.9);
                result.provenance.sources.push('eventbrite.next_data.location');
            }
        }

        if (eventData.imageUrl && !result.eventImageUrl) {
            result.eventImageUrl = eventData.imageUrl;
            result.confidence.eventImageUrl = Math.max(result.confidence.eventImageUrl ?? 0, 0.85);
            result.provenance.sources.push('eventbrite.next_data.image');
        }

        if (eventData.priceRange && (eventData.priceRange.min !== undefined || eventData.priceRange.max !== undefined)) {
            result.pricing = {
                priceMin: eventData.priceRange.min ?? null,
                priceMax: eventData.priceRange.max ?? null,
                currency: eventData.priceRange.currency,
                pricingType:
                    eventData.priceRange.min === 0 && eventData.priceRange.max === 0
                        ? 'Free'
                        : 'Paid',
            };
            result.confidence.pricing = Math.max(result.confidence.pricing ?? 0, 0.85);
            result.provenance.sources.push('eventbrite.next_data.pricing');
        }
    },
};


