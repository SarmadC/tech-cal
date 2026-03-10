import {
    GoogleGenerativeAI,
    SchemaType,
    type GenerateContentResult,
} from '@google/generative-ai';
import { 
    ExtractedEventDataSchema, 
    InferredEventDataSchema,
    type ExtractionProviderResult,
    type InferenceRequest,
    type InferenceProviderResult,
} from '@/types/enrichment';
import type { ExtractionProvider, ExtractionProviderDocument, ExtractionProviderRequest } from './ExtractionProvider';

interface GeminiProviderOptions {
    apiKey: string;
    model?: string;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_PROVIDER_TAGS = 25;
const MAX_PROVIDER_SPEAKERS = 50;
const MAX_PROVIDER_AGENDA_ITEMS = 100;
const MAX_SPEAKER_BIO_LENGTH = 500;
const MAX_AGENDA_DESCRIPTION_LENGTH = 500;
const MAX_AGENDA_TRACK_LENGTH = 200;
const MAX_AGENDA_LOCATION_LENGTH = 300;
const MAX_AGENDA_PREREQUISITES_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_LOCATION_LENGTH = 500;
const PAID_PRICING_KEYWORDS = ['paid', 'ticket', 'tickets', 'fixed', 'registration', 'fee', 'cost', 'price'];
const FREE_PRICING_KEYWORDS = ['free', 'complimentary', 'gratis', 'no cost'];
const VARIABLE_PRICING_KEYWORDS = ['varies', 'variable', 'depends', 'tbd', 'range', 'sliding'];
const CURRENCY_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
    { code: 'USD', pattern: /(?:\bUSD\b|US\s*DOLLAR|US\$|\$|DOLLAR)/i },
    { code: 'EUR', pattern: /(?:\bEUR\b|EURO|€)/i },
    { code: 'GBP', pattern: /(?:\bGBP\b|POUND|STERLING|£)/i },
    { code: 'INR', pattern: /(?:\bINR\b|RUPEE|₹)/i },
    { code: 'JPY', pattern: /(?:\bJPY\b|YEN|¥)/i },
];

const RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        tags: {
            type: SchemaType.ARRAY,
            nullable: true,
            items: { type: SchemaType.STRING },
        },
        speakers: {
            type: SchemaType.ARRAY,
            nullable: true,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING },
                    title: { type: SchemaType.STRING, nullable: true },
                    company: { type: SchemaType.STRING, nullable: true },
                    bio: { type: SchemaType.STRING, nullable: true },
                    linkedinUrl: { type: SchemaType.STRING, nullable: true },
                    photoUrl: { type: SchemaType.STRING, nullable: true },
                    twitterUrl: { type: SchemaType.STRING, nullable: true },
                    websiteUrl: { type: SchemaType.STRING, nullable: true },
                },
            },
        },
        agenda: {
            type: SchemaType.ARRAY,
            nullable: true,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING },
                    startTime: { type: SchemaType.STRING, nullable: true },
                    endTime: { type: SchemaType.STRING, nullable: true },
                    description: { type: SchemaType.STRING, nullable: true },
                    location: { type: SchemaType.STRING, nullable: true },
                    track: { type: SchemaType.STRING, nullable: true },
                    dayNumber: { type: SchemaType.NUMBER, nullable: true },
                    agendaType: { type: SchemaType.STRING, nullable: true },
                    difficultyLevel: { type: SchemaType.STRING, nullable: true },
                    capacity: { type: SchemaType.NUMBER, nullable: true },
                    prerequisites: { type: SchemaType.STRING, nullable: true },
                    isRequired: { type: SchemaType.BOOLEAN, nullable: true },
                    durationMinutes: { type: SchemaType.NUMBER, nullable: true },
                    speakers: {
                        type: SchemaType.ARRAY,
                        nullable: true,
                        items: { type: SchemaType.STRING },
                    },
                },
            },
        },
        pricing: {
            type: SchemaType.OBJECT,
            nullable: true,
            properties: {
                priceMin: { type: SchemaType.NUMBER, nullable: true },
                priceMax: { type: SchemaType.NUMBER, nullable: true },
                currency: { type: SchemaType.STRING, nullable: true },
                pricingType: { type: SchemaType.STRING, nullable: true },
            },
        },
        description: { type: SchemaType.STRING, nullable: true },
        location: { type: SchemaType.STRING, nullable: true },
        registrationUrl: { type: SchemaType.STRING, nullable: true },
        eventFormat: { type: SchemaType.STRING, nullable: true },
    },
};

