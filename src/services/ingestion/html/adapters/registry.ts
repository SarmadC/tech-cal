import type { HtmlCoreExtractionResult } from '../EventHtmlExtractor';
import type { HtmlDomainAdapter } from './types';
import { wordpressAdapter } from './WordPressAdapter';

const ADAPTERS: HtmlDomainAdapter[] = [wordpressAdapter];

export function applyDomainAdapters(url: URL, document: Document, result: HtmlCoreExtractionResult): void {
    for (const adapter of ADAPTERS) {
        if (adapter.matches(url)) {
            adapter.apply(document, result);
        }
    }
}
