import type { HtmlCoreExtractionResult } from '../EventHtmlExtractor';
import { stripeSessionsAdapter } from './StripeSessionsAdapter';
import type { HtmlDomainAdapter } from './types';
import { wordpressAdapter } from './WordPressAdapter';

const ADAPTERS: HtmlDomainAdapter[] = [stripeSessionsAdapter, wordpressAdapter];

export function applyDomainAdapters(url: URL, document: Document, result: HtmlCoreExtractionResult): void {
    for (const adapter of ADAPTERS) {
        if (adapter.matches(url)) {
            adapter.apply(document, result);
        }
    }
}