const SYSTEM_PROMPT = `
Extract structured event information from the provided webpage content.
Return ONLY valid JSON matching the schema. Do not include explanations or prose.
If a field cannot be determined confidently, omit it rather than guessing.
Focus on speakers (include LinkedIn/Twitter/website URLs when available), agenda/schedule, pricing, registration URL, and event format (Online, In-person, Hybrid).
Extract the richest agenda detail available: track, day number, room/stage, session type, difficulty, prerequisites, required/optional status, duration, and speaker names per session.
If linked agenda, speaker, or session pages are included, prefer those over generic marketing copy.
When choosing tags, only use items from the provided Allowed Tags list. If none apply, return an empty array.
`.trim();

const INFERENCE_SYSTEM_PROMPT = `
You are a tech event metadata specialist. Given an event title and available metadata, generate appropriate content.

Your task:
1. Generate a professional 2-3 sentence description that explains what the event is about
2. Select relevant tags from the allowed tags list that match the event's topic
3. Infer the difficulty level (beginner, intermediate, advanced) if possible
4. Identify key topics covered by the event
5. Suggest target audience (e.g., "Developers", "DevOps Engineers", "Data Scientists")

Guidelines:
- Be accurate and professional in the description
- Only use tags from the provided Allowed Tags list
- If you cannot confidently determine something, omit it
- Focus on technical accuracy over marketing language
- Return ONLY valid JSON matching the schema
`.trim();

const INFERENCE_RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        description: {
            type: SchemaType.STRING,
            nullable: true,
            description: 'Professional 2-3 sentence description of the event',
        },
        tags: {
            type: SchemaType.ARRAY,
            nullable: true,
            items: { type: SchemaType.STRING },
            description: 'Relevant tags from the allowed list',
        },
        difficultyLevel: {
            type: SchemaType.STRING,
            nullable: true,
            enum: ['beginner', 'intermediate', 'advanced'],
            description: 'Inferred difficulty level',
        },
        targetAudience: {
            type: SchemaType.ARRAY,
            nullable: true,
            items: { type: SchemaType.STRING },
            description: 'Target audience roles (e.g., Developers, DevOps Engineers)',
        },
        keyTopics: {
            type: SchemaType.ARRAY,
            nullable: true,
            items: { type: SchemaType.STRING },
            description: 'Key topics covered by the event',
        },
    },
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const truncateText = (value: unknown, maxLength: number): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim();
    if (!normalized) {
        return undefined;
    }

    return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
};

const normalizeAbsoluteUrl = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim();
    if (!normalized) {
        return undefined;
    }

    try {
        const parsed = new URL(normalized);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return undefined;
        }

        return parsed.toString();
    } catch {
        return undefined;
    }
};

interface CollectionNormalizationResult {
    items?: Record<string, unknown>[];
    originalCount: number;
    retainedCount: number;
}

const normalizeDifficultyLevel = (value: unknown): 'beginner' | 'intermediate' | 'advanced' | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }

    if (normalized.startsWith('begin')) return 'beginner';
    if (normalized.startsWith('inter')) return 'intermediate';
    if (normalized.startsWith('adv')) return 'advanced';
    return undefined;
};

const normalizePositiveInteger = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.round(value);
    }

    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^\d.]/g, ''));
        if (Number.isFinite(parsed) && parsed > 0) {
            return Math.round(parsed);
        }
    }

    return undefined;
};

const normalizeBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', 'yes', 'required'].includes(normalized)) return true;
        if (['false', 'no', 'optional'].includes(normalized)) return false;
    }

    return undefined;
};

const normalizeAgendaType = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }

    if (normalized.includes('keynote')) return 'keynote';
    if (normalized.includes('talk')) return 'talk';
    if (normalized.includes('workshop')) return 'workshop';
    if (normalized.includes('panel')) return 'panel';
    if (normalized.includes('network')) return 'networking';
    if (normalized.includes('break')) return 'break';
    if (normalized.includes('registration') || normalized.includes('check-in')) return 'registration';
    if (normalized.includes('meal') || normalized.includes('lunch') || normalized.includes('breakfast') || normalized.includes('dinner')) return 'meal';
    if (normalized.includes('expo') || normalized.includes('exhibit')) return 'exhibition';
    if (normalized.includes('support') || normalized.includes('office hour')) return 'support';
    return normalized;
};

