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

function extractMeetupEvent(nextData: unknown): Record<string, unknown> | null {
    if (!nextData || typeof nextData !== 'object') return null;
    const data = nextData as Record<string, unknown>;
    const props = data?.props as Record<string, unknown> | undefined;
    const pageProps = props?.pageProps as Record<string, unknown> | undefined;
    const event = (pageProps?.event || (pageProps?.data as Record<string, unknown> | undefined)?.event) as Record<string, unknown> | undefined;
    return event || null;
}

export const meetupAdapter: HtmlDomainAdapter = {
    matches(url: URL): boolean {
        const host = url.hostname;
        return host.endsWith('meetup.com') || host.endsWith('meetup.com.au');
    },
    apply(document: Document, result: HtmlCoreExtractionResult): void {
        const nextData = parseNextData(document);
        const eventData = extractMeetupEvent(nextData);
        if (!eventData) {
            return;
        }

        const title = eventData.title as string | undefined;
        if (title && (!result.title || result.title.length < title.length)) {
            result.title = title.trim();
            result.confidence.title = Math.max(result.confidence.title ?? 0, 0.95);
            result.provenance.sources.push('meetup.next_data.title');
        }

        const description = (eventData.description_plain || eventData.description) as string | undefined;
        if (description && (!result.description || description.length > (result.description?.length ?? 0))) {
            result.description = description.trim();
            result.confidence.description = Math.max(result.confidence.description ?? 0, 0.85);
            result.provenance.sources.push('meetup.next_data.description');
        }

        const startIso = toISODateTime(eventData.dateTime as string | undefined);
        if (startIso) {
            result.startTime = startIso;
            result.confidence.startTime = Math.max(result.confidence.startTime ?? 0, 0.9);
            result.provenance.sources.push('meetup.next_data.start');
        }

        const endIso = toISODateTime((eventData.endTime || eventData.dateTimeEnd) as string | undefined);
        if (endIso) {
            result.endTime = endIso;
            result.confidence.endTime = Math.max(result.confidence.endTime ?? 0, 0.75);
            result.provenance.sources.push('meetup.next_data.end');
        }

        const venue = (eventData.venue || eventData.venueInfo) as Record<string, unknown> | undefined;
        if (venue) {
            const locationParts = [
                venue.name,
                venue.address1 || venue.address,
                venue.city,
                venue.country,
            ]
                .filter((value) => typeof value === 'string' && value.trim().length > 0)
                .map((value) => (value as string).trim())
                .join(', ');

            if (locationParts) {
                result.location = locationParts;
                result.confidence.location = Math.max(result.confidence.location ?? 0, 0.8);
                result.provenance.sources.push('meetup.next_data.location');
            }
        }

        const featuredPhoto = eventData.featuredPhoto as { baseUrl?: string } | undefined;
        if (featuredPhoto?.baseUrl && !result.eventImageUrl) {
            result.eventImageUrl = featuredPhoto.baseUrl;
            result.confidence.eventImageUrl = Math.max(result.confidence.eventImageUrl ?? 0, 0.75);
            result.provenance.sources.push('meetup.next_data.image');
        }

        const fee = eventData.fee as { amount?: number; required?: boolean; accepts?: Array<{ amount: number }>; currency?: string } | undefined;
        if (fee) {
            const amount =
                typeof fee.amount === 'number'
                    ? fee.amount
                    : fee.required && fee.accepts
                    ? fee.accepts.map((item) => item.amount)[0]
                    : undefined;

            if (amount !== undefined) {
                result.pricing = {
                    priceMin: amount,
                    priceMax: amount,
                    currency: fee.currency || null,
                    pricingType: amount === 0 ? 'Free' : 'Paid',
                };
                result.confidence.pricing = Math.max(result.confidence.pricing ?? 0, 0.75);
                result.provenance.sources.push('meetup.next_data.pricing');
            }
        }
    },
};




