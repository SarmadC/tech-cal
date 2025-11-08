import type { ScheduleLinkDetail, ScheduleHint } from '@/services/ingestion/FirecrawlSiteAnalyzer';
import type { EventAgendaSchema } from '@/types/firecrawl';
import { parseLocalTime } from '@/utils/ingestion/ExtractNormalization';
import type { ScheduleFallbackRequest, SiteScheduleFetcher } from './types';

const USER_AGENT = 'tech-cal-bot/1.0 (+https://tech-cal.com)';

const TITLE_KEYS = ['title', 'name', 'sessionName', 'headline'];
const START_KEYS = ['startTime', 'start_time', 'start', 'start_at', 'startDate', 'startDateTime'];
const END_KEYS = ['endTime', 'end_time', 'end', 'end_at', 'endDate', 'endDateTime'];
const DESCRIPTION_KEYS = ['description', 'summary', 'abstract', 'details'];
const TRACK_KEYS = ['track', 'stage', 'stream', 'topic'];
const LOCATION_KEYS = ['location', 'venue', 'room'];
const DAY_KEYS = ['day', 'dayNumber', 'day_number', 'day_index'];
const SPEAKERS_KEYS = ['speakers', 'speakerNames', 'speaker_names', 'presenters'];

export const GenericJsonScheduleFetcher: SiteScheduleFetcher = {
    name: 'generic-json',
    matches(request) {
        return request.scheduleLinks.some((link) => {
            const hints = link.hints ?? [];
            return (
                link.type === 'api' ||
                link.contentFormat === 'json' ||
                link.contentFormat === 'graphql' ||
                hints.includes('api-endpoint') ||
                hints.includes('json-data') ||
                hints.includes('graphql-data')
            );
        });
    },

    async fetch(request) {
        const agenda: EventAgendaSchema[] = [];
        const processed: string[] = [];
        const jsonLinks = request.scheduleLinks.filter((link) =>
            link.type === 'api' || link.contentFormat === 'json' || link.contentFormat === 'graphql'
        );

        for (const link of jsonLinks) {
            if (agenda.length >= request.limit) {
                break;
            }

            try {
                const items = await fetchAgendaFromEndpoint(link, request, request.limit - agenda.length);
                if (items.length > 0) {
                    agenda.push(...items);
                }
                processed.push(link.url);
            } catch (error) {
                console.warn(`[GenericJsonScheduleFetcher] Failed to parse schedule for ${link.url}:`, error);
            }
        }

        return { agenda, processedLinks: processed };
    },
};