const normalizeSpeakers = (value: unknown): Record<string, unknown>[] | undefined => {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const normalized = value
        .filter(isPlainObject)
        .map((speaker) => {
            const nextSpeaker = { ...speaker };
            const bio = truncateText(nextSpeaker.bio, MAX_SPEAKER_BIO_LENGTH);
            const linkedinUrl = normalizeAbsoluteUrl(nextSpeaker.linkedinUrl);
            const photoUrl = normalizeAbsoluteUrl(nextSpeaker.photoUrl);
            const twitterUrl = normalizeAbsoluteUrl(nextSpeaker.twitterUrl);
            const websiteUrl = normalizeAbsoluteUrl(nextSpeaker.websiteUrl);

            if (bio) {
                nextSpeaker.bio = bio;
            } else {
                delete nextSpeaker.bio;
            }

            if (linkedinUrl) {
                nextSpeaker.linkedinUrl = linkedinUrl;
            } else {
                delete nextSpeaker.linkedinUrl;
            }

            if (photoUrl) {
                nextSpeaker.photoUrl = photoUrl;
            } else {
                delete nextSpeaker.photoUrl;
            }

            if (twitterUrl) {
                nextSpeaker.twitterUrl = twitterUrl;
            } else {
                delete nextSpeaker.twitterUrl;
            }

            if (websiteUrl) {
                nextSpeaker.websiteUrl = websiteUrl;
            } else {
                delete nextSpeaker.websiteUrl;
            }

            return nextSpeaker;
        });

    return normalized.length > 0 ? normalized : undefined;
};

const normalizeAgenda = (value: unknown): Record<string, unknown>[] | undefined => {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const normalized = value
        .filter(isPlainObject)
        .map((agendaItem) => {
            const nextAgendaItem = { ...agendaItem };
            const description = truncateText(nextAgendaItem.description, MAX_AGENDA_DESCRIPTION_LENGTH);
            const location = truncateText(nextAgendaItem.location, MAX_AGENDA_LOCATION_LENGTH);
            const track = truncateText(nextAgendaItem.track, MAX_AGENDA_TRACK_LENGTH);
            const prerequisites = truncateText(nextAgendaItem.prerequisites, MAX_AGENDA_PREREQUISITES_LENGTH);
            const capacity = normalizePositiveInteger(nextAgendaItem.capacity);
            const dayNumber = normalizePositiveInteger(nextAgendaItem.dayNumber);
            const durationMinutes = normalizePositiveInteger(nextAgendaItem.durationMinutes);
            const difficultyLevel = normalizeDifficultyLevel(nextAgendaItem.difficultyLevel);
            const agendaType = normalizeAgendaType(nextAgendaItem.agendaType);
            const isRequired = normalizeBoolean(nextAgendaItem.isRequired);

            if (description) {
                nextAgendaItem.description = description;
            } else {
                delete nextAgendaItem.description;
            }

            if (location) {
                nextAgendaItem.location = location;
            } else {
                delete nextAgendaItem.location;
            }

            if (track) {
                nextAgendaItem.track = track;
            } else {
                delete nextAgendaItem.track;
            }

            if (prerequisites) {
                nextAgendaItem.prerequisites = prerequisites;
            } else {
                delete nextAgendaItem.prerequisites;
            }

            if (capacity) {
                nextAgendaItem.capacity = capacity;
            } else {
                delete nextAgendaItem.capacity;
            }

            if (dayNumber) {
                nextAgendaItem.dayNumber = dayNumber;
            } else {
                delete nextAgendaItem.dayNumber;
            }

            if (durationMinutes) {
                nextAgendaItem.durationMinutes = durationMinutes;
            } else {
                delete nextAgendaItem.durationMinutes;
            }

            if (difficultyLevel) {
                nextAgendaItem.difficultyLevel = difficultyLevel;
            } else {
                delete nextAgendaItem.difficultyLevel;
            }

            if (agendaType) {
                nextAgendaItem.agendaType = agendaType;
            } else {
                delete nextAgendaItem.agendaType;
            }

            if (typeof isRequired === 'boolean') {
                nextAgendaItem.isRequired = isRequired;
            } else {
                delete nextAgendaItem.isRequired;
            }

            if (Array.isArray(nextAgendaItem.speakers)) {
                nextAgendaItem.speakers = Array.from(new Set(
                    nextAgendaItem.speakers
                        .map((speaker) => (typeof speaker === 'string' ? speaker.trim() : ''))
                        .filter(Boolean)
                ));
                if ((nextAgendaItem.speakers as string[]).length === 0) {
                    delete nextAgendaItem.speakers;
                }
            }

            return nextAgendaItem;
        });

    return normalized.length > 0 ? normalized : undefined;
};

