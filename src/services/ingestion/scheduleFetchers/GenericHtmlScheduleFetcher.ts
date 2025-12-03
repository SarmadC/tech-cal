import type { EventAgendaSchema } from '@/types/ingestion';
import { parseLocalTime } from '@/utils/ingestion/ExtractNormalization';
import type { ScheduleFallbackRequest, SiteScheduleFetcher, ScheduleLinkDetail, ScheduleHint } from './types';

const USER_AGENT = 'tech-cal-bot/1.0 (+https://tech-cal.com)';
const TRACK_PARAM_KEYS = ['track', 'stage', 'stream', 'topic', 'pillar', 'channel'];
const DAY_PARAM_KEYS = ['day', 'date', 'sessionday', 'day_number', 'dayid'];

const WRAPPER_PATTERNS: RegExp[] = [
    /<article[^>]*(session|agenda|schedule)[^>]*>[\s\S]*?<\/article>/gi,
    /<div[^>]*(session-card|agenda-item|schedule-item|event-card)[^>]*>[\s\S]*?<\/div>/gi,
    /<li[^>]*(session|agenda|schedule)[^>]*>[\s\S]*?<\/li>/gi,
    /<section[^>]*(session|agenda|schedule)[^>]*>[\s\S]*?<\/section>/gi,
];

const TITLE_PATTERNS: RegExp[] = [
    /<h[1-4][^>]*>([\s\S]+?)<\/h[1-4]>/i,
    /class="[^"]*(session|agenda|schedule)[^>]*title[^"]*"[^>]*>([\s\S]+?)</i,
    /class="[^"]*title[^"]*"[^>]*>([\s\S]+?)</i,
    /<strong[^>]*>([\s\S]+?)<\/strong>/i,
];

const LOCATION_PATTERNS: RegExp[] = [
    /class="[^"]*(location|venue|room)[^"]*"[^>]*>([\s\S]+?)</i,
    /<address[^>]*>([\s\S]+?)<\/address>/i,
];

const TRACK_PATTERNS: RegExp[] = [
    /class="[^"]*(track|stage|stream)[^"]*"[^>]*>([\s\S]+?)</i,
    /(Track|Stage|Stream):\s*([^<\n]+)/i,
];

const SPEAKER_PATTERNS: RegExp[] = [
    /class="[^"]*(speaker|presenter|host)[^"]*"[^>]*>([\s\S]+?)</gi,
    /<span[^>]*>([\s\S]+?)<\/span>/gi,
];

