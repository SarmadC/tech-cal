import { createHash } from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { validateUrlForServerFetch } from '@/lib/ssrfProtection';

const SCHEMA_VERSION = 1;
const EVENT_TYPES = ['tech_event', 'hackathon', 'meetup', 'conference', 'workshop', 'other'] as const;
const EVENT_FORMATS = ['Online', 'In-person', 'Hybrid'] as const;
const EVENT_PATTERNS = ['single', 'multi_day', 'all_day', 'custom'] as const;
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const PRICING_TYPES = ['Free', 'Paid', 'Varies'] as const;

const urlFieldLabels: Record<string, string> = {
    source_url: 'Event website',
    registration_url: 'Registration URL',
    livestream_url: 'Livestream URL',
    event_image_url: 'Event image URL',
    agenda_url: 'Agenda URL',
    organizer_website_url: 'Organizer website URL',
    organizer_logo_url: 'Organizer logo URL',
    series_website_url: 'Series website URL',
    speaker_photo_url: 'Speaker photo URL',
    speaker_linkedin_url: 'Speaker LinkedIn URL',
    speaker_twitter_url: 'Speaker Twitter URL',
    speaker_website_url: 'Speaker website URL',
};

export type RiskFlag =
    | 'many_external_urls'
    | 'repeat_submission'
    | 'possible_duplicate_event'
    | 'long_description'
    | 'large_speaker_list'
    | 'unsafe_submitted_url';

type NormalizedSubmissionSpeaker = {
    name: string;
    title?: string;
    company?: string;
    bio?: string;
    photo_url?: string;
    linkedin_url?: string;
    twitter_url?: string;
    website_url?: string;
};

function stripHtmlToPlainText(value: string): string {
    return sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'discard',
    }).trim();
}

function blankToUndefined(value: unknown) {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}

function plainTextToUndefined(value: unknown) {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'string') return value;
    const sanitized = stripHtmlToPlainText(value).trim();
    return sanitized === '' ? undefined : sanitized;
}

function requiredPlainText(fieldName: string, max: number) {
    return z.preprocess(
        plainTextToUndefined,
        z.string({ required_error: `${fieldName} is required` })
            .min(1, `${fieldName} is required`)
            .max(max, `${fieldName} must be ${max} characters or fewer`)
    );
}

function optionalPlainText(max: number) {
    return z.preprocess(
        plainTextToUndefined,
        z.string().max(max, `Must be ${max} characters or fewer`).optional()
    );
}

function optionalIsoDateTime() {
    return z.preprocess(
        blankToUndefined,
        z.string().transform((value, ctx) => {
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Must be a valid datetime',
                });
                return z.NEVER;
            }

            return parsed.toISOString();
        }).optional()
    );
}

function normalizeIpv4Host(hostname: string): boolean {
    const parts = hostname.split('.').map((part) => Number.parseInt(part, 10));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
        return false;
    }

    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
}

function normalizeHostLiteral(hostname: string): string {
    const normalized = hostname.toLowerCase();
    if (normalized.startsWith('[') && normalized.endsWith(']')) {
        return normalized.slice(1, -1);
    }
    return normalized;
}

function isPrivateHostname(hostname: string): boolean {
    const normalized = normalizeHostLiteral(hostname);

    if (
        normalized === 'localhost' ||
        normalized.endsWith('.localhost') ||
        normalized === '::1' ||
        normalized.startsWith('::ffff:') ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:')
    ) {
        return true;
    }

    return normalizeIpv4Host(normalized);
}

function normalizeSafeUrl(value: string, fieldName: string) {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`${fieldName} must be a valid URL`);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`${fieldName} must use http or https`);
    }
    if (url.username || url.password) {
        throw new Error(`${fieldName} cannot include credentials`);
    }
    if (isPrivateHostname(url.hostname)) {
        throw new Error(`${fieldName} must be publicly reachable`);
    }

    url.hash = '';
    return url.toString();
}

