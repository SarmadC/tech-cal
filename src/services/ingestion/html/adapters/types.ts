import type { HtmlCoreExtractionResult } from '../EventHtmlExtractor';

export interface HtmlDomainAdapter {
    matches(url: URL): boolean;
    apply(document: Document, result: HtmlCoreExtractionResult): void;
}





