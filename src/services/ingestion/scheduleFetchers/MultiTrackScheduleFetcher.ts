import { GenericHtmlScheduleFetcher } from './GenericHtmlScheduleFetcher';
import { GenericJsonScheduleFetcher } from './GenericJsonScheduleFetcher';
import type { ScheduleFallbackRequest, ScheduleFallbackResult, SiteScheduleFetcher } from './types';

/**
 * Register specialized adapters here. Provide a descriptive `name`, a narrow `matches` predicate,
 * and a `fetch` implementation that returns agenda items. Most conference sites are served by the
 * generic JSON/HTML fetchers; add a dedicated adapter only when a domain diverges from the common
 * patterns (e.g., bespoke markup or authenticated APIs).
 */
// Ordered list of specialized fetchers; generic HTML fallback executes when none match.
const SITE_FETCHERS: SiteScheduleFetcher[] = [GenericJsonScheduleFetcher];

export class MultiTrackScheduleFetcher {
    static async fetch(request: ScheduleFallbackRequest): Promise<ScheduleFallbackResult> {
        for (const fetcher of SITE_FETCHERS) {
            if (fetcher.matches(request)) {
                console.log(
                    `[MultiTrackScheduleFetcher] Using ${fetcher.name} fetcher for ${request.domain} (links=${request.scheduleLinks.length})`
                );
                return fetcher.fetch(request);
            }
        }

        console.log(
            `[MultiTrackScheduleFetcher] Falling back to ${GenericHtmlScheduleFetcher.name} fetcher for ${request.domain} (links=${request.scheduleLinks.length})`
        );
        return GenericHtmlScheduleFetcher.fetch(request);
    }
}
