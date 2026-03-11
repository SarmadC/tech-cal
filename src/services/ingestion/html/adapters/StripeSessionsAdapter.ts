import type { SpeakerRecord } from '@/types/ingestion';
import type { HtmlCoreExtractionResult, ExtractedScheduleItem } from '../EventHtmlExtractor';
import type { HtmlDomainAdapter } from './types';
import { toISODateTime } from './utils/dateUtils';

interface StripeSessionTag {
    name?: string;
}

interface StripeSessionSpeaker {
    name?: string;
    title?: string;
    companyName?: string;
    linkedInProfile?: string | null;
    fullColorPortrait?: { url?: string | null } | null;
}

interface StripeSessionRecord {
    title?: string;
    startDateTime?: string;
    endDateTime?: string;
    description?: string;
    location?: string;
    tags?: { items?: StripeSessionTag[] };
    tracks?: { items?: StripeSessionTag[] };
    speakers?: { items?: StripeSessionSpeaker[] };
}

interface StripeMetadataRecord {
    name?: string;
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    locationVenue?: string;
    locationCity?: string;
    registrationPageUrl?: string;
}

const SESSION_TYPE_PATTERN = /(main stage|breakout|certification|workshop|partner summit|training|meals? and receptions?)/i;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeText = (value?: string | null): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized || undefined;
};

const extractLocalDateKey = (value?: string | null): string | undefined => {
    const normalized = normalizeText(value);
    if (!normalized) {
        return undefined;
    }

    const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1];
};

const getNestedObject = (value: unknown, path: string[]): Record<string, unknown> | undefined => {
    let current: unknown = value;
    for (const segment of path) {
        if (!isPlainObject(current)) {
            return undefined;
        }
        current = current[segment];
    }

    return isPlainObject(current) ? current : undefined;
};

const getNestedArray = (value: unknown, path: string[]): unknown[] | undefined => {
    let current: unknown = value;
    for (const segment of path) {
        if (!isPlainObject(current)) {
            return undefined;
        }
        current = current[segment];
    }

    return Array.isArray(current) ? current : undefined;
};

const parseNextDataPageProps = (document: Document): Record<string, unknown> | undefined => {
    const raw = document.querySelector('#__NEXT_DATA__')?.textContent?.trim();
    if (!raw) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return getNestedObject(parsed, ['props', 'pageProps']);
    } catch {
        return undefined;
    }
};

const findMetadataCandidate = (pageProps: Record<string, unknown>): StripeMetadataRecord | undefined => {
    const candidates = [
        pageProps.metadata,
        getNestedObject(pageProps, ['data', 'heroSection']),
        getNestedObject(pageProps, ['data', 'footerSection']),
        getNestedObject(pageProps, ['heroSection']),
        getNestedObject(pageProps, ['footerSection']),
    ].filter(isPlainObject) as StripeMetadataRecord[];

    const nonExec = candidates.find((candidate) => {
        const title = `${candidate.name ?? ''} ${candidate.title ?? ''}`.toLowerCase();
        return title.includes('sessions') && !title.includes('executive summit');
    });

    return nonExec ?? candidates[0];
};

const buildLocation = (metadata?: StripeMetadataRecord): string | undefined => {
    if (!metadata) {
        return undefined;
    }

    const venue = normalizeText(metadata.locationVenue);
    const city = normalizeText(metadata.locationCity);
    if (venue && city && venue.toLowerCase() !== city.toLowerCase()) {
        return `${venue}, ${city}`;
    }

    return venue ?? city;
};

const extractTrack = (session: StripeSessionRecord): string | undefined => {
    const trackName = (session.tracks?.items ?? [])
        .map((track) => normalizeText(track.name))
        .find((track): track is string => Boolean(track));
    if (trackName) {
        return trackName;
    }

    const tagNames = (session.tags?.items ?? [])
        .map((tag) => normalizeText(tag.name))
        .filter((tag): tag is string => Boolean(tag));
    return tagNames.find((tag) => SESSION_TYPE_PATTERN.test(tag));
};

const mapSpeakers = (session: StripeSessionRecord): SpeakerRecord[] => {
    const speakers: SpeakerRecord[] = [];

    (session.speakers?.items ?? []).forEach((speaker) => {
        const name = normalizeText(speaker.name);
        if (!name) {
            return;
        }

        speakers.push({
            name,
            title: normalizeText(speaker.title),
            company: normalizeText(speaker.companyName),
            linkedinUrl: normalizeText(speaker.linkedInProfile ?? undefined),
            photoUrl: normalizeText(speaker.fullColorPortrait?.url ?? undefined),
        });
    });

    return speakers;
};

const mapSessions = (sessions: StripeSessionRecord[]): ExtractedScheduleItem[] => {
    const dayOrder = new Map<string, number>();
    const sortedDates = Array.from(
        new Set(
            sessions
                .map((session) => extractLocalDateKey(session.startDateTime))
                .filter((value): value is string => Boolean(value))
        )
    ).sort();

    sortedDates.forEach((date, index) => {
        dayOrder.set(date, index + 1);
    });

    const mappedSessions: ExtractedScheduleItem[] = [];

    sessions.forEach((session) => {
        const title = normalizeText(session.title);
        const startTime = toISODateTime(session.startDateTime);
        if (!title || !startTime) {
            return;
        }

        mappedSessions.push({
            title,
            startTime,
            endTime: toISODateTime(session.endDateTime),
            description: normalizeText(session.description),
            location: normalizeText(session.location),
            track: extractTrack(session),
            dayNumber: dayOrder.get(extractLocalDateKey(session.startDateTime) ?? startTime.slice(0, 10)),
            speakers: mapSpeakers(session).map((speaker) => speaker.name),
        });
    });

    return mappedSessions;
};

