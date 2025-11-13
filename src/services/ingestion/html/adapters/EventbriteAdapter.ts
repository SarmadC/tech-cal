import type { HtmlCoreExtractionResult } from '../EventHtmlExtractor';
import type { HtmlDomainAdapter } from './types';
import { toISODateTime } from './utils/dateUtils';

function parseNextData(document: Document): unknown | null {
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

function extractEventbriteData(nextData: unknown): {
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

    const data = nextData as Record<string, unknown>;
    const props = data?.props as Record<string, unknown> | undefined;
    const pageProps = props?.pageProps as Record<string, unknown> | undefined;
    let eventData = pageProps?.event as Record<string, unknown> | undefined;
    
    if (!eventData && pageProps?.apolloState) {
        const apolloState = pageProps.apolloState as Record<string, unknown>;
        const eventId = (pageProps.event as Record<string, unknown> | undefined)?.id as string | undefined;
        if (eventId && apolloState.data) {
            const apolloData = apolloState.data as Record<string, unknown>;
            eventData = apolloData[`Event:${eventId}`] as Record<string, unknown> | undefined;
        }
    }

    if (!eventData) {
        return null;
    }

    const ticketInfo = (eventData.ticketAvailability || eventData.ticket_availability) as Record<string, unknown> | undefined;
    const venue = (eventData.venue || eventData.primary_venue) as Record<string, unknown> | undefined;

    const minTicketPrice = ticketInfo?.minimumTicketPrice as Record<string, unknown> | undefined;
    const maxTicketPrice = ticketInfo?.maximumTicketPrice as Record<string, unknown> | undefined;
    const priceMin = typeof minTicketPrice?.majorValue === 'number' ? minTicketPrice.majorValue : undefined;
    const priceMax = typeof maxTicketPrice?.majorValue === 'number' ? maxTicketPrice.majorValue : undefined;
    const currency = (minTicketPrice?.currency || maxTicketPrice?.currency) as string | null | undefined;

    const name = eventData.name as { text?: string } | string | undefined;
    const description = eventData.description as { text?: string } | string | undefined;
    const venueName = venue?.name as { text?: string } | string | undefined;
    const venueAddress = venue?.address as Record<string, unknown> | undefined;
    const image = eventData.image as { url?: string } | undefined;
    const logo = eventData.logo as { url?: string } | undefined;

    return {
        title: (typeof name === 'object' ? name?.text : name) as string | undefined,
        description: (typeof description === 'object' ? description?.text : description) as string | undefined,
        start: (eventData.startDate || eventData.start_date) as string | undefined,
        end: (eventData.endDate || eventData.end_date) as string | undefined,
        venueName: (typeof venueName === 'object' ? venueName?.text : venueName) as string | undefined,
        address: venueAddress?.localized_address_display as string | undefined,
        city: venueAddress?.city as string | undefined,
        country: venueAddress?.country as string | undefined,
        imageUrl: image?.url || logo?.url,
        priceRange: { min: priceMin, max: priceMax, currency: currency ?? null },
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



