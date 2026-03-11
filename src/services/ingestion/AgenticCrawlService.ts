import { createHash } from 'crypto';
import type {
    AgenticCrawlTraceEntry,
    ExtractedEventData,
} from '@/types/enrichment';
import { isDescriptionThin } from '@/utils/ingestion/DescriptionHeuristics';
import {
    buildLinkedPageDocumentFromHtml,
    buildLinkedPageDocumentFromJsonPayload,
    type CandidateLink,
    type LinkedPageDocument,
    type PageInteractionCandidate,
    type PageLoadResult,
} from './linkedPageExtraction';

const COVERAGE_THRESHOLD = 70;
const MAX_CANDIDATES_PER_PLANNER_STEP = 20;
const DEFAULT_MAX_ITERATIONS = 3;
const DEFAULT_MAX_ADDITIONAL_PAGES = 6;
const DEFAULT_MAX_INTERACTIONS = 6;
const DEFAULT_MAX_SELECTED_URLS = 3;
const DEFAULT_MAX_VENDOR_HOSTS = 2;

export type AgenticCrawlMode = 'off' | 'shadow' | 'assist';

export interface CoverageAssessment {
    score: number;
    isStrong: boolean;
    shouldEscalate: boolean;
    reasons: string[];
    breakdown: {
        agenda: number;
        speakers: number;
        description: number;
        registration: number;
        pricing: number;
        metadata: number;
    };
}

export interface CrawlPlannerRequest {
    sourceUrl: string;
    iteration: number;
    remainingPageBudget: number;
    remainingInteractionBudget: number;
    coverage: CoverageAssessment;
    seenUrls: string[];
    candidates: CrawlCandidate[];
    trace: AgenticCrawlTraceEntry[];
}

export interface CrawlCandidate {
    id: string;
    mode: 'fetch' | 'interact';
    url: string;
    host: string;
    kind: CandidateLink['kind'];
    label: string;
    score: number;
    actionType?: PageInteractionCandidate['actionType'];
    pageUrl?: string;
    interactionCandidate?: PageInteractionCandidate;
}

export interface CrawlPlannerDecision {
    action: 'select' | 'stop';
    selectedCandidateIds?: string[];
    rationale?: string;
    missingSignals?: string[];
}

export interface CrawlPlanner {
    plan(request: CrawlPlannerRequest): Promise<CrawlPlannerDecision>;
}

export interface AgenticCrawlRunRequest {
    sourceUrl: string;
    documents: LinkedPageDocument[];
    assessment: CoverageAssessment;
    allowedHosts?: string[];
    loadPage: (url: string) => Promise<PageLoadResult>;
    observePage: (candidate: PageInteractionCandidate) => Promise<PageLoadResult>;
    assessCoverage?: (documents: LinkedPageDocument[]) => CoverageAssessment;
}

export interface AgenticCrawlRunResult {
    documents: LinkedPageDocument[];
    additionalDocuments: LinkedPageDocument[];
    pagesCrawled: number;
    vendorHostsUsed: string[];
    trace: AgenticCrawlTraceEntry[];
}

const scoreAgendaCoverage = (count: number): number => {
    if (count >= 8) return 40;
    if (count >= 3) return 32;
    if (count >= 1) return 18;
    return 0;
};

const scoreSpeakerCoverage = (count: number): number => {
    if (count >= 8) return 25;
    if (count >= 3) return 18;
    if (count >= 1) return 10;
    return 0;
};

const scoreDescriptionCoverage = (description?: string): number => {
    if (!description || isDescriptionThin(description)) {
        return 0;
    }

    if (description.trim().length >= 160) {
        return 15;
    }

    return 10;
};

const scoreRegistrationCoverage = (registrationUrl?: string): number =>
    registrationUrl ? 10 : 0;

const scorePricingCoverage = (pricing?: ExtractedEventData['pricing']): number =>
    pricing && (
        pricing.pricingType
        || pricing.priceMin !== undefined
        || pricing.priceMax !== undefined
        || pricing.currency
    )
        ? 5
        : 0;