function optionalSafeUrl(fieldName: keyof typeof urlFieldLabels) {
    return z.preprocess(
        blankToUndefined,
        z.string().max(2048).transform((value) => normalizeSafeUrl(value, urlFieldLabels[fieldName])).optional()
    );
}

function optionalNonNegativeInteger() {
    return z.preprocess(
        blankToUndefined,
        z.coerce.number().int().min(0).optional()
    );
}

function optionalNonNegativeNumber() {
    return z.preprocess(
        blankToUndefined,
        z.coerce.number().min(0).optional()
    );
}

const speakerSchema = z.object({
    name: requiredPlainText('Speaker name', 160),
    title: optionalPlainText(160),
    company: optionalPlainText(160),
    bio: optionalPlainText(4000),
    photo_url: optionalSafeUrl('speaker_photo_url'),
    linkedin_url: optionalSafeUrl('speaker_linkedin_url'),
    twitter_url: optionalSafeUrl('speaker_twitter_url'),
    website_url: optionalSafeUrl('speaker_website_url'),
}).strip();

const detailsSchema = z.object({
    description: optionalPlainText(4000),
    website_url: optionalSafeUrl('organizer_website_url'),
    logo_url: optionalSafeUrl('organizer_logo_url'),
}).strip();

const seriesSchema = z.object({
    name: optionalPlainText(160),
    description: optionalPlainText(4000),
    website_url: optionalSafeUrl('series_website_url'),
}).strip();

export const organizerSubmissionSchema = z.object({
    title: requiredPlainText('Title', 160),
    description: optionalPlainText(10000),
    event_type: z.enum(EVENT_TYPES, {
        errorMap: () => ({ message: 'Event type is invalid' }),
    }),
    organizer_name: requiredPlainText('Organizer name', 160),
    organizer_details: z.preprocess(
        (value) => (value === null ? undefined : value),
        detailsSchema.optional()
    ),
    start_date: optionalIsoDateTime(),
    end_date: optionalIsoDateTime(),
    timezone: optionalPlainText(80),
    event_format: z.enum(EVENT_FORMATS, {
        errorMap: () => ({ message: 'Event format is invalid' }),
    }),
    is_virtual: z.boolean().optional(),
    location: optionalPlainText(300),
    location_city: optionalPlainText(120),
    location_state: optionalPlainText(120),
    location_country: optionalPlainText(120),
    virtual_platform: optionalPlainText(120),
    event_pattern: z.preprocess(blankToUndefined, z.enum(EVENT_PATTERNS).optional()),
    is_multi_day: z.boolean().optional().default(false),
    language: z.preprocess(blankToUndefined, z.string().max(8).transform((value) => value.toLowerCase()).optional()),
    difficulty_level: z.preprocess(blankToUndefined, z.enum(DIFFICULTY_LEVELS).optional()),
    capacity: optionalNonNegativeInteger(),
    attendee_count: optionalNonNegativeInteger(),
    certificate_offered: z.boolean().optional().default(false),
    recording_available: z.boolean().optional().default(false),
    social_media_hashtag: optionalPlainText(120),
    target_audience: optionalPlainText(4000),
    prerequisites: optionalPlainText(4000),
    accessibility_features: z.preprocess(
        (value) => {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
            return value;
        },
        z.object({
            captioning: z.boolean().optional().default(false),
            sign_language: z.boolean().optional().default(false),
            translator: z.boolean().optional().default(false),
        }).strip().optional()
    ),
    source_url: optionalSafeUrl('source_url'),
    registration_url: optionalSafeUrl('registration_url'),
    livestream_url: optionalSafeUrl('livestream_url'),
    event_image_url: optionalSafeUrl('event_image_url'),
    agenda_url: optionalSafeUrl('agenda_url'),
    pricing_type: z.preprocess(blankToUndefined, z.enum(PRICING_TYPES).optional()),
    price_min: optionalNonNegativeNumber(),
    price_max: optionalNonNegativeNumber(),
    currency: z.preprocess(blankToUndefined, z.string().max(12).transform((value) => value.toUpperCase()).optional()),
    registration_deadline: optionalIsoDateTime(),
    speaker_lineup: z.preprocess(
        (value) => {
            if (!Array.isArray(value)) return undefined;
            return value;
        },
        z.array(
            z.union([
                z.string().transform((name) => ({ name })),
                speakerSchema,
            ])
        ).max(50).optional()
    ),
    tags: z.preprocess(
        (value) => {
            if (!Array.isArray(value)) return [];
            return value.filter((tag) => typeof tag === 'string');
        },
        z.array(z.string().max(64))
            .transform((tags) => Array.from(new Set(tags.map((tag) => stripHtmlToPlainText(tag).trim()).filter(Boolean))).slice(0, 20))
    ),
    series_details: z.preprocess(
        (value) => (value === null ? undefined : value),
        seriesSchema.optional()
    ),
}).strip().superRefine((value, ctx) => {
    if (!value.start_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['start_date'],
            message: 'Start date is required',
        });
    }

    if (value.event_format !== 'Online' && !value.location) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['location'],
            message: 'Location is required for in-person or hybrid events',
        });
    }

    if (
        typeof value.price_min === 'number' &&
        typeof value.price_max === 'number' &&
        value.price_min > value.price_max
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['price_max'],
            message: 'Maximum price must be greater than or equal to minimum price',
        });
    }
});

