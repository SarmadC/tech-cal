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
import type { ExtractionProvider, ExtractionProviderRequest } from './ExtractionProvider';

interface GeminiProviderOptions {
    apiKey: string;
    model?: string;
}

const DEFAULT_MODEL = 'gemini-1.5-flash';

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
Focus on speakers (include LinkedIn URLs when available), agenda/schedule, pricing, registration URL, and event format (Online, In-person, Hybrid).
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

export class GeminiExtractionProvider implements ExtractionProvider {
    public readonly name = 'gemini';
    private readonly model: string;
    private readonly client: GoogleGenerativeAI;

    constructor(options: GeminiProviderOptions) {
        if (!options.apiKey) {
            throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for Gemini provider');
        }
        this.model = options.model || DEFAULT_MODEL;
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
            request.allowedTags
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
        const withAllowedTags = this.restrictTagsToAllowlist(sanitized, request.allowedTags);
        const validated = ExtractedEventDataSchema.safeParse(withAllowedTags);
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

    private buildPrompt(content: string, sourceUrl: string, allowedTags?: string[]): string {
        const topAllowed = (allowedTags || []).slice(0, 200);
        const allowedSection = topAllowed.length
            ? `Allowed Tags (choose only from this list, case-insensitive): ${topAllowed.join(', ')}`
            : 'No allowed tags provided; return an empty array for tags.';

        return `${SYSTEM_PROMPT}

Source URL: ${sourceUrl}

${allowedSection}

Webpage content:
${content}
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

    private restrictTagsToAllowlist(value: unknown, allowedTags?: string[]): unknown {
        if (!allowedTags || allowedTags.length === 0) return value;
        const allowed = new Map<string, string>();
        allowedTags.forEach(tag => {
            const key = tag.trim().toLowerCase();
            if (key) allowed.set(key, tag);
        });

        if (!allowed.size) return value;

        if (value && typeof value === 'object' && 'tags' in (value as Record<string, unknown>)) {
            const obj = { ...(value as Record<string, unknown>) };
            const incoming = Array.isArray(obj.tags) ? obj.tags : [];
            const filtered = incoming
                .map(t => (typeof t === 'string' ? t.trim() : ''))
                .filter(Boolean)
                .map(t => allowed.get(t.toLowerCase()))
                .filter((t): t is string => !!t);
            obj.tags = Array.from(new Set(filtered));
            return obj;
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
        const withAllowedTags = this.restrictTagsToAllowlist(sanitized, request.allowedTags);
        const validated = InferredEventDataSchema.safeParse(withAllowedTags);

        if (!validated.success) {
            const issues = validated.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
            console.warn('Inference validation failed:', JSON.stringify(withAllowedTags, null, 2));
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

