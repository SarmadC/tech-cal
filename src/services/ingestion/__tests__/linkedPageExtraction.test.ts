import { describe, expect, it } from 'vitest';
import {
    buildLinkedPageDocumentFromHtml,
    buildStructuredExtractedEventData,
    collectLinkedPageDocuments,
    mergeExtractedEventData,
    type LinkedPageDocument,
} from '../linkedPageExtraction';
import type { HtmlCoreExtractionResult } from '../html';

describe('linkedPageExtraction', () => {
    it('follows same-host agenda and session links and merges rich agenda and speaker data', async () => {
        const pages: Record<string, string> = {
            'https://conf.test/event': `
                <html>
                    <body>
                        <a href="/agenda">Agenda</a>
                        <a href="https://external.test/sessions/blocked">Blocked external session</a>
                    </body>
                </html>
            `,
            'https://conf.test/agenda': `
                <html>
                    <body>
                        <a href="/sessions/scaling-systems">Scaling Systems session</a>
                    </body>
                </html>
            `,
            'https://conf.test/sessions/scaling-systems': `
                <html>
                    <head>
                        <title>Scaling Systems</title>
                    </head>
                    <body>
                        <article class="session-card">
                            <h3>Scaling Systems</h3>
                            <time>9:00 AM - 10:00 AM</time>
                            <p>Learn how to scale platform systems.</p>
                            <div class="location">Room A</div>
                            <div class="speaker-card">
                                <h4 class="speaker-name">Jane Doe</h4>
                                <div class="speaker-title">Staff Engineer</div>
                                <div class="speaker-company">Acme</div>
                                <img src="/images/jane.jpg" alt="Jane Doe" />
                                <a href="https://www.linkedin.com/in/jane-doe">LinkedIn</a>
                                <a href="https://x.com/jane">X</a>
                                <a href="https://janedoe.dev">Website</a>
                            </div>
                        </article>
                    </body>
                </html>
            `,
        };

        const documents = await collectLinkedPageDocuments({
            sourceUrl: 'https://conf.test/event',
            html: pages['https://conf.test/event'],
            finalUrl: 'https://conf.test/event',
            loadPage: async (url) => {
                if (!pages[url]) {
                    throw new Error(`Unexpected URL: ${url}`);
                }

                return {
                    html: pages[url],
                    finalUrl: url,
                };
            },
        });

        expect(documents.map((document) => document.url)).toEqual(
            expect.arrayContaining([
                'https://conf.test/event',
                'https://conf.test/agenda',
                'https://conf.test/sessions/scaling-systems',
            ])
        );
        expect(documents.some((document) => document.url.includes('external.test'))).toBe(false);

        const structured = buildStructuredExtractedEventData(documents);

        expect(structured.agenda).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    title: 'Scaling Systems',
                    startTime: '09:00',
                    endTime: '10:00',
                    location: 'Room A',
                    speakers: ['Jane Doe'],
                }),
            ])
        );
        expect(structured.speakers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Jane Doe',
                    linkedinUrl: 'https://www.linkedin.com/in/jane-doe',
                    photoUrl: 'https://conf.test/images/jane.jpg',
                    twitterUrl: 'https://x.com/jane',
                    websiteUrl: 'https://janedoe.dev/',
                }),
            ])
        );
    });

    it('can follow allowlisted vendor-host agenda links', async () => {
        const pages: Record<string, string> = {
            'https://conf.test/event': `
                <html>
                    <body>
                        <a href="https://sched.com/event/123/agenda">Full agenda</a>
                    </body>
                </html>
            `,
            'https://sched.com/event/123/agenda': `
                <html>
                    <body>
                        <article class="session-card">
                            <h3>Vendor-hosted Session</h3>
                            <time>10:00 AM - 10:45 AM</time>
                            <p>Agenda on an allowlisted vendor host.</p>
                        </article>
                    </body>
                </html>
            `,
        };

        const documents = await collectLinkedPageDocuments({
            sourceUrl: 'https://conf.test/event',
            html: pages['https://conf.test/event'],
            finalUrl: 'https://conf.test/event',
            allowedHosts: ['sched.com'],
            loadPage: async (url) => {
                if (!pages[url]) {
                    throw new Error(`Unexpected URL: ${url}`);
                }

                return {
                    html: pages[url],
                    finalUrl: url,
                };
            },
        });

        expect(documents.map((document) => document.url)).toEqual(
            expect.arrayContaining([
                'https://conf.test/event',
                'https://sched.com/event/123/agenda',
            ])
        );
    });

    it('treats talks pages as agenda hubs', async () => {
        const pages: Record<string, string> = {
            'https://conf.test/event': `
                <html>
                    <body>
                        <a href="/talks">Talks</a>
                    </body>
                </html>
            `,
            'https://conf.test/talks': `
                <html>
                    <body>
                        <article class="session-card">
                            <h3>Opening keynote</h3>
                            <time>9:00 AM - 10:00 AM</time>
                        </article>
                    </body>
                </html>
            `,
        };

        const documents = await collectLinkedPageDocuments({
            sourceUrl: 'https://conf.test/event',
            html: pages['https://conf.test/event'],
            finalUrl: 'https://conf.test/event',
            loadPage: async (url) => ({
                html: pages[url],
                finalUrl: url,
            }),
        });

        expect(documents.map((document) => document.url)).toEqual(
            expect.arrayContaining([
                'https://conf.test/event',
                'https://conf.test/talks',
            ])
        );

        const structured = buildStructuredExtractedEventData(documents);
        expect(structured.agenda).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    title: 'Opening keynote',
                }),
            ])
        );
    });

    it('discovers interaction candidates and day signals from agenda controls', () => {
        const document = buildLinkedPageDocumentFromHtml(
            `
                <html>
                    <body>
                        <button>Pre-event</button>
                        <button>Day 1</button>
                        <button>Day 2</button>
                        <button aria-expanded="false">Session details</button>
                        <button>Load more sessions</button>
                    </body>
                </html>
            `,
            'https://conf.test/event',
            'agenda',
            'Agenda page',
            ['conf.test']
        );

        expect(document.interactionSignals).toEqual(
            expect.objectContaining({
                expectedAgendaDays: 3,
                collapsedAgendaCount: 1,
                loadMoreCount: 1,
            })
        );
        expect(document.interactionCandidates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ actionType: 'switch_day', label: 'Pre-event' }),
                expect.objectContaining({ actionType: 'switch_day', label: 'Day 2' }),
                expect.objectContaining({ actionType: 'expand_section', label: 'Session details' }),
                expect.objectContaining({ actionType: 'load_more', label: 'Load more sessions' }),
            ])
        );
    });

    it('prefers the better cleaned description over thin structured copy', () => {
        const merged = mergeExtractedEventData(
            {
                description: 'Conference 2026',
            },
            {
                description:
                    'This community conference brings together engineers and technical leaders for practical talks, workshops, and networking focused on modern platform and product delivery.',
            }
        );

        expect(merged.description).toBe(
            'This community conference brings together engineers and technical leaders for practical talks, workshops, and networking focused on modern platform and product delivery.'
        );
    });

    it('preserves absolute session offsets when building structured agenda data', () => {
        const extraction: HtmlCoreExtractionResult = {
            confidence: {},
            provenance: { sources: [], usedReadability: false, jsonLdCount: 0 },
            schedule: [
                {
                    title: 'Late session',
                    startTime: '2026-04-30T21:00:00.000-07:00',
                    endTime: '2026-04-30T22:30:00.000-07:00',
                    dayNumber: 2,
                    location: 'Room B',
                },
            ],
        };
        const document: LinkedPageDocument = {
            kind: 'agenda',
            label: 'Agenda page',
            url: 'https://conf.test/talks',
            content: '',
            extracted: extraction,
        };

        const structured = buildStructuredExtractedEventData([
            document,
        ]);

        expect(structured.agenda).toEqual([
            expect.objectContaining({
                title: 'Late session',
                startTime: '2026-04-30T21:00:00.000-07:00',
                endTime: '2026-04-30T22:30:00.000-07:00',
                dayNumber: 2,
            }),
        ]);
    });

    it('merges lower-quality time-only agenda duplicates into structured agenda rows', () => {
        const merged = mergeExtractedEventData(
            {
                agenda: [
                    {
                        title: 'Product keynote',
                        startTime: '2026-04-29T09:45:00.000-07:00',
                        endTime: '2026-04-29T10:45:00.000-07:00',
                        dayNumber: 2,
                        location: 'Main stage',
                        speakers: ['Jane Doe'],
                    },
                ],
            },
            {
                agenda: [
                    {
                        title: 'Product keynote',
                        startTime: '9:45am',
                        endTime: '10:45am',
                        location: 'Main stage',
                        description: 'Provider summary',
                    },
                ],
            }
        );

        expect(merged.agenda).toEqual([
            expect.objectContaining({
                title: 'Product keynote',
                startTime: '2026-04-29T09:45:00.000-07:00',
                endTime: '2026-04-29T10:45:00.000-07:00',
                dayNumber: 2,
                location: 'Main stage',
                description: 'Provider summary',
                speakers: ['Jane Doe'],
            }),
        ]);
    });

    it('drops ambiguous time-only duplicates when structured agenda already has repeated sessions', () => {
        const merged = mergeExtractedEventData(
            {
                agenda: [
                    {
                        title: 'Certification exams',
                        startTime: '2026-04-29T07:30:00.000-07:00',
                        endTime: '2026-04-29T16:00:00.000-07:00',
                        dayNumber: 1,
                        location: 'Room 2010',
                    },
                    {
                        title: 'Certification exams',
                        startTime: '2026-04-30T07:30:00.000-07:00',
                        endTime: '2026-04-30T16:00:00.000-07:00',
                        dayNumber: 2,
                        location: 'Room 2010',
                    },
                ],
            },
            {
                agenda: [
                    {
                        title: 'Certification exams',
                        startTime: '7:30am',
                        endTime: '4:00pm',
                        location: 'Room 2010',
                    },
                ],
            }
        );

        expect(merged.agenda).toHaveLength(2);
        expect(merged.agenda).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    startTime: '2026-04-29T07:30:00.000-07:00',
                }),
                expect.objectContaining({
                    startTime: '2026-04-30T07:30:00.000-07:00',
                }),
            ])
        );
    });
});