export type NormalizedOrganizerSubmission = Omit<z.infer<typeof organizerSubmissionSchema>, 'speaker_lineup'> & {
    start_date: string;
    speaker_lineup?: NormalizedSubmissionSpeaker[];
};

function speakerEntries(value: z.infer<typeof organizerSubmissionSchema>['speaker_lineup']): NormalizedSubmissionSpeaker[] {
    return (value ?? [])
        .map((speaker) => ({
            ...speaker,
            name: stripHtmlToPlainText(String(speaker.name ?? '')).trim(),
        }))
        .filter((speaker): speaker is NormalizedSubmissionSpeaker => speaker.name.length > 0);
}

export function parseOrganizerSubmission(input: unknown): NormalizedOrganizerSubmission {
    const parsed = organizerSubmissionSchema.safeParse(input);
    if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const field = firstIssue?.path?.[0];
        if (field === 'start_date' && firstIssue?.message === 'Must be a valid datetime') {
            throw new Error('Start date must be a valid datetime');
        }
        if (field === 'end_date' && firstIssue?.message === 'Must be a valid datetime') {
            throw new Error('End date must be a valid datetime');
        }
        if (field === 'registration_deadline' && firstIssue?.message === 'Must be a valid datetime') {
            throw new Error('Registration deadline must be a valid datetime');
        }
        throw new Error(firstIssue?.message || 'Invalid submission');
    }

    const normalized = {
        ...parsed.data,
        speaker_lineup: speakerEntries(parsed.data.speaker_lineup),
        organizer_details:
            parsed.data.organizer_details && Object.keys(parsed.data.organizer_details).length > 0
                ? parsed.data.organizer_details
                : undefined,
        series_details:
            parsed.data.series_details && Object.keys(parsed.data.series_details).length > 0
                ? parsed.data.series_details
                : undefined,
        accessibility_features:
            parsed.data.accessibility_features &&
            Object.values(parsed.data.accessibility_features).some(Boolean)
                ? parsed.data.accessibility_features
                : undefined,
    };

    return normalized as NormalizedOrganizerSubmission;
}

export function deriveRegistrationMode(submission: Pick<NormalizedOrganizerSubmission, 'source_url' | 'registration_url'>) {
    return submission.source_url || submission.registration_url ? 'external' as const : 'native' as const;
}

export function buildSubmissionFingerprint(submission: Pick<
    NormalizedOrganizerSubmission,
    'title' | 'start_date' | 'organizer_name' | 'source_url' | 'registration_url' | 'event_format'
>) {
    const source = [
        submission.title.trim().toLowerCase(),
        submission.start_date,
        submission.organizer_name.trim().toLowerCase(),
        submission.source_url ?? '',
        submission.registration_url ?? '',
        submission.event_format,
    ].join('|');

    return createHash('md5').update(source).digest('hex');
}

