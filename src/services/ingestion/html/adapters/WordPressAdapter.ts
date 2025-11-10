import type { HtmlCoreExtractionResult } from '../EventHtmlExtractor';
import type { HtmlDomainAdapter } from './types';
import { toISODateTime } from './utils/dateUtils';

function isWordPressSite(document: Document, url: URL): boolean {
    const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content') || '';
    if (generator.toLowerCase().includes('wordpress')) {
        return true;
    }

    if (url.pathname.includes('/wp-') || url.hostname.includes('wpengine')) {
        return true;
    }

    return false;
}

export const wordpressAdapter: HtmlDomainAdapter = {
    matches(url: URL): boolean {
        return url.hostname.includes('wordpress') || url.hostname.includes('wpengine');
    },
    apply(document: Document, result: HtmlCoreExtractionResult): void {
        if (!isWordPressSite(document, new URL(document.URL))) {
            return;
        }

        const startMeta =
            document.querySelector('meta[name="tribe-event-date-start"]') ||
            document.querySelector('meta[property="event:start_time"]') ||
            document.querySelector('meta[property="event:start"]');
        const endMeta =
            document.querySelector('meta[name="tribe-event-date-end"]') ||
            document.querySelector('meta[property="event:end_time"]') ||
            document.querySelector('meta[property="event:end"]');

        const startIso = toISODateTime(startMeta?.getAttribute('content') || startMeta?.getAttribute('value'));
        if (startIso) {
            result.startTime = startIso;
            result.confidence.startTime = Math.max(result.confidence.startTime ?? 0, 0.7);
            result.provenance.sources.push('wordpress.meta.start');
        }

        const endIso = toISODateTime(endMeta?.getAttribute('content') || endMeta?.getAttribute('value'));
        if (endIso) {
            result.endTime = endIso;
            result.confidence.endTime = Math.max(result.confidence.endTime ?? 0, 0.6);
            result.provenance.sources.push('wordpress.meta.end');
        }

        const locationNode =
            document.querySelector('.tribe-event-meta .tribe-venue') ||
            document.querySelector('.tribe-events-venue-details') ||
            document.querySelector('[itemprop="location"]');
        if (locationNode) {
            const text = locationNode.textContent?.trim();
            if (text) {
                result.location = text;
                result.confidence.location = Math.max(result.confidence.location ?? 0, 0.6);
                result.provenance.sources.push('wordpress.dom.location');
            }
        }

        const priceNode =
            document.querySelector('.tribe-events-cost span') ||
            document.querySelector('.event-pricing .price') ||
            document.querySelector('.wp-block-event-price');
        if (priceNode) {
            const text = priceNode.textContent?.trim();
            if (text) {
                result.pricing = {
                    rawText: text,
                    pricingType: text.toLowerCase().includes('free') ? 'Free' : null,
                };
                result.confidence.pricing = Math.max(result.confidence.pricing ?? 0, 0.55);
                result.provenance.sources.push('wordpress.dom.pricing');
            }
        }

        const agendaLink = document.querySelector('a[href*="agenda"], a[href*="schedule"]');
        if (agendaLink?.getAttribute('href')) {
            result.agendaUrl = agendaLink.getAttribute('href')!;
            result.confidence.agendaUrl = Math.max(result.confidence.agendaUrl ?? 0, 0.5);
            result.provenance.sources.push('wordpress.dom.agenda-link');
        }
    },
};