const collectSessionSpeakers = (sessions: StripeSessionRecord[]): SpeakerRecord[] => {
    const byKey = new Map<string, SpeakerRecord>();

    sessions.forEach((session) => {
        mapSpeakers(session).forEach((speaker) => {
            const key = speaker.linkedinUrl
                ? `linkedin:${speaker.linkedinUrl.toLowerCase()}`
                : `name:${speaker.name.toLowerCase()}`;
            const existing = byKey.get(key);
            byKey.set(key, {
                name: existing?.name ?? speaker.name,
                title: existing?.title ?? speaker.title,
                company: existing?.company ?? speaker.company,
                linkedinUrl: existing?.linkedinUrl ?? speaker.linkedinUrl,
                photoUrl: existing?.photoUrl ?? speaker.photoUrl,
                bio: existing?.bio ?? speaker.bio,
                githubUrl: existing?.githubUrl ?? speaker.githubUrl,
                twitterUrl: existing?.twitterUrl ?? speaker.twitterUrl,
                websiteUrl: existing?.websiteUrl ?? speaker.websiteUrl,
            });
        });
    });

    return Array.from(byKey.values());
};

const scoreScheduleRichness = (items?: ExtractedScheduleItem[]): number =>
    (items ?? []).reduce((score, item) => (
        score
        + (item.dayNumber ? 2 : 0)
        + ((item.speakers?.length ?? 0) > 0 ? 2 : 0)
        + (item.track ? 1 : 0)
        + (item.description ? 1 : 0)
    ), 0);

const scoreSpeakerRichness = (speakers?: SpeakerRecord[]): number =>
    (speakers ?? []).reduce((score, speaker) => (
        score
        + (speaker.linkedinUrl ? 2 : 0)
        + (speaker.title ? 1 : 0)
        + (speaker.company ? 1 : 0)
        + (speaker.photoUrl ? 1 : 0)
    ), 0);

export const stripeSessionsAdapter: HtmlDomainAdapter = {
    matches(url: URL): boolean {
        return url.hostname === 'stripesessions.com' || url.hostname.endsWith('.stripesessions.com');
    },
    apply(document: Document, result: HtmlCoreExtractionResult): void {
        const pageProps = parseNextDataPageProps(document);
        if (!pageProps) {
            return;
        }

        const metadata = findMetadataCandidate(pageProps);
        const scheduleItems = getNestedArray(pageProps, ['events', 'items'])
            ?.filter(isPlainObject) as StripeSessionRecord[] | undefined;

        if (metadata?.title) {
            const title = normalizeText(metadata.title);
            if (title) {
                result.title = title;
                result.confidence.title = Math.max(result.confidence.title ?? 0, 0.95);
                result.provenance.sources.push('stripe.next.title');
            }
        }

        if (metadata?.description) {
            const description = normalizeText(metadata.description);
            if (description) {
                result.description = description;
                result.confidence.description = Math.max(result.confidence.description ?? 0, 0.85);
                result.provenance.sources.push('stripe.next.description');
            }
        }

        const startTime = toISODateTime(metadata?.startDate);
        if (startTime) {
            result.startTime = startTime;
            result.confidence.startTime = Math.max(result.confidence.startTime ?? 0, 0.95);
            result.provenance.sources.push('stripe.next.start');
        }

        const endTime = toISODateTime(metadata?.endDate);
        if (endTime) {
            result.endTime = endTime;
            result.confidence.endTime = Math.max(result.confidence.endTime ?? 0, 0.9);
            result.provenance.sources.push('stripe.next.end');
        }

        const location = buildLocation(metadata);
        if (location) {
            result.location = location;
            result.confidence.location = Math.max(result.confidence.location ?? 0, 0.9);
            result.provenance.sources.push('stripe.next.location');
        }

        if (!result.agendaUrl) {
            result.agendaUrl = new URL('/talks', document.URL).toString();
            result.confidence.agendaUrl = Math.max(result.confidence.agendaUrl ?? 0, 0.9);
            result.provenance.sources.push('stripe.next.agenda-link');
        }

        if (scheduleItems && scheduleItems.length > 0) {
            const mappedSchedule = mapSessions(scheduleItems);
            if (
                mappedSchedule.length > (result.schedule?.length ?? 0)
                || (
                    mappedSchedule.length === (result.schedule?.length ?? 0)
                    && scoreScheduleRichness(mappedSchedule) > scoreScheduleRichness(result.schedule)
                )
            ) {
                result.schedule = mappedSchedule;
                result.confidence.schedule = Math.max(result.confidence.schedule ?? 0, 0.98);
                result.provenance.sources.push('stripe.next.schedule');
            }

            const mappedSpeakers = collectSessionSpeakers(scheduleItems);
            if (
                mappedSpeakers.length > (result.speakers?.length ?? 0)
                || (
                    mappedSpeakers.length === (result.speakers?.length ?? 0)
                    && scoreSpeakerRichness(mappedSpeakers) > scoreSpeakerRichness(result.speakers)
                )
            ) {
                result.speakers = mappedSpeakers;
                result.confidence.speakers = Math.max(result.confidence.speakers ?? 0, 0.9);
                result.provenance.sources.push('stripe.next.speakers');
            }
        }
    },
};
