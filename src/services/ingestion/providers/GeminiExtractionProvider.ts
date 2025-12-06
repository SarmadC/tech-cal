import {
    GoogleGenerativeAI,
    SchemaType,
    type GenerateContentResult,
} from '@google/generative-ai';
import { ExtractedEventDataSchema, type ExtractionProviderResult } from '@/types/enrichment';
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
}