const normalizeCollection = (
    value: unknown,
    maxItems: number,
    normalizer: (items: unknown) => Record<string, unknown>[] | undefined,
): CollectionNormalizationResult => {
    if (!Array.isArray(value)) {
        return {
            items: undefined,
            originalCount: 0,
            retainedCount: 0,
        };
    }

    const normalized = normalizer(value);
    const limited = normalized?.slice(0, maxItems);

    return {
        items: limited && limited.length > 0 ? limited : undefined,
        originalCount: value.length,
        retainedCount: limited?.length ?? 0,
    };
};

const normalizeTagList = (value: unknown, allowedTags?: string[]): string[] | undefined => {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const allowlist = new Map<string, string>();
    (allowedTags ?? []).forEach((tag) => {
        const normalized = tag.trim().toLowerCase();
        if (normalized) {
            allowlist.set(normalized, tag);
        }
    });

    const normalized = value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .map((tag) => {
            if (allowlist.size === 0) {
                return tag;
            }
            return allowlist.get(tag.toLowerCase()) ?? null;
        })
        .filter((tag): tag is string => Boolean(tag));

    const deduped = Array.from(new Set(normalized)).slice(0, MAX_PROVIDER_TAGS);
    return deduped.length > 0 ? deduped : undefined;
};

export const normalizePricingType = (value: unknown): 'Free' | 'Paid' | 'Varies' | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }

    if (FREE_PRICING_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
        return 'Free';
    }

    if (VARIABLE_PRICING_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
        return 'Varies';
    }

    if (PAID_PRICING_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
        return 'Paid';
    }

    return undefined;
};

export const normalizePricingCurrency = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toUpperCase();
    if (!normalized) {
        return undefined;
    }

    const explicitCode = normalized.match(/\b[A-Z]{3}\b/);
    if (explicitCode) {
        return explicitCode[0];
    }

    for (const { code, pattern } of CURRENCY_PATTERNS) {
        if (pattern.test(value)) {
            return code;
        }
    }

    return undefined;
};

const normalizeEventFormat = (value: unknown): 'Online' | 'In-person' | 'Hybrid' | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return undefined;
    }

    if (normalized.includes('hybrid')) {
        return 'Hybrid';
    }

    if (
        normalized.includes('online')
        || normalized.includes('virtual')
        || normalized.includes('remote')
    ) {
        return 'Online';
    }

    if (
        normalized.includes('in-person')
        || normalized.includes('in person')
        || normalized.includes('onsite')
        || normalized.includes('on-site')
        || normalized.includes('physical')
    ) {
        return 'In-person';
    }

    return undefined;
};