export function countExternalUrls(submission: NormalizedOrganizerSubmission) {
    return [
        submission.source_url,
        submission.registration_url,
        submission.livestream_url,
        submission.event_image_url,
        submission.agenda_url,
        submission.organizer_details?.website_url,
        submission.organizer_details?.logo_url,
        submission.series_details?.website_url,
        ...(submission.speaker_lineup ?? []).flatMap((speaker) => [
            speaker.photo_url,
            speaker.linkedin_url,
            speaker.twitter_url,
            speaker.website_url,
        ]),
    ].filter(Boolean).length;
}

export function assessSubmissionRisk(input: {
    submission: NormalizedOrganizerSubmission;
    repeatedSubmissionCount: number;
    duplicateEventCount: number;
}) {
    const { submission, repeatedSubmissionCount, duplicateEventCount } = input;
    const flags: RiskFlag[] = [];

    const urlCount = countExternalUrls(submission);
    if (urlCount >= 5) flags.push('many_external_urls');
    if (repeatedSubmissionCount > 0) flags.push('repeat_submission');
    if (duplicateEventCount > 0) flags.push('possible_duplicate_event');
    if ((submission.description?.length ?? 0) > 5000) flags.push('long_description');
    if ((submission.speaker_lineup?.length ?? 0) >= 8) flags.push('large_speaker_list');

    const warnings = flags.map((flag) => {
        switch (flag) {
            case 'many_external_urls':
                return 'Submission contains a high number of external URLs.';
            case 'repeat_submission':
                return 'Similar submission fingerprint has already been seen.';
            case 'possible_duplicate_event':
                return 'Possible duplicate event exists in the public events table.';
            case 'long_description':
                return 'Submission description is unusually long.';
            case 'large_speaker_list':
                return 'Submission includes a large speaker roster.';
        }
    });

    return {
        flags,
        validationSummary: {
            schema_version: SCHEMA_VERSION,
            normalized_at: new Date().toISOString(),
            url_count: urlCount,
            repeated_submission_count: repeatedSubmissionCount,
            duplicate_event_count: duplicateEventCount,
            warnings,
        },
    };
}

export function buildCuratedApprovedPayload(submission: NormalizedOrganizerSubmission) {
    return {
        title: submission.title,
        description: submission.description ?? null,
        start_time: submission.start_date,
        end_time: submission.end_date ?? null,
        location: submission.location ?? null,
        location_city: submission.location_city ?? null,
        location_state: submission.location_state ?? null,
        location_country: submission.location_country ?? null,
        timezone: submission.timezone ?? null,
        event_format: submission.event_format,
        event_pattern: submission.event_pattern ?? null,
        is_multi_day: submission.is_multi_day ?? false,
        language: submission.language ?? null,
        difficulty_level: submission.difficulty_level ?? null,
        capacity: submission.capacity ?? null,
        attendee_count: submission.attendee_count ?? null,
        certificate_offered: submission.certificate_offered ?? false,
        recording_available: submission.recording_available ?? false,
        social_media_hashtag: submission.social_media_hashtag ?? null,
        virtual_platform: submission.virtual_platform ?? null,
        target_audience: submission.target_audience ?? null,
        prerequisites: submission.prerequisites ?? null,
        source_url: submission.source_url ?? null,
        registration_url: submission.registration_url ?? null,
        livestream_url: submission.livestream_url ?? null,
        event_image_url: submission.event_image_url ?? null,
        agenda_url: submission.agenda_url ?? null,
        registration_mode: deriveRegistrationMode(submission),
        pricing_type: submission.pricing_type ?? null,
        price_min: submission.price_min ?? null,
        price_max: submission.price_max ?? null,
        currency: submission.currency ?? null,
        registration_deadline: submission.registration_deadline ?? null,
        accessibility_features:
            submission.accessibility_features &&
            Object.values(submission.accessibility_features).some(Boolean)
                ? submission.accessibility_features
                : null,
        speaker_lineup: submission.speaker_lineup?.length ? submission.speaker_lineup : null,
    };
}