const scoreMetadataCoverage = (
    location?: string,
    eventFormat?: ExtractedEventData['eventFormat'],
): number => (location || eventFormat ? 5 : 0);

const countCandidateKinds = (
    documents: LinkedPageDocument[],
): { agendaLinks: number; speakerLinks: number } => {
    let agendaLinks = 0;
    let speakerLinks = 0;

    documents.forEach((document) => {
        (document.candidateLinks ?? []).forEach((candidate) => {
            if (candidate.kind === 'agenda' || candidate.kind === 'session') {
                agendaLinks += 1;
            }
            if (candidate.kind === 'speakers') {
                speakerLinks += 1;
            }
        });
    });

    return { agendaLinks, speakerLinks };
};

const hasRegistrationCtaSignal = (documents: LinkedPageDocument[]): boolean =>
    documents.some((document) => (document.registrationCtaUrls?.length ?? 0) > 0);

const expectedAgendaDaysFromDocuments = (documents: LinkedPageDocument[]): number =>
    documents.reduce((maxDays, document) => Math.max(maxDays, document.interactionSignals?.expectedAgendaDays ?? 0), 0);

const capturedAgendaDaysFromData = (data: Partial<ExtractedEventData>): number => {
    const explicitDayNumbers = new Set(
        (data.agenda ?? [])
            .map((item) => item.dayNumber)
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    );
    if (explicitDayNumbers.size > 0) {
        return explicitDayNumbers.size;
    }

    const dateKeys = new Set(
        (data.agenda ?? [])
            .map((item) => item.startTime?.slice(0, 10))
            .filter((value): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value)))
    );

    return dateKeys.size;
};

const capturedAgendaDaysFromDocuments = (documents: LinkedPageDocument[]): number => {
    const dateKeys = new Set<string>();
    const dayNumbers = new Set<number>();

    documents.forEach((document) => {
        (document.extracted.schedule ?? []).forEach((item) => {
            if (typeof item.dayNumber === 'number' && Number.isFinite(item.dayNumber)) {
                dayNumbers.add(item.dayNumber);
            }

            const dateKey = item.startTime?.slice(0, 10) || item.date?.slice(0, 10);
            if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
                dateKeys.add(dateKey);
            }
        });
    });

    return Math.max(dayNumbers.size, dateKeys.size);
};

const hasCollapsedAgendaSignal = (documents: LinkedPageDocument[]): boolean =>
    documents.some((document) => (document.interactionSignals?.collapsedAgendaCount ?? 0) > 0);

const hasLoadMoreAgendaSignal = (documents: LinkedPageDocument[]): boolean =>
    documents.some((document) => (document.interactionSignals?.loadMoreCount ?? 0) > 0);