export const normalizeExtractedProviderPayload = (
    value: unknown,
    allowedTags?: string[],
    onCollectionTruncated?: (details: {
        field: 'speakers' | 'agenda';
        originalCount: number;
        retainedCount: number;
    }) => void,
): unknown => {
    if (!isPlainObject(value)) {
        return value;
    }

    const payload = { ...value };
    const normalizedTags = normalizeTagList(payload.tags, allowedTags);
    const normalizedSpeakers = normalizeCollection(
        payload.speakers,
        MAX_PROVIDER_SPEAKERS,
        normalizeSpeakers
    );
    const normalizedAgenda = normalizeCollection(
        payload.agenda,
        MAX_PROVIDER_AGENDA_ITEMS,
        normalizeAgenda
    );

    if (normalizedTags) {
        payload.tags = normalizedTags;
    } else {
        delete payload.tags;
    }

    if (payload.pricing && typeof payload.pricing === 'object' && !Array.isArray(payload.pricing)) {
        const pricing = { ...(payload.pricing as Record<string, unknown>) };
        const normalizedPricingType = normalizePricingType(pricing.pricingType);
        const normalizedCurrency = normalizePricingCurrency(pricing.currency);

        if (normalizedPricingType) {
            pricing.pricingType = normalizedPricingType;
        } else {
            delete pricing.pricingType;
        }

        if (normalizedCurrency) {
            pricing.currency = normalizedCurrency;
        } else {
            delete pricing.currency;
        }

        payload.pricing = pricing;
    }

    if (normalizedSpeakers.items) {
        payload.speakers = normalizedSpeakers.items;
    } else if ('speakers' in payload) {
        delete payload.speakers;
    }

    if (normalizedAgenda.items) {
        payload.agenda = normalizedAgenda.items;
    } else if ('agenda' in payload) {
        delete payload.agenda;
    }

    if (normalizedSpeakers.originalCount > normalizedSpeakers.retainedCount) {
        onCollectionTruncated?.({
            field: 'speakers',
            originalCount: normalizedSpeakers.originalCount,
            retainedCount: normalizedSpeakers.retainedCount,
        });
    }

    if (normalizedAgenda.originalCount > normalizedAgenda.retainedCount) {
        onCollectionTruncated?.({
            field: 'agenda',
            originalCount: normalizedAgenda.originalCount,
            retainedCount: normalizedAgenda.retainedCount,
        });
    }

    const normalizedDescription = truncateText(payload.description, MAX_DESCRIPTION_LENGTH);
    if (normalizedDescription) {
        payload.description = normalizedDescription;
    } else if ('description' in payload) {
        delete payload.description;
    }

    const normalizedLocation = truncateText(payload.location, MAX_LOCATION_LENGTH);
    if (normalizedLocation) {
        payload.location = normalizedLocation;
    } else if ('location' in payload) {
        delete payload.location;
    }

    const normalizedRegistrationUrl = normalizeAbsoluteUrl(payload.registrationUrl);
    if (normalizedRegistrationUrl) {
        payload.registrationUrl = normalizedRegistrationUrl;
    } else if ('registrationUrl' in payload) {
        delete payload.registrationUrl;
    }

    const normalizedFormat = normalizeEventFormat(payload.eventFormat);
    if (normalizedFormat) {
        payload.eventFormat = normalizedFormat;
    } else if ('eventFormat' in payload) {
        delete payload.eventFormat;
    }

    return payload;
};

export const normalizeInferredProviderPayload = (
    value: unknown,
    allowedTags?: string[],
): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return value;
    }

    const payload = { ...(value as Record<string, unknown>) };
    const normalizedTags = normalizeTagList(payload.tags, allowedTags);

    if (normalizedTags) {
        payload.tags = normalizedTags;
    } else {
        delete payload.tags;
    }

    return payload;
};

export class GeminiExtractionProvider implements ExtractionProvider {
    public readonly name = 'gemini';
    private readonly model: string;
    private readonly client: GoogleGenerativeAI;

    constructor(options: GeminiProviderOptions) {
        if (!options.apiKey) {
            throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for Gemini provider');
        }
        this.model = options.model || DEFAULT_GEMINI_MODEL;
        this.client = new GoogleGenerativeAI(options.apiKey);
    }

    async extract(request: ExtractionProviderRequest): Promise<ExtractionProviderResult> {
        const modelInstance = this.client.getGenerativeModel({
            model: request.model || this.model,
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_SCHEMA,
            },
        });

