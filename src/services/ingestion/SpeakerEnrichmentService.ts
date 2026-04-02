import {
    GoogleGenerativeAI,
    SchemaType,
} from '@google/generative-ai';
import pLimit from 'p-limit';
import type { SupabaseClientType } from '@/types';
import { env } from '@/utils/env';

export interface SpeakerEnrichmentCandidate {
    id: string;
    name: string;
    title: string;
    company: string;
}

export interface EnrichmentMatch {
    speakerId: string;
    linkedinUrl: string | null;
    confidence: number;
    rationale?: string;
}

const RESPONSE_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        linkedinUrl: {
            type: SchemaType.STRING,
            nullable: true,
            description: "The full, secure LinkedIn profile URL (must start with https://www.linkedin.com/in/). Return null if a confident match cannot be found.",
        },
        confidence: {
            type: SchemaType.NUMBER,
            description: "A score from 0.0 to 1.0 indicating how confident you are that this profile belongs to the correct person based on their name, title, and company.",
        },
        rationale: {
            type: SchemaType.STRING,
            description: "A brief 1-sentence explanation of why this URL was chosen or why no URL was found.",
        }
    },
    required: ["confidence"],
};

const SYSTEM_PROMPT = `
You are an expert data researcher. Your task is to find the exact LinkedIn profile URL for a given speaker.
You will be provided with the speaker's name, their job title, and their company.
You must use your Google Search capability to find their LinkedIn profile.

Rules:
1. Return ONLY raw JSON matching exactly the structure below, without markdown formatting or code blocks:
   {"linkedinUrl": "https://www.linkedin.com/in/...", "confidence": 0.9, "rationale": "reason..."}
2. The URL must be a valid LinkedIn profile (e.g., https://www.linkedin.com/in/...). Do NOT return company pages or pulse article URLs.
3. If search results are highly ambiguous, return null for linkedinUrl and a low confidence score.
4. Calculate a strict confidence score (0.0 to 1.0). A score >= 0.8 means you are highly certain this is the correct individual.
`.trim();

export class SpeakerEnrichmentService {
    private readonly modelName = 'gemini-2.5-flash';
    private readonly client: GoogleGenerativeAI;
    private readonly concurrencyLimit = 5;

    constructor() {
        const apiKey = env('GOOGLE_GENERATIVE_AI_API_KEY');
        if (!apiKey) {
            throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for SpeakerEnrichmentService');
        }
        this.client = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Finds the LinkedIn URL for a single speaker using Gemini + Google Search.
     */
    async findLinkedinUrl(speaker: SpeakerEnrichmentCandidate): Promise<EnrichmentMatch> {
        const model = this.client.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                temperature: 0.1, // Keep it deterministic
            },
            tools: [{
                // @ts-expect-error - The types for googleSearch in 0.21.0 might be slightly behind, but the API supports it
                googleSearch: {}
            }],
        });

        const prompt = `
Find the LinkedIn profile for this speaker:
- Name: ${speaker.name}
- Title: ${speaker.title}
- Company: ${speaker.company}
        `.trim();

        try {
            const response = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] }
            });

            const text = response.response.text();
            if (!text) {
                 return { speakerId: speaker.id, linkedinUrl: null, confidence: 0, rationale: "Empty response from model" };
            }

            // Extract JSON from text in case it contains markdown formatting
            const jsonTextMatch = text.match(/\{[\s\S]*\}/);
            const rawJsonText = jsonTextMatch ? jsonTextMatch[0] : text;
            const result = JSON.parse(rawJsonText);
            
            // Validate the URL format if provided
            let finalUrl = result.linkedinUrl;
            if (finalUrl && typeof finalUrl === 'string') {
                if (!finalUrl.startsWith('https://www.linkedin.com/in/')) {
                    finalUrl = null;
                }
            }

            return {
                speakerId: speaker.id,
                linkedinUrl: finalUrl || null,
                confidence: typeof result.confidence === 'number' ? result.confidence : 0,
                rationale: result.rationale,
            };

        } catch (error) {
            console.error(`Failed to enrich speaker ${speaker.name}:`, error);
            return {
                speakerId: speaker.id,
                linkedinUrl: null,
                confidence: 0,
                rationale: `Error during search: ${error instanceof Error ? error.message : 'Unknown'}`,
            };
        }
    }

    /**
     * Batch processes multiple speakers concurrently.
     */
    async enrichSpeakersBatch(speakers: SpeakerEnrichmentCandidate[]): Promise<EnrichmentMatch[]> {
        const limiter = pLimit(this.concurrencyLimit);
        
        const tasks = speakers.map(speaker => 
            limiter(() => this.findLinkedinUrl(speaker))
        );

        return Promise.all(tasks);
    }
}