export const assessExtractionCoverage = (
    data: Partial<ExtractedEventData>,
    documents: LinkedPageDocument[],
): CoverageAssessment => {
    const agendaScore = scoreAgendaCoverage(data.agenda?.length ?? 0);
    const speakerScore = scoreSpeakerCoverage(data.speakers?.length ?? 0);
    const descriptionScore = scoreDescriptionCoverage(data.description);
    const registrationScore = scoreRegistrationCoverage(data.registrationUrl);
    const pricingScore = scorePricingCoverage(data.pricing);
    const metadataScore = scoreMetadataCoverage(data.location, data.eventFormat);

    const score =
        agendaScore
        + speakerScore
        + descriptionScore
        + registrationScore
        + pricingScore
        + metadataScore;

    const reasons: string[] = [];
    const { agendaLinks, speakerLinks } = countCandidateKinds(documents);
    const registrationCtaPresent = hasRegistrationCtaSignal(documents);
    const expectedAgendaDays = expectedAgendaDaysFromDocuments(documents);
    const capturedAgendaDays = Math.max(
        capturedAgendaDaysFromData(data),
        capturedAgendaDaysFromDocuments(documents)
    );

    if (agendaLinks > 0 && (data.agenda?.length ?? 0) < 3) {
        reasons.push('agenda_links_present_but_agenda_sparse');
    }
    if (expectedAgendaDays >= 2 && capturedAgendaDays > 0 && capturedAgendaDays < expectedAgendaDays) {
        reasons.push('agenda_days_present_but_incomplete');
    }
    if (hasCollapsedAgendaSignal(documents) && (data.agenda?.length ?? 0) < 8) {
        reasons.push('agenda_sections_collapsed');
    }
    if (hasLoadMoreAgendaSignal(documents) && (data.agenda?.length ?? 0) < 12) {
        reasons.push('agenda_load_more_available');
    }
    if (speakerLinks > 0 && (data.speakers?.length ?? 0) === 0) {
        reasons.push('speaker_links_present_but_speakers_missing');
    }
    if (!data.description || isDescriptionThin(data.description)) {
        reasons.push('description_thin_or_missing');
    }
    if (registrationCtaPresent && !data.registrationUrl) {
        reasons.push('registration_missing');
    }

    return {
        score,
        isStrong: score >= COVERAGE_THRESHOLD && reasons.length === 0,
        shouldEscalate: score < COVERAGE_THRESHOLD || reasons.length > 0,
        reasons,
        breakdown: {
            agenda: agendaScore,
            speakers: speakerScore,
            description: descriptionScore,
            registration: registrationScore,
            pricing: pricingScore,
            metadata: metadataScore,
        },
    };
};

const isSameOriginHost = (hostname: string, sourceHost: string): boolean =>
    hostname === sourceHost || hostname.endsWith(`.${sourceHost}`);

export class AgenticCrawlService {
    constructor(
        private readonly planner: CrawlPlanner,
        private readonly options: {
            maxIterations?: number;
            maxAdditionalPages?: number;
            maxInteractions?: number;
            maxSelectedUrlsPerIteration?: number;
            maxVendorHosts?: number;
        } = {},
    ) {}

