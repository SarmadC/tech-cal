import type { EventAgendaSchema } from '@/types/firecrawl';
import { parseLocalTime } from '@/utils/ingestion/ExtractNormalization';
import type { ScheduleLinkDetail } from '@/services/ingestion/FirecrawlSiteAnalyzer';
import type { SiteScheduleFetcher } from './types';

const USER_AGENT = 'tech-cal-bot/1.0 (+https://tech-cal.com)';

const decodeHtml = (value: string): string =>
    value
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&ldquo;/g, '“')
        .replace(/&rdquo;/g, '”')
        .replace(/&lsquo;/g, '‘')
        .replace(/&rsquo;/g, '’');

const DEFAULT_SCHEDULE_URL = 'https://websummit.com/schedule/';

export const WebSummitScheduleFetcher: SiteScheduleFetcher = {
    name: 'websummit-html',
    matches(request) {
        return request.domain.endsWith('websummit.com');
    },

    async fetch(request) {
        const orderedLinks = orderScheduleLinks(request.scheduleLinks, request.startingLink);
        const agenda: EventAgendaSchema[] = [];
        const processed: string[] = [];

        for (const link of orderedLinks) {
            if (agenda.length >= request.limit) {
                break;
            }

            try {
                const items = await fetchAgendaItems({
                    scheduleUrl: link.url,
                    limit: request.limit - agenda.length,
                });

                if (items.length > 0) {
                    agenda.push(...items);
                }
                processed.push(link.url);
            } catch (error) {
                console.warn(`[WebSummitScheduleFetcher] Failed to load schedule for ${link.url}:`, error);
            }
        }

        if (agenda.length === 0 && processed.length === 0) {
            // Fall back to default schedule page if nothing processed
            try {
                const items = await fetchAgendaItems({
                    scheduleUrl: DEFAULT_SCHEDULE_URL,
                    limit: request.limit,
                });
                return { agenda: items, processedLinks: items.length > 0 ? [DEFAULT_SCHEDULE_URL] : [] };
            } catch (error) {
                console.warn('[WebSummitScheduleFetcher] Default schedule fetch failed:', error);
            }
        }

        return { agenda, processedLinks: processed };
    },
};

function orderScheduleLinks(
    links: ScheduleLinkDetail[],
    startingLink?: string | null
): ScheduleLinkDetail[] {
    if (!links || links.length === 0) {
        return [{ url: DEFAULT_SCHEDULE_URL, type: 'schedule' }];
    }

    if (!startingLink) {
        return links;
    }

    const urls = links.map((link) => link.url);
    const startIndex = urls.indexOf(startingLink);
    if (startIndex === -1) {
        return links;
    }

    return [...links.slice(startIndex), ...links.slice(0, startIndex)];
}

async function fetchAgendaItems(options: { limit: number; scheduleUrl: string }): Promise<EventAgendaSchema[]> {
    const response = await fetch(options.scheduleUrl, {
            method: 'GET',
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'text/html,application/xhtml+xml',
            },
        });

    if (!response.ok) {
        throw new Error(`Failed to load Web Summit schedule (${response.status})`);
    }

    const html = await response.text();
    return parseScheduleHtml(html, options.limit);
}

function parseScheduleHtml(html: string, limit: number): EventAgendaSchema[] {
    const agenda: EventAgendaSchema[] = [];
    const cardRegex = /<div class="SessionCardStyled__SessionCardWrapper[^>]*>[\s\S]*?<\/a>\s*<\/div>\s*<\/div>/g;
    const dayIndex = new Map<string, number>();
    let currentDay = 0;

    const cards = html.match(cardRegex) || [];

    for (const card of cards) {
        if (agenda.length >= limit) {
            break;
        }

        const trackMatch = card.match(/SessionCardStyled__SessionTrackLabel[^>]*>([^<]+)</);
        const track = trackMatch ? decodeHtml(trackMatch[1].trim()) : undefined;

        const titleMatch = card.match(/SessionCardStyled__SessionCardHeader[^>]*>([^<]+)</);
        const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : undefined;
        if (!title) continue;

        const timeMatches = [...card.matchAll(/<time[^>]*>([^<]+)<\/time>/g)].map((m) => decodeHtml(m[1].trim()));
        const dateLabel = timeMatches[0] || undefined;
        const timeRange = timeMatches[1] || undefined;

        const { startTimeLocal, endTimeLocal } = parseTimeRange(timeRange);

        let dayNumber: number | undefined;
        if (dateLabel) {
            if (!dayIndex.has(dateLabel)) {
                currentDay += 1;
                dayIndex.set(dateLabel, currentDay);
            }
            dayNumber = dayIndex.get(dateLabel);
        }

        const locationMatch = card.match(/SessionCardLocation__StyledAddress[^>]*>([\s\S]*?)<\/address>/);
        const locationText = locationMatch
            ? decodeHtml(locationMatch[1].replace(/<[^>]+>/g, '').trim())
            : undefined;

        const speakerMatches = [...card.matchAll(/SessionCardStyled__ChildName[^>]*>([^<]+)</g)].map((m) =>
            decodeHtml(m[1].trim())
        );

        agenda.push({
            title,
            startTime: startTimeLocal,
            endTime: endTimeLocal,
            dayNumber,
            track,
            location: locationText,
            speakers: speakerMatches,
        });
    }

    return agenda;
}

function parseTimeRange(range?: string): { startTimeLocal?: string; endTimeLocal?: string } {
    if (!range) {
        return {};
    }

    const parts = range.split('-').map((part) => part.trim());
    const start = parseLocalTime(parts[0]);
    const end = parseLocalTime(parts[1]);

    return {
        startTimeLocal: start ? `${start}:00` : undefined,
        endTimeLocal: end ? `${end}:00` : undefined,
    };
}

