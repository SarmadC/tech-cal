import { describe, expect, it } from 'vitest';
import {
    AgenticCrawlService,
    assessExtractionCoverage,
    type CoverageAssessment,
    type CrawlPlanner,
} from '../AgenticCrawlService';
import { buildLinkedPageDocumentFromHtml } from '../linkedPageExtraction';

class StubPlanner implements CrawlPlanner {
    public readonly requests: CoverageAssessment[] = [];

    constructor(
        private readonly selectedCandidateIds: string[],
        private readonly action: 'select' | 'stop' = 'select',
    ) {}

    async plan(request: Parameters<CrawlPlanner['plan']>[0]) {
        this.requests.push(request.coverage);
        return {
            action: this.action,
            selectedCandidateIds: this.selectedCandidateIds,
            rationale: 'stub-planner',
        };
    }
}

describe('AgenticCrawlService', () => {
    it('escalates coverage when agenda and speaker links exist but extraction is sparse', () => {
        const primary = buildLinkedPageDocumentFromHtml(
            `
                <html>
                    <body>
                        <a href="/agenda">Agenda</a>
                        <a href="/speakers">Speakers</a>
                    </body>
                </html>
            `,
            'https://conf.test/event',
            'primary',
            'Primary page',
            ['conf.test']
        );

        const assessment = assessExtractionCoverage(
            {
                description: 'Short blurb',
            },
            [primary]
        );

        expect(assessment.shouldEscalate).toBe(true);
        expect(assessment.reasons).toEqual(
            expect.arrayContaining([
                'agenda_links_present_but_agenda_sparse',
                'speaker_links_present_but_speakers_missing',
                'description_thin_or_missing',
            ])
        );
        expect(assessment.reasons).not.toContain('registration_missing');
        expect(assessment.score).toBeLessThan(70);
    });

    it('escalates when multiple agenda days are present but only one day is captured', () => {
        const primary = buildLinkedPageDocumentFromHtml(
            `
                <html>
                    <body>
                        <button>Day 1</button>
                        <button>Day 2</button>
                    </body>
                </html>
            `,
            'https://conf.test/event',
            'primary',
            'Primary page',
            ['conf.test']
        );

        const assessment = assessExtractionCoverage(
            {
                description: 'A detailed event summary for a multi-day conference with multiple tracks and workshops.',
                agenda: [
                    {
                        title: 'Opening keynote',
                        startTime: '2026-04-29T09:00:00.000-07:00',
                        dayNumber: 1,
                    },
                ],
            },
            [primary]
        );

        expect(assessment.reasons).toContain('agenda_days_present_but_incomplete');
    });

    it('does not escalate day incompleteness when structured documents already capture all days', () => {
        const primary = buildLinkedPageDocumentFromHtml(
            `
                <html>
                    <body>
                        <button>Day 1</button>
                        <button>Day 2</button>
                        <article class="session-card">
                            <h3>Day 1 keynote</h3>
                            <time>2026-04-29T09:00:00.000-07:00 - 2026-04-29T10:00:00.000-07:00</time>
                        </article>
                        <article class="session-card">
                            <h3>Day 2 keynote</h3>
                            <time>2026-04-30T09:00:00.000-07:00 - 2026-04-30T10:00:00.000-07:00</time>
                        </article>
                    </body>
                </html>
            `,
            'https://conf.test/event',
            'primary',
            'Primary page',
            ['conf.test']
        );

        const assessment = assessExtractionCoverage(
            {
                description: 'A detailed multi-day conference description.',
                agenda: [
                    {
                        title: 'Day 1 keynote',
                        startTime: '2026-04-29T09:00:00.000-07:00',
                        dayNumber: 1,
                    },
                ],
            },
            [primary]
        );

        expect(assessment.reasons).not.toContain('agenda_days_present_but_incomplete');
    });

    it('only escalates registration when a registration CTA is visible and registrationUrl is missing', () => {
        const primary = buildLinkedPageDocumentFromHtml(
            `
                <html>
                    <body>
                        <a href="/tickets">Get tickets</a>
                    </body>
                </html>
            `,
            'https://conf.test/event',
            'primary',
            'Primary page',
            ['conf.test']
        );

        const assessment = assessExtractionCoverage(
            {
                description: 'A complete event summary that is long enough to avoid thin-description detection and keep the registration signal isolated.',
            },
            [primary]
        );

        expect(assessment.reasons).toContain('registration_missing');
    });

    it('enforces the vendor-host budget during agentic crawl', async () => {
        const pages: Record<string, string> = {
            'https://conf.test/event': `
                <html>
                    <body>
                        <a href="https://sched.com/event/1/agenda">Sched agenda</a>
                        <a href="https://sessionize.com/conf/speakers">Sessionize speakers</a>
                        <a href="https://swapcard.com/conf/program">Swapcard program</a>
                    </body>
                </html>
            `,
            'https://sched.com/event/1/agenda': `
                <html><body><article><h3>Sched Session</h3><time>9:00 AM - 10:00 AM</time></article></body></html>
            `,
            'https://sessionize.com/conf/speakers': `
                <html><body><div class="speaker-card"><h4 class="speaker-name">Jane Doe</h4></div></body></html>
            `,
            'https://swapcard.com/conf/program': `
                <html><body><article><h3>Swapcard Session</h3><time>10:00 AM - 11:00 AM</time></article></body></html>
            `,
        };

        const primary = buildLinkedPageDocumentFromHtml(
            pages['https://conf.test/event'],
            'https://conf.test/event',
            'primary',
            'Primary page',
            ['conf.test', 'sched.com', 'sessionize.com', 'swapcard.com']
        );

        const service = new AgenticCrawlService(
            new StubPlanner([
                'fetch:https://sched.com/event/1/agenda',
                'fetch:https://sessionize.com/conf/speakers',
                'fetch:https://swapcard.com/conf/program',
            ]),
            { maxIterations: 1, maxAdditionalPages: 3, maxVendorHosts: 2 }
        );

        const result = await service.augment({
            sourceUrl: 'https://conf.test/event',
            documents: [primary],
            assessment: {
                score: 10,
                isStrong: false,
                shouldEscalate: true,
                reasons: ['agenda_links_present_but_agenda_sparse'],
                breakdown: {
                    agenda: 0,
                    speakers: 0,
                    description: 0,
                    registration: 0,
                    pricing: 0,
                    metadata: 0,
                },
            },
            allowedHosts: ['conf.test', 'sched.com', 'sessionize.com', 'swapcard.com'],
            loadPage: async (url) => {
                const html = pages[url];
                if (!html) {
                    throw new Error(`Unexpected URL: ${url}`);
                }

                return {
                    html,
                    finalUrl: url,
                };
            },
            observePage: async () => {
                throw new Error('observePage should not be called in fetch-only crawl');
            },
        });

        expect(result.pagesCrawled).toBe(2);
        expect(result.vendorHostsUsed).toEqual(['sched.com', 'sessionize.com']);
        expect(result.additionalDocuments.map((document) => document.url)).toEqual(
            expect.arrayContaining([
                'https://sched.com/event/1/agenda',
                'https://sessionize.com/conf/speakers',
            ])
        );
        expect(result.trace).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    action: 'skip',
                    url: 'https://swapcard.com/conf/program',
                    reason: 'vendor_host_budget_exhausted',
                }),
            ])
        );
    });

    it('reassesses coverage after a successful fetch and stops before another planner iteration', async () => {
        const pages: Record<string, string> = {
            'https://conf.test/event': `
                <html>
                    <body>
                        <a href="/agenda">Agenda</a>
                    </body>
                </html>
            `,
            'https://conf.test/agenda': `
                <html>
                    <body>
                        <article><h3>Recovered session</h3></article>
                    </body>
                </html>
            `,
        };

        const primary = buildLinkedPageDocumentFromHtml(
            pages['https://conf.test/event'],
            'https://conf.test/event',
            'primary',
            'Primary page',
            ['conf.test']
        );
        const planner = new StubPlanner(['fetch:https://conf.test/agenda']);
        const weakCoverage: CoverageAssessment = {
            score: 10,
            isStrong: false,
            shouldEscalate: true,
            reasons: ['agenda_links_present_but_agenda_sparse'],
            breakdown: {
                agenda: 0,
                speakers: 0,
                description: 0,
                registration: 0,
                pricing: 0,
                metadata: 0,
            },
        };

        const result = await new AgenticCrawlService(planner, { maxIterations: 2 }).augment({
            sourceUrl: 'https://conf.test/event',
            documents: [primary],
            assessment: weakCoverage,
            allowedHosts: ['conf.test'],
            assessCoverage: (documents) => (
                documents.length > 1
                    ? {
                        score: 85,
                        isStrong: true,
                        shouldEscalate: false,
                        reasons: [],
                        breakdown: {
                            agenda: 40,
                            speakers: 25,
                            description: 15,
                            registration: 0,
                            pricing: 0,
                            metadata: 5,
                        },
                    }
                    : weakCoverage
            ),
            loadPage: async (url) => ({
                html: pages[url],
                finalUrl: url,
            }),
            observePage: async () => {
                throw new Error('observePage should not be called in fetch-only crawl');
            },
        });

        expect(planner.requests).toHaveLength(1);
        expect(result.trace).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    action: 'fetch',
                    url: 'https://conf.test/agenda',
                    coverageScore: 85,
                    escalationReasons: [],
                }),
                expect.objectContaining({
                    action: 'stop',
                    reason: 'coverage_recovered',
                    coverageScore: 85,
                    escalationReasons: [],
                }),
            ])
        );
    });

    it('does not exhaust page budget when one fetch yields multiple network payload documents', async () => {
        const pages: Record<string, string> = {
            'https://conf.test/event': `
                <html>
                    <body>
                        <a href="/agenda/day-1">Day 1</a>
                        <a href="/agenda/day-2">Day 2</a>
                    </body>
                </html>
            `,
            'https://conf.test/agenda/day-1': `
                <html><body><article><h3>Day 1 keynote</h3></article></body></html>
            `,
            'https://conf.test/agenda/day-2': `
                <html><body><article><h3>Day 2 keynote</h3></article></body></html>
            `,
        };

        const primary = buildLinkedPageDocumentFromHtml(
            pages['https://conf.test/event'],
            'https://conf.test/event',
            'primary',
            'Primary page',
            ['conf.test']
        );

        const result = await new AgenticCrawlService(
            new StubPlanner([
                'fetch:https://conf.test/agenda/day-1',
                'fetch:https://conf.test/agenda/day-2',
            ]),
            { maxIterations: 1, maxAdditionalPages: 2 }
        ).augment({
            sourceUrl: 'https://conf.test/event',
            documents: [primary],
            assessment: {
                score: 20,
                isStrong: false,
                shouldEscalate: true,
                reasons: ['agenda_links_present_but_agenda_sparse'],
                breakdown: {
                    agenda: 0,
                    speakers: 0,
                    description: 15,
                    registration: 0,
                    pricing: 0,
                    metadata: 5,
                },
            },
            allowedHosts: ['conf.test'],
            loadPage: async (url) => ({
                html: pages[url],
                finalUrl: url,
                capturedPayloads: [
                    {
                        url: `${url}.json`,
                        contentType: 'application/json',
                        bodyText: JSON.stringify({
                            items: [
                                {
                                    title: url.endsWith('day-1') ? 'Day 1 keynote' : 'Day 2 keynote',
                                    startDateTime: url.endsWith('day-1')
                                        ? '2026-04-29T09:00:00.000-07:00'
                                        : '2026-04-30T09:00:00.000-07:00',
                                },
                            ],
                        }),
                    },
                    {
                        url: `${url}.speakers.json`,
                        contentType: 'application/json',
                        bodyText: JSON.stringify({
                            speakers: [
                                {
                                    name: url.endsWith('day-1') ? 'Jane Doe' : 'John Roe',
                                },
                            ],
                        }),
                    },
                ],
            }),
            observePage: async () => {
                throw new Error('observePage should not be called in fetch-only crawl');
            },
        });

        expect(result.pagesCrawled).toBe(2);
        expect(result.additionalDocuments.length).toBeGreaterThan(2);
        expect(result.additionalDocuments.map((document) => document.url)).toEqual(
            expect.arrayContaining([
                'https://conf.test/agenda/day-1',
                'https://conf.test/agenda/day-2',
                'https://conf.test/agenda/day-1.json',
                'https://conf.test/agenda/day-2.json',
            ])
        );
    });

    it('can execute an interaction candidate and capture network schedule evidence', async () => {
        const primary = buildLinkedPageDocumentFromHtml(
            `
                <html>
                    <body>
                        <button aria-controls="day-1">Day 1</button>
                        <button aria-controls="day-2">Day 2</button>
                    </body>
                </html>
            `,
            'https://conf.test/event',
            'primary',
            'Primary page',
            ['conf.test']
        );

        const dayTwoAction = primary.interactionCandidates?.find((candidate) => candidate.label === 'Day 2');
        expect(dayTwoAction).toBeDefined();

        const weakCoverage: CoverageAssessment = {
            score: 20,
            isStrong: false,
            shouldEscalate: true,
            reasons: ['agenda_days_present_but_incomplete'],
            breakdown: {
                agenda: 18,
                speakers: 0,
                description: 0,
                registration: 0,
                pricing: 0,
                metadata: 2,
            },
        };

        const result = await new AgenticCrawlService(
            new StubPlanner([dayTwoAction!.id]),
            { maxIterations: 1, maxInteractions: 1, maxAdditionalPages: 4 }
        ).augment({
            sourceUrl: 'https://conf.test/event',
            documents: [primary],
            assessment: weakCoverage,
            allowedHosts: ['conf.test'],
            loadPage: async () => {
                throw new Error('loadPage should not be called for interaction candidate');
            },
            observePage: async (candidate) => ({
                html: `
                    <html>
                        <body>
                            <button aria-controls="day-1">Day 1</button>
                            <button aria-controls="day-2">Day 2</button>
                            <article class="session-card">
                                <h3>Day 2 keynote</h3>
                                <time>2026-04-30T09:00:00.000-07:00 - 2026-04-30T10:00:00.000-07:00</time>
                            </article>
                        </body>
                    </html>
                `,
                finalUrl: 'https://conf.test/event',
                evidenceSource: 'interaction',
                originActionLabel: candidate.label,
                capturedPayloads: [
                    {
                        url: 'https://conf.test/api/schedule/day-2',
                        contentType: 'application/json',
                        bodyText: JSON.stringify({
                            items: [
                                {
                                    title: 'Day 2 keynote',
                                    startDateTime: '2026-04-30T09:00:00.000-07:00',
                                    endDateTime: '2026-04-30T10:00:00.000-07:00',
                                    speakers: [{ name: 'Jane Doe' }],
                                },
                            ],
                        }),
                    },
                ],
            }),
            assessCoverage: (documents) => (
                documents.some((document) => document.evidenceSource === 'network_json')
                    ? {
                        score: 85,
                        isStrong: true,
                        shouldEscalate: false,
                        reasons: [],
                        breakdown: {
                            agenda: 40,
                            speakers: 25,
                            description: 10,
                            registration: 0,
                            pricing: 0,
                            metadata: 10,
                        },
                    }
                    : weakCoverage
            ),
        });

        expect(result.trace).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    action: 'interact',
                    label: 'Day 2',
                    evidenceSources: expect.arrayContaining(['interaction', 'network_json']),
                }),
            ])
        );
        expect(result.additionalDocuments.some((document) => document.evidenceSource === 'network_json')).toBe(true);
    });
});