    async augment(request: AgenticCrawlRunRequest): Promise<AgenticCrawlRunResult> {
        const sourceHost = new URL(request.sourceUrl).hostname.toLowerCase();
        const maxIterations = this.options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
        const maxAdditionalPages = this.options.maxAdditionalPages ?? DEFAULT_MAX_ADDITIONAL_PAGES;
        const maxInteractions = this.options.maxInteractions ?? DEFAULT_MAX_INTERACTIONS;
        const maxSelectedUrls =
            this.options.maxSelectedUrlsPerIteration ?? DEFAULT_MAX_SELECTED_URLS;
        const maxVendorHosts = this.options.maxVendorHosts ?? DEFAULT_MAX_VENDOR_HOSTS;

        let currentAssessment = request.assessment;
        const documents = [...request.documents];
        const additionalDocuments: LinkedPageDocument[] = [];
        let additionalFetchCount = 0;
        let crawledPageCount = 0;
        let interactionCount = 0;
        const trace: AgenticCrawlTraceEntry[] = [
            {
                iteration: 0,
                action: 'start',
                reason: currentAssessment.reasons.join(', ') || 'coverage_threshold',
                coverageScore: currentAssessment.score,
                escalationReasons: currentAssessment.reasons,
                capturedAgendaDays: capturedAgendaDaysFromDocuments(documents),
                expectedAgendaDays: expectedAgendaDaysFromDocuments(documents),
            },
        ];

        const seenUrls = new Set(documents.map((document) => document.url));
        const seenInteractionIds = new Set<string>();
        const seenContentHashes = new Set(
            documents.map((document) => createHash('sha256').update(document.content).digest('hex'))
        );
        const vendorHostsUsed = new Set<string>();

        for (const document of documents) {
            const hostname = new URL(document.url).hostname.toLowerCase();
            if (!isSameOriginHost(hostname, sourceHost)) {
                vendorHostsUsed.add(hostname);
            }
        }

        for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
            if (!currentAssessment.shouldEscalate) {
                trace.push({
                    iteration,
                    action: 'stop',
                    reason: 'coverage_recovered',
                    coverageScore: currentAssessment.score,
                    escalationReasons: currentAssessment.reasons,
                });
                break;
            }

            if (additionalFetchCount >= maxAdditionalPages) {
                trace.push({
                    iteration,
                    action: 'stop',
                    reason: 'page_budget_exhausted',
                    coverageScore: currentAssessment.score,
                    escalationReasons: currentAssessment.reasons,
                });
                break;
            }

            if (interactionCount >= maxInteractions && additionalFetchCount >= maxAdditionalPages) {
                trace.push({
                    iteration,
                    action: 'stop',
                    reason: 'crawl_budgets_exhausted',
                    coverageScore: currentAssessment.score,
                    escalationReasons: currentAssessment.reasons,
                    capturedAgendaDays: capturedAgendaDaysFromDocuments(documents),
                    expectedAgendaDays: expectedAgendaDaysFromDocuments(documents),
                });
                break;
            }

            const remainingPageBudget = maxAdditionalPages - additionalFetchCount;
            const remainingInteractionBudget = maxInteractions - interactionCount;
            const candidates = this.collectCandidates(
                documents,
                seenUrls,
                seenInteractionIds,
                sourceHost,
                vendorHostsUsed,
                maxVendorHosts
            )
                .slice(0, MAX_CANDIDATES_PER_PLANNER_STEP);

            if (candidates.length === 0) {
                trace.push({
                    iteration,
                    action: 'stop',
                    reason: 'no_candidates',
                    coverageScore: currentAssessment.score,
                    escalationReasons: currentAssessment.reasons,
                    capturedAgendaDays: capturedAgendaDaysFromDocuments(documents),
                    expectedAgendaDays: expectedAgendaDaysFromDocuments(documents),
                });
                break;
            }

            const decision = await this.planner.plan({
                sourceUrl: request.sourceUrl,
                iteration,
                remainingPageBudget,
                remainingInteractionBudget,
                coverage: currentAssessment,
                seenUrls: Array.from(seenUrls),
                candidates,
                trace,
            });

            if (decision.action === 'stop') {
                trace.push({
                    iteration,
                    action: 'stop',
                    reason: decision.rationale || 'planner_stop',
                    coverageScore: currentAssessment.score,
                    escalationReasons: currentAssessment.reasons,
                    capturedAgendaDays: capturedAgendaDaysFromDocuments(documents),
                    expectedAgendaDays: expectedAgendaDaysFromDocuments(documents),
                });
                break;
            }

            const selectedCandidates = candidates
                .filter((candidate) => (decision.selectedCandidateIds ?? []).includes(candidate.id))
                .filter((candidate) => (
                    candidate.mode === 'fetch'
                        ? remainingPageBudget > 0
                        : remainingInteractionBudget > 0
                ))
                .slice(0, maxSelectedUrls);

            if (selectedCandidates.length === 0) {
                trace.push({
                    iteration,
                    action: 'stop',
                    reason: 'planner_selected_no_valid_urls',
                    coverageScore: currentAssessment.score,
                    escalationReasons: currentAssessment.reasons,
                    capturedAgendaDays: capturedAgendaDaysFromDocuments(documents),
                    expectedAgendaDays: expectedAgendaDaysFromDocuments(documents),
                });
                break;
            }

            let coverageRecovered = false;
            for (const candidate of selectedCandidates) {
                if (candidate.mode === 'fetch' && additionalFetchCount >= maxAdditionalPages) {
                    break;
                }
                if (candidate.mode === 'interact' && interactionCount >= maxInteractions) {
                    break;
                }

                const candidateHost = new URL(candidate.url).hostname.toLowerCase();
                const isVendorHost = !isSameOriginHost(candidateHost, sourceHost);

                if (isVendorHost && !vendorHostsUsed.has(candidateHost) && vendorHostsUsed.size >= maxVendorHosts) {
                    trace.push({
                        iteration,
                        action: 'skip',
                        candidateId: candidate.id,
                        url: candidate.url,
                        label: candidate.label,
                        actionType: candidate.actionType,
                        kind: candidate.kind,
                        reason: 'vendor_host_budget_exhausted',
                        coverageScore: currentAssessment.score,
                        escalationReasons: currentAssessment.reasons,
                    });
                    continue;
                }

                try {
                    const page = candidate.mode === 'fetch'
                        ? await request.loadPage(candidate.url)
                        : await request.observePage(this.toInteractionCandidate(candidate));
                    crawledPageCount += 1;
                    if (candidate.mode === 'fetch') {
                        additionalFetchCount += 1;
                    }
                    const finalUrl = page.finalUrl ?? candidate.url;
                    if (candidate.mode === 'fetch') {
                        seenUrls.add(candidate.url);
                        seenUrls.add(finalUrl);
                    } else {
                        seenInteractionIds.add(candidate.id);
                        interactionCount += 1;
                    }

                    const finalHost = new URL(finalUrl).hostname.toLowerCase();
                    const finalIsVendorHost = !isSameOriginHost(finalHost, sourceHost);
                    if (finalIsVendorHost && !vendorHostsUsed.has(finalHost) && vendorHostsUsed.size >= maxVendorHosts) {
                        trace.push({
                            iteration,
                            action: 'skip',
                            candidateId: candidate.id,
                            url: finalUrl,
                            label: candidate.label,
                            actionType: candidate.actionType,
                            kind: candidate.kind,
                            reason: 'vendor_host_budget_exhausted',
                            coverageScore: currentAssessment.score,
                            escalationReasons: currentAssessment.reasons,
                        });
                        continue;
                    }

                    const document = buildLinkedPageDocumentFromHtml(
                        page.html,
                        finalUrl,
                        candidate.kind,
                        candidate.label,
                        request.allowedHosts ?? [],
                        {
                            evidenceSource: page.evidenceSource ?? (candidate.mode === 'interact' ? 'interaction' : 'page_html'),
                            originActionLabel: page.originActionLabel ?? (candidate.mode === 'interact' ? candidate.label : undefined),
                        }
                    );
                    const newDocuments = [document];
                    (page.capturedPayloads ?? []).forEach((payload) => {
                        const payloadDocument = buildLinkedPageDocumentFromJsonPayload(
                            payload.bodyText,
                            payload.url,
                            candidate.kind,
                            `${candidate.label} network payload`,
                            {
                                evidenceSource: 'network_json',
                                originActionLabel: candidate.label,
                            }
                        );
                        if (payloadDocument) {
                            newDocuments.push(payloadDocument);
                        }
                    });

                    let addedAnyDocument = false;
                    for (const nextDocument of newDocuments) {
                        const contentHash = createHash('sha256').update(nextDocument.content).digest('hex');
                        if (seenContentHashes.has(contentHash)) {
                            continue;
                        }

                        seenContentHashes.add(contentHash);
                        documents.push(nextDocument);
                        additionalDocuments.push(nextDocument);
                        addedAnyDocument = true;
                    }

                    if (!addedAnyDocument) {
                        trace.push({
                            iteration,
                            action: 'skip',
                            url: finalUrl,
                            candidateId: candidate.id,
                            label: candidate.label,
                            actionType: candidate.actionType,
                            kind: candidate.kind,
                            reason: 'duplicate_content',
                            coverageScore: currentAssessment.score,
                            escalationReasons: currentAssessment.reasons,
                        });
                        continue;
                    }

                    if (finalIsVendorHost) {
                        vendorHostsUsed.add(finalHost);
                    }

                    currentAssessment = request.assessCoverage?.(documents) ?? currentAssessment;
                    trace.push({
                        iteration,
                        action: candidate.mode === 'fetch' ? 'fetch' : 'interact',
                        candidateId: candidate.id,
                        url: finalUrl,
                        label: candidate.label,
                        actionType: candidate.actionType,
                        pageUrl: candidate.pageUrl,
                        kind: candidate.kind,
                        rationale: decision.rationale,
                        coverageScore: currentAssessment.score,
                        escalationReasons: currentAssessment.reasons,
                        evidenceSources: Array.from(new Set(newDocuments.map((item) => item.evidenceSource).filter(Boolean))) as string[],
                        capturedAgendaDays: capturedAgendaDaysFromDocuments(documents),
                        expectedAgendaDays: expectedAgendaDaysFromDocuments(documents),
                    });
                    if (!currentAssessment.shouldEscalate) {
                        coverageRecovered = true;
                        break;
                    }
                } catch (error) {
                    trace.push({
                        iteration,
                        action: 'skip',
                        candidateId: candidate.id,
                        url: candidate.url,
                        label: candidate.label,
                        actionType: candidate.actionType,
                        kind: candidate.kind,
                        reason: error instanceof Error ? error.message : 'load_failed',
                        coverageScore: currentAssessment.score,
                        escalationReasons: currentAssessment.reasons,
                    });
                }
            }

            if (coverageRecovered) {
                trace.push({
                    iteration,
                    action: 'stop',
                    reason: 'coverage_recovered',
                    coverageScore: currentAssessment.score,
                    escalationReasons: currentAssessment.reasons,
                    capturedAgendaDays: capturedAgendaDaysFromDocuments(documents),
                    expectedAgendaDays: expectedAgendaDaysFromDocuments(documents),
                });
                break;
            }
        }