const TIME_RANGE_PATTERNS: RegExp[] = [
    /(<time[^>]*>[\s\S]+?<\/time>)/gi,
    /(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*(?:-|to|–)\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
];

export const GenericHtmlScheduleFetcher: SiteScheduleFetcher = {
    name: 'generic-html',
    matches(request) {
        return request.scheduleLinks.some((link) => {
            const format = link.contentFormat ?? 'html';
            const hints = link.hints ?? [];
            return (
                format === 'html' ||
                hints.includes('track-filter') ||
                hints.includes('day-tabs') ||
                hints.includes('time-filter')
            );
        });
    },

    async fetch(request) {
        const agenda: EventAgendaSchema[] = [];
        const processed: string[] = [];

        for (const link of request.scheduleLinks) {
            if (agenda.length >= request.limit) {
                break;
            }

            try {
                const items = await fetchAgendaFromLink(link, request, request.limit - agenda.length);
                if (items.length > 0) {
                    agenda.push(...items);
                }
                processed.push(link.url);
            } catch (error) {
                console.warn(`[GenericHtmlScheduleFetcher] Failed to parse schedule for ${link.url}:`, error);
            }
        }

        return { agenda, processedLinks: processed };
    },
};

async function fetchAgendaFromLink(
    link: ScheduleLinkDetail,
    request: ScheduleFallbackRequest,
    remainingLimit: number
): Promise<EventAgendaSchema[]> {
    const response = await fetch(link.url, {
        method: 'GET',
        headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to load schedule (${response.status})`);
    }

    const html = await response.text();
    const context = buildExtractionContext(link, request.scheduleHints ?? []);
    return extractAgendaFromHtml(html, remainingLimit, context);
}

interface ExtractionContext {
    track?: string;
    dayLabel?: string;
    hints: ScheduleHint[];
}

function buildExtractionContext(link: ScheduleLinkDetail, hints: ScheduleHint[]): ExtractionContext {
    const context: ExtractionContext = { hints };

    try {
        const parsed = new URL(link.url);
        const params = parsed.searchParams;
        for (const key of TRACK_PARAM_KEYS) {
            const value = params.get(key);
            if (value) {
                context.track = decodeHtml(value);
                break;
            }
        }
        for (const key of DAY_PARAM_KEYS) {
            const value = params.get(key);
            if (value) {
                context.dayLabel = decodeHtml(value);
                break;
            }
        }
    } catch {
        // ignore URL parse errors
    }

    if (link.hints) {
        context.hints = [...new Set([...context.hints, ...link.hints])];
    }

    return context;
}

function extractAgendaFromHtml(html: string, limit: number, context: ExtractionContext): EventAgendaSchema[] {
    const blocks = findCandidateBlocks(html, limit * 3);
    const agenda: EventAgendaSchema[] = [];

    for (const block of blocks) {
        if (agenda.length >= limit) {
            break;
        }

        const title = extractTitle(block);
        if (!title) {
            continue;
        }

        const { startTimeLocal, endTimeLocal } = extractTimeRange(block);
        const location = extractLocation(block);
        const track = context.track ?? extractTrack(block);
        const speakers = extractSpeakers(block);

        const agendaItem: EventAgendaSchema = {
            title,
            startTime: startTimeLocal,
            endTime: endTimeLocal,
            location,
            track: track || undefined,
            dayNumber: deriveDayNumber(context.dayLabel),
            description: extractDescription(block),
            speakers: speakers.length > 0 ? speakers : undefined,
        };

        agenda.push(agendaItem);
    }

    return agenda;
}

function findCandidateBlocks(html: string, maxBlocks: number): string[] {
    for (const pattern of WRAPPER_PATTERNS) {
        const matches = html.match(pattern) || [];
        if (matches.length > 0) {
            return matches.slice(0, maxBlocks);
        }
    }

    // Fallback: split by sections that include session keywords
    const fallbackSegments = html
        .split(/<div[^>]*class="[^"]*(day|track)[^"]*"[^>]*>/i)
        .filter((segment) => /(session|agenda|schedule)/i.test(segment))
        .slice(0, maxBlocks);

    return fallbackSegments;
}

function extractTitle(block: string): string | undefined {
    for (const pattern of TITLE_PATTERNS) {
        const match = block.match(pattern);
        if (match) {
            const candidate = match[1] ?? match[2];
            const cleaned = cleanText(candidate);
            if (cleaned) {
                return cleaned;
            }
        }
    }
    return undefined;
}

function extractTimeRange(block: string): { startTimeLocal?: string; endTimeLocal?: string } {
    const timeTags: string[] = [];
    for (const pattern of TIME_RANGE_PATTERNS) {
        const matches = [...block.matchAll(pattern)];
        if (matches.length > 0) {
            for (const match of matches) {
                if (match[1] && !match[2]) {
                    const content = stripHtml(match[1]);
                    if (content) {
                        timeTags.push(content);
                    }
                } else if (match[1] && match[2]) {
                    timeTags.push(`${match[1]}-${match[2]}`);
                }
            }
            break;
        }
    }

    if (timeTags.length === 0) {
        return {};
    }

    const expandedTimes = timeTags
        .flatMap((entry) => entry.split(/[-–to]+/i))
        .map((value) => cleanText(value))
        .filter(Boolean);

    const start = expandedTimes[0] ? parseLocalTime(expandedTimes[0]) : undefined;
    const end = expandedTimes[1] ? parseLocalTime(expandedTimes[1]) : undefined;
    return { startTimeLocal: start, endTimeLocal: end };
}

function extractLocation(block: string): string | undefined {
    for (const pattern of LOCATION_PATTERNS) {
        const match = block.match(pattern);
        if (match) {
            const value = cleanText(match[1] ?? match[2]);
            if (value) {
                return value;
            }
        }
    }
    return undefined;
}

function extractTrack(block: string): string | undefined {
    for (const pattern of TRACK_PATTERNS) {
        const match = block.match(pattern);
        if (match) {
            const value = cleanText(match[1] ?? match[2]);
            if (value) {
                return value;
            }
        }
    }
    return undefined;
}

function extractSpeakers(block: string): string[] {
    const names = new Set<string>();
    for (const pattern of SPEAKER_PATTERNS) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(block)) !== null) {
            const value = cleanText(match[1] ?? match[2]);
            if (value && /^[A-Za-z]/.test(value)) {
                names.add(value);
            }
        }
    }
    return Array.from(names).slice(0, 6);
}

function extractDescription(block: string): string | undefined {
    const paragraphMatch = block.match(/<p[^>]*>([\s\S]+?)<\/p>/i);
    if (paragraphMatch) {
        const value = cleanText(paragraphMatch[1]);
        if (value && value.length > 20) {
            return value;
        }
    }
    return undefined;
}

function deriveDayNumber(dayLabel?: string): number | undefined {
    if (!dayLabel) {
        return undefined;
    }

    const numericMatch = dayLabel.match(/\d+/);
    if (numericMatch) {
        const dayNumber = Number(numericMatch[0]);
        if (!Number.isNaN(dayNumber) && dayNumber > 0 && dayNumber < 15) {
            return dayNumber;
        }
    }

    const wordMatch = dayLabel.match(/first|second|third|fourth|fifth/i);
    if (wordMatch) {
        switch (wordMatch[0].toLowerCase()) {
            case 'first':
                return 1;
            case 'second':
                return 2;
            case 'third':
                return 3;
            case 'fourth':
                return 4;
            case 'fifth':
                return 5;
            default:
                return undefined;
        }
    }

    return undefined;
}

function cleanText(value?: string | null): string {
    if (!value) {
        return '';
    }
    return decodeHtml(stripHtml(value)).replace(/\s+/g, ' ').trim();
}

function stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value: string): string {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&ldquo;/g, '“')
        .replace(/&rdquo;/g, '”')
        .replace(/&lsquo;/g, '‘')
        .replace(/&rsquo;/g, '’');
}