        const prompt = this.buildPrompt(
            request.content,
            request.context.sourceUrl,
            request.allowedTags,
            request.documents
        );
        const response = await modelInstance.generateContent(
            {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }],
                    },
                ],
            },
            { signal: request.abortSignal }
        );

        const parsed = this.parseResponse(response);
        const sanitized = this.pruneNulls(parsed);
        const normalized = normalizeExtractedProviderPayload(
            sanitized,
            request.allowedTags,
            ({ field, originalCount, retainedCount }) => {
                console.warn('[GeminiExtractionProvider] Truncated extracted collection', {
                    eventId: request.context.eventId ?? 'unknown',
                    field,
                    originalCount,
                    retainedCount,
                });
            }
        );
        const validated = ExtractedEventDataSchema.safeParse(normalized);
        if (!validated.success) {
            const issues = validated.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
            throw new Error(`Gemini response failed validation: ${issues}`);
        }

        const tokensUsed = response.response.usageMetadata?.totalTokenCount;

        return {
            data: validated.data,
            model: request.model || this.model,
            tokensUsed: tokensUsed ?? undefined,
            raw: response.response,
        };
    }

    private buildPrompt(
        content: string,
        sourceUrl: string,
        allowedTags?: string[],
        documents?: ExtractionProviderDocument[],
    ): string {
        const topAllowed = (allowedTags || []).slice(0, 200);
        const allowedSection = topAllowed.length
            ? `Allowed Tags (choose only from this list, case-insensitive): ${topAllowed.join(', ')}`
            : 'No allowed tags provided; return an empty array for tags.';

        const documentSection = (documents ?? [])
            .filter((document) => document.content.trim().length > 0)
            .map((document, index) => `Supporting document ${index + 1}
Label: ${document.label}
URL: ${document.url}
Content:
${document.content}`)
            .join('\n\n');

        return `${SYSTEM_PROMPT}

Source URL: ${sourceUrl}

${allowedSection}

Primary webpage content:
${content}

${documentSection ? `\n\nSupporting linked-page content:\n${documentSection}` : ''}
`;
    }

    private parseResponse(response: GenerateContentResult): unknown {
        const text = response.response.text();
        if (!text) {
            throw new Error('Gemini returned an empty response');
        }

        try {
            return JSON.parse(text);
        } catch {
            throw new Error('Gemini response was not valid JSON');
        }
    }

    // Remove nulls so optional fields validate as undefined rather than null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private pruneNulls(value: any): any {
        if (value === null) return undefined;
        if (Array.isArray(value)) {
            return value
                .map((item) => this.pruneNulls(item))
                .filter((item) => item !== undefined);
        }
        if (typeof value === 'object' && value !== null) {
            const result: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value)) {
                const pruned = this.pruneNulls(v);
                if (pruned !== undefined) {
                    result[k] = pruned;
                }
            }
            return result;
        }
        return value;
    }

    // =============================================
    // INFERENCE MODE (no scraping required)
    // =============================================

    /**
     * Infer event metadata from title and available fields (no web scraping)
     * Used for events that lack source_url or where scraping fails
     */
    async infer(request: InferenceRequest): Promise<InferenceProviderResult> {
        const modelInstance = this.client.getGenerativeModel({
            model: this.model,
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: INFERENCE_RESPONSE_SCHEMA,
            },
        });

        const prompt = this.buildInferencePrompt(request);
        const response = await modelInstance.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }],
                },
            ],
        });

        const parsed = this.parseResponse(response);
        const sanitized = this.pruneNullsAndEmptyArrays(parsed);
        const normalized = normalizeInferredProviderPayload(sanitized, request.allowedTags);
        const validated = InferredEventDataSchema.safeParse(normalized);

        if (!validated.success) {
            const issues = validated.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
            console.warn('Inference validation failed:', JSON.stringify(normalized, null, 2));
            throw new Error(`Gemini inference response failed validation: ${issues}`);
        }

        const tokensUsed = response.response.usageMetadata?.totalTokenCount;

        return {
            data: validated.data,
            model: this.model,
            tokensUsed: tokensUsed ?? undefined,
            raw: response.response,
        };
    }

    /**
     * Remove nulls and empty arrays so optional fields validate correctly
     * More aggressive than pruneNulls - also removes empty arrays
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private pruneNullsAndEmptyArrays(value: any): any {
        if (value === null || value === undefined) return undefined;
        if (Array.isArray(value)) {
            if (value.length === 0) return undefined;
            return value
                .map((item) => this.pruneNullsAndEmptyArrays(item))
                .filter((item) => item !== undefined);
        }
        if (typeof value === 'object' && value !== null) {
            const result: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value)) {
                const pruned = this.pruneNullsAndEmptyArrays(v);
                if (pruned !== undefined) {
                    result[k] = pruned;
                }
            }
            return result;
        }
        return value;
    }

    /**
     * Build prompt for inference mode
     */
    private buildInferencePrompt(request: InferenceRequest): string {
        const topAllowed = request.allowedTags.slice(0, 200);
        const allowedSection = topAllowed.length
            ? `Allowed Tags (choose only from this list, case-insensitive):\n${topAllowed.join(', ')}`
            : 'No allowed tags provided; return an empty array for tags.';

        const contextParts: string[] = [];
        
        contextParts.push(`Event Title: ${request.title}`);
        
        if (request.eventType) {
            contextParts.push(`Event Type: ${request.eventType}`);
        }
        if (request.organizer) {
            contextParts.push(`Organizer: ${request.organizer}`);
        }
        if (request.location) {
            contextParts.push(`Location: ${request.location}`);
        }
        if (request.startTime) {
            contextParts.push(`Start Time: ${request.startTime}`);
        }
        if (request.existingDescription) {
            contextParts.push(`Existing Description (enhance if possible): ${request.existingDescription}`);
        }

        return `${INFERENCE_SYSTEM_PROMPT}

${allowedSection}

Event Information:
${contextParts.join('\n')}

Generate metadata for this event:`;
    }
}