        return {
            documents,
            additionalDocuments,
            pagesCrawled: crawledPageCount,
            vendorHostsUsed: Array.from(vendorHostsUsed).sort(),
            trace,
        };
    }

    private collectCandidates(
        documents: LinkedPageDocument[],
        seenUrls: Set<string>,
        seenInteractionIds: Set<string>,
        sourceHost: string,
        vendorHostsUsed: Set<string>,
        maxVendorHosts: number,
    ): CrawlCandidate[] {
        const byId = new Map<string, CrawlCandidate>();

        documents.forEach((document) => {
            (document.candidateLinks ?? []).forEach((candidate) => {
                if (seenUrls.has(candidate.url)) {
                    return;
                }

                const hostname = candidate.host.toLowerCase();
                const isVendorHost = !isSameOriginHost(hostname, sourceHost);
                if (isVendorHost && !vendorHostsUsed.has(hostname) && vendorHostsUsed.size >= maxVendorHosts) {
                    return;
                }

                const crawlCandidate: CrawlCandidate = {
                    id: `fetch:${candidate.url}`,
                    mode: 'fetch',
                    url: candidate.url,
                    host: candidate.host,
                    kind: candidate.kind,
                    label: candidate.label,
                    score: candidate.score,
                };

                const existing = byId.get(crawlCandidate.id);
                if (!existing || crawlCandidate.score > existing.score) {
                    byId.set(crawlCandidate.id, crawlCandidate);
                }
            });

            (document.interactionCandidates ?? []).forEach((candidate) => {
                if (seenInteractionIds.has(candidate.id)) {
                    return;
                }

                const hostname = new URL(candidate.pageUrl).hostname.toLowerCase();
                const crawlCandidate: CrawlCandidate = {
                    id: candidate.id,
                    mode: 'interact',
                    url: candidate.pageUrl,
                    host: hostname,
                    kind: candidate.kind,
                    label: candidate.label,
                    score: candidate.score,
                    actionType: candidate.actionType,
                    pageUrl: candidate.pageUrl,
                    interactionCandidate: candidate,
                };

                const existing = byId.get(crawlCandidate.id);
                if (!existing || crawlCandidate.score > existing.score) {
                    byId.set(crawlCandidate.id, crawlCandidate);
                }
            });
        });

        return Array.from(byId.values()).sort((left, right) => right.score - left.score);
    }

    private toInteractionCandidate(candidate: CrawlCandidate): PageInteractionCandidate {
        if (candidate.mode !== 'interact') {
            throw new Error(`Cannot convert non-interaction candidate "${candidate.id}"`);
        }

        if (!candidate.interactionCandidate) {
            throw new Error(`Missing interaction candidate payload for "${candidate.id}"`);
        }

        return candidate.interactionCandidate;
    }
}
