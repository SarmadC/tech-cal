import type { HtmlCoreExtractionResult } from '../EventHtmlExtractor';
import type { HtmlDomainAdapter } from './types';
import { eventbriteAdapter } from './EventbriteAdapter';
import { meetupAdapter } from './MeetupAdapter';
import { wordpressAdapter } from './WordPressAdapter';

const ADAPTERS: HtmlDomainAdapter[] = [eventbriteAdapter, meetupAdapter, wordpressAdapter];

export function applyDomainAdapters(url: URL, document: Document, result: HtmlCoreExtractionResult): void {
    for (const adapter of ADAPTERS) {
        if (adapter.matches(url)) {
            adapter.apply(document, result);
        }
    }
}