export function buildSubmissionContext(submission: NormalizedOrganizerSubmission) {
    const context = {
        organizer: submission.organizer_details ?? null,
        series: submission.series_details ?? null,
        submitted_tags: submission.tags.length > 0 ? submission.tags : null,
    };

    return context.organizer || context.series || context.submitted_tags ? context : null;
}

export function buildLegacySubmittedPayload(source: Record<string, unknown>): NormalizedOrganizerSubmission {
    const payload = {
        title: source.title,
        description: source.description,
        event_type: source.event_type ?? 'other',
        organizer_name: source.organizer_name,
        organizer_details: source.organizer_details,
        start_date: source.start_date,
        end_date: source.end_date,
        timezone: source.timezone,
        event_format:
            source.event_format ??
            (source.is_virtual === true ? 'Online' : 'In-person'),
        is_virtual: source.is_virtual === true,
        location: source.location,
        location_city: source.location_city,
        location_state: source.location_state,
        location_country: source.location_country,
        virtual_platform: source.virtual_platform,
        event_pattern: source.event_pattern,
        is_multi_day: source.is_multi_day === true,
        language: source.language,
        difficulty_level: source.difficulty_level,
        capacity: source.capacity,
        attendee_count: source.attendee_count,
        certificate_offered: source.certificate_offered === true,
        recording_available: source.recording_available === true,
        social_media_hashtag: source.social_media_hashtag,
        target_audience: source.target_audience,
        prerequisites: source.prerequisites,
        accessibility_features: source.accessibility_features,
        source_url: source.source_url,
        registration_url: source.registration_url,
        livestream_url: source.livestream_url,
        event_image_url: source.event_image_url,
        agenda_url: source.agenda_url,
        pricing_type: source.pricing_type,
        price_min: source.price_min,
        price_max: source.price_max,
        currency: source.currency,
        registration_deadline: source.registration_deadline,
        speaker_lineup: source.speaker_lineup,
        tags: source.tags,
        series_details: source.series_details,
    };

    return parseOrganizerSubmission(payload);
}

type UrlValidationField = {
    label: string;
    value: string;
};

function collectSubmissionUrls(submission: NormalizedOrganizerSubmission): UrlValidationField[] {
    const urls: UrlValidationField[] = [];

    const pushUrl = (label: string, value: string | undefined | null) => {
        if (!value) return;
        urls.push({ label, value });
    };

    pushUrl(urlFieldLabels.source_url, submission.source_url);
    pushUrl(urlFieldLabels.registration_url, submission.registration_url);
    pushUrl(urlFieldLabels.livestream_url, submission.livestream_url);
    pushUrl(urlFieldLabels.event_image_url, submission.event_image_url);
    pushUrl(urlFieldLabels.agenda_url, submission.agenda_url);
    pushUrl(urlFieldLabels.organizer_website_url, submission.organizer_details?.website_url);
    pushUrl(urlFieldLabels.organizer_logo_url, submission.organizer_details?.logo_url);
    pushUrl(urlFieldLabels.series_website_url, submission.series_details?.website_url);

    for (const [index, speaker] of (submission.speaker_lineup ?? []).entries()) {
        const prefix = `Speaker ${index + 1}`;
        pushUrl(`${prefix} photo URL`, speaker.photo_url);
        pushUrl(`${prefix} LinkedIn URL`, speaker.linkedin_url);
        pushUrl(`${prefix} Twitter URL`, speaker.twitter_url);
        pushUrl(`${prefix} website URL`, speaker.website_url);
    }

    return urls;
}

export async function validateOrganizerSubmissionUrls(submission: NormalizedOrganizerSubmission) {
    for (const field of collectSubmissionUrls(submission)) {
        const validation = await validateUrlForServerFetch(field.value, {
            allowUnresolvedHostnames: true,
        });
        if (!validation.valid) {
            throw new Error(`${field.label} must be publicly reachable`);
        }
    }
}