async function fetchAgendaFromEndpoint(
    link: ScheduleLinkDetail,
    request: ScheduleFallbackRequest,
    remainingLimit: number
): Promise<EventAgendaSchema[]> {
    const headers: Record<string, string> = {
        'User-Agent': USER_AGENT,
        Accept: 'application/json,text/plain;q=0.8',
    };

    const response = await fetch(link.url, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        throw new Error(`Failed to load schedule API (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';
    let payload: unknown;
    try {
        if (contentType.includes('application/json')) {
            payload = await response.json();
        } else {
            const text = await response.text();
            payload = JSON.parse(text);
        }
    } catch (error) {
        throw new Error(`Failed to parse JSON payload: ${(error as Error).message}`);
    }

    const context = buildApiContext(link, request.scheduleHints ?? []);
    return extractAgendaFromJson(payload, remainingLimit, context);
}

interface ApiExtractionContext {
    track?: string;
    dayLabel?: string;
    hints: ScheduleHint[];
}

function buildApiContext(link: ScheduleLinkDetail, hints: ScheduleHint[]): ApiExtractionContext {
    const context: ApiExtractionContext = { hints };
    try {
        const parsed = new URL(link.url);
        const params = parsed.searchParams;
        for (const key of TRACK_KEYS) {
            const value = params.get(key);
            if (value) {
                context.track = decodeURIComponent(value);
                break;
            }
        }
        for (const key of DAY_KEYS) {
            const value = params.get(key);
            if (value) {
                context.dayLabel = decodeURIComponent(value);
                break;
            }
        }
    } catch {
        // ignore invalid URLs
    }

    if (link.hints) {
        context.hints = [...new Set([...context.hints, ...link.hints])];
    }

    return context;
}

function extractAgendaFromJson(
    payload: unknown,
    limit: number,
    context: ApiExtractionContext
): EventAgendaSchema[] {
    const arrays = findCandidateArrays(payload);
    const agenda: EventAgendaSchema[] = [];

    for (const sessions of arrays) {
        for (const session of sessions) {
            if (agenda.length >= limit) {
                break;
            }
            const item = mapSessionRecord(session, context);
            if (item) {
                agenda.push(item);
            }
        }
        if (agenda.length >= limit) {
            break;
        }
    }

    return agenda;
}

function findCandidateArrays(node: unknown, depth = 0, maxDepth = 5): Array<Record<string, unknown>[]> {
    if (depth > maxDepth || node == null) {
        return [];
    }

    const collections: Array<Record<string, unknown>[]> = [];

    if (Array.isArray(node)) {
        if (node.length > 0 && typeof node[0] === 'object' && node[0] !== null) {
            const sample = node[0] as Record<string, unknown>;
            if (isLikelySessionRecord(sample)) {
                collections.push(node as Record<string, unknown>[]);
            }
        }
        for (const item of node) {
            collections.push(...findCandidateArrays(item, depth + 1, maxDepth));
        }
        return collections;
    }

    if (typeof node === 'object') {
        const record = node as Record<string, unknown>;
        for (const value of Object.values(record)) {
            collections.push(...findCandidateArrays(value, depth + 1, maxDepth));
        }
    }

    return collections;
}

function isLikelySessionRecord(record: Record<string, unknown>): boolean {
    const hasTitle = TITLE_KEYS.some((key) => typeof record[key] === 'string' && !!(record[key] as string).trim());
    if (!hasTitle) {
        return false;
    }
    const hasTime = START_KEYS.concat(END_KEYS).some((key) => key in record);
    const hasDescription = DESCRIPTION_KEYS.some((key) => typeof record[key] === 'string');
    const hasTrack = TRACK_KEYS.some((key) => typeof record[key] === 'string');
    return hasTime || hasDescription || hasTrack;
}

function mapSessionRecord(
    record: Record<string, unknown>,
    context: ApiExtractionContext
): EventAgendaSchema | null {
    const title = getFirstString(record, TITLE_KEYS);
    if (!title) {
        return null;
    }

    const start = normalizeTime(record, START_KEYS);
    const end = normalizeTime(record, END_KEYS);
    const location = getFirstString(record, LOCATION_KEYS);
    const track = getFirstString(record, TRACK_KEYS) ?? context.track;
    const description = getFirstString(record, DESCRIPTION_KEYS);
    const dayNumber = deriveDayNumber(getFirstString(record, DAY_KEYS) ?? context.dayLabel);
    const speakers = extractSpeakersFromRecord(record);

    const agendaItem: EventAgendaSchema = {
        title,
        startTimeLocal: start,
        endTimeLocal: end,
        location: location ?? undefined,
        track: track ?? undefined,
        description: description ?? undefined,
        dayNumber,
        speakers: speakers.length > 0 ? speakers : undefined,
    };

    return agendaItem;
}

function getFirstString(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string') {
            const cleaned = value.trim();
            if (cleaned) {
                return cleaned;
            }
        }
    }
    return undefined;
}

function normalizeTime(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string') {
            const isoMatch = value.match(/T(\d{2}):(\d{2})/);
            if (isoMatch) {
                return `${isoMatch[1]}:${isoMatch[2]}`;
            }
            const parsed = parseLocalTime(value);
            if (parsed) {
                return parsed;
            }
        }
        if (typeof value === 'number') {
            // Assume value is seconds since epoch or milliseconds
            if (value > 10_000_000_000) {
                const date = new Date(value);
                return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
            }
            if (value > 86_400) {
                const date = new Date(value * 1000);
                return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
            }
        }
    }
    return undefined;
}

function extractSpeakersFromRecord(record: Record<string, unknown>): string[] {
    for (const key of SPEAKERS_KEYS) {
        const value = record[key];
        if (Array.isArray(value)) {
            const speakers = value
                .map((entry) => {
                    if (typeof entry === 'string') {
                        return entry.trim();
                    }
                    if (entry && typeof entry === 'object') {
                        return getFirstString(entry as Record<string, unknown>, ['name', 'fullName', 'title']);
                    }
                    return undefined;
                })
                .filter((name): name is string => Boolean(name));
            if (speakers.length > 0) {
                return Array.from(new Set(speakers)).slice(0, 6);
            }
        }
    }
    return [];
}

function deriveDayNumber(dayLabel?: string): number | undefined {
    if (!dayLabel) {
        return undefined;
    }

    const numericMatch = dayLabel.match(/\d+/);
    if (numericMatch) {
        const value = Number(numericMatch[0]);
        if (!Number.isNaN(value) && value > 0 && value < 15) {
            return value;
        }
    }

    const lowered = dayLabel.toLowerCase();
    if (lowered.includes('first')) return 1;
    if (lowered.includes('second')) return 2;
    if (lowered.includes('third')) return 3;
    if (lowered.includes('fourth')) return 4;
    if (lowered.includes('fifth')) return 5;
    return undefined;
}

function pad2(value: number): string {
    return value < 10 ? `0${value}` : String(value);
}
