import {
    GoogleGenerativeAI,
    SchemaType,
    type GenerateContentResult,
} from '@google/generative-ai';
import type {
    CrawlPlanner,
    CrawlPlannerDecision,
    CrawlPlannerRequest,
} from '../AgenticCrawlService';

const DEFAULT_GEMINI_CRAWL_MODEL = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        action: {
            type: SchemaType.STRING,
            nullable: false,
            enum: ['select', 'stop'],
        },
        selectedCandidateIds: {
            type: SchemaType.ARRAY,
            nullable: true,
            items: { type: SchemaType.STRING },
        },
        rationale: {
            type: SchemaType.STRING,
            nullable: true,
        },
        missingSignals: {
            type: SchemaType.ARRAY,
            nullable: true,
            items: { type: SchemaType.STRING },
        },
    },
};

const SYSTEM_PROMPT = `
You are planning which event website pages to fetch next for metadata extraction.
Choose only from the provided candidates.
Prioritize pages that are most likely to improve missing agenda, speakers, registration, pricing, or description coverage.
Prefer structured agenda/session evidence first, then day/tab/accordion interactions that expose hidden schedule content, then speaker pages, then registration/pricing pages.
Return "stop" if the remaining candidates are unlikely to materially improve coverage.
Never invent candidate IDs that are not in the candidate list.
Choose at most 3 candidate IDs.
Return only valid JSON.
`.trim();

interface GeminiCrawlPlannerOptions {
    apiKey: string;
    model?: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeDecision = (value: unknown): CrawlPlannerDecision => {
    if (!isPlainObject(value)) {
        return { action: 'stop', rationale: 'invalid_planner_response' };
    }

    const action = value.action === 'select' ? 'select' : 'stop';
    const selectedCandidateIds = Array.isArray(value.selectedCandidateIds)
        ? value.selectedCandidateIds.filter((item): item is string => typeof item === 'string').slice(0, 3)
        : undefined;
    const rationale = typeof value.rationale === 'string' ? value.rationale.trim() : undefined;
    const missingSignals = Array.isArray(value.missingSignals)
        ? value.missingSignals.filter((item): item is string => typeof item === 'string')
        : undefined;

    return {
        action,
        selectedCandidateIds,
        rationale,
        missingSignals,
    };
};

export class GeminiCrawlPlanner implements CrawlPlanner {
    private readonly model: string;
    private readonly client: GoogleGenerativeAI;

    constructor(options: GeminiCrawlPlannerOptions) {
        if (!options.apiKey) {
            throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for Gemini crawl planner');
        }

        this.model = options.model || DEFAULT_GEMINI_CRAWL_MODEL;
        this.client = new GoogleGenerativeAI(options.apiKey);
    }

    async plan(request: CrawlPlannerRequest): Promise<CrawlPlannerDecision> {
        const modelInstance = this.client.getGenerativeModel({
            model: this.model,
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_SCHEMA,
            },
        });

        const response = await modelInstance.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: this.buildPrompt(request) }],
                },
            ],
        });

        return normalizeDecision(this.parseResponse(response));
    }

    private buildPrompt(request: CrawlPlannerRequest): string {
        const candidateSection = request.candidates
            .map((candidate, index) =>
                `${index + 1}. id=${candidate.id} | mode=${candidate.mode} | kind=${candidate.kind}${candidate.actionType ? ` | action=${candidate.actionType}` : ''} | label=${candidate.label} | url=${candidate.url} | score=${candidate.score}`
            )
            .join('\n');

        return `${SYSTEM_PROMPT}

Source URL: ${request.sourceUrl}
Iteration: ${request.iteration}
Remaining page budget: ${request.remainingPageBudget}
Remaining interaction budget: ${request.remainingInteractionBudget}
Coverage score: ${request.coverage.score}
Escalation reasons: ${request.coverage.reasons.join(', ') || 'none'}

Available candidates:
${candidateSection}

Seen URLs:
${request.seenUrls.join('\n')}
`;
    }

    private parseResponse(response: GenerateContentResult): unknown {
        const text = response.response.text();
        if (!text) {
            return { action: 'stop', rationale: 'empty_planner_response' };
        }

        try {
            return JSON.parse(text);
        } catch {
            return { action: 'stop', rationale: 'invalid_planner_json' };
        }
    }
}
