import { describe, expect, it } from 'vitest';
import { extractCoreFieldsFromHtml } from '../EventHtmlExtractor';

describe('EventHtmlExtractor adapters', () => {
    it('extracts generic embedded app schedule data without a site adapter', () => {
        const html = `
            <html>
                <body>
                    <script id="__NEXT_DATA__" type="application/json">
                        ${JSON.stringify({
                            props: {
                                pageProps: {
                                    conference: {
                                        name: 'GenericConf 2026',
                                        description: 'A two-day conference for platform and AI engineers.',
                                        startDate: '2026-06-10T00:00:00.000Z',
                                        location: {
                                            name: 'Convention Center',
                                        },
                                    },
                                    agenda: {
                                        items: [
                                            {
                                                title: 'Platform keynote',
                                                startDateTime: '2026-06-10T09:00:00.000-07:00',
                                                endDateTime: '2026-06-10T10:00:00.000-07:00',
                                                location: 'Main stage',
                                                speakers: [{ name: 'Jane Doe' }],
                                            },
                                            {
                                                title: 'AI systems panel',
                                                startDateTime: '2026-06-11T11:00:00.000-07:00',
                                                endDateTime: '2026-06-11T12:00:00.000-07:00',
                                                location: 'Room B',
                                                track: 'AI',
                                            },
                                        ],
                                    },
                                    speakers: {
                                        items: [
                                            {
                                                name: 'Jane Doe',
                                                title: 'Staff Engineer',
                                                company: 'Acme',
                                            },
                                        ],
                                    },
                                },
                            },
                        })}
                    </script>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://genericconf.test/schedule');

        expect(extracted.title).toBe('GenericConf 2026');
        expect(extracted.location).toBe('Convention Center');
        expect(extracted.schedule).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    title: 'Platform keynote',
                    startTime: '2026-06-10T09:00:00.000-07:00',
                    speakers: ['Jane Doe'],
                }),
                expect.objectContaining({
                    title: 'AI systems panel',
                    track: 'AI',
                }),
            ])
        );
        expect(extracted.speakers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Jane Doe',
                    title: 'Staff Engineer',
                    company: 'Acme',
                }),
            ])
        );
        expect(extracted.provenance.sources).toEqual(
            expect.arrayContaining(['embedded.__NEXT_DATA__.schedule', 'embedded.__NEXT_DATA__.speakers'])
        );
    });

    it('extracts Stripe Sessions agenda and multi-day metadata from __NEXT_DATA__', () => {
        const html = `
            <html>
                <body>
                    <a href="/talks">Talks</a>
                    <script id="__NEXT_DATA__" type="application/json">
                        ${JSON.stringify({
                            props: {
                                pageProps: {
                                    metadata: {
                                        title: 'Stripe Sessions 2026 | Talks',
                                        description: 'Stripe Sessions is a 2-day, in-person event.',
                                        startDate: '2026-04-29T00:00:00.000Z',
                                        endDate: '2026-04-30T00:00:00.000Z',
                                        locationVenue: 'Moscone West',
                                        locationCity: 'San Francisco',
                                    },
                                    events: {
                                        items: [
                                            {
                                                title: 'Product keynote',
                                                startDateTime: '2026-04-29T09:30:00.000-07:00',
                                                endDateTime: '2026-04-29T10:45:00.000-07:00',
                                                description: 'See new Stripe products designed for revenue growth.',
                                                location: 'Main stage, Moscone Level 3',
                                                tags: {
                                                    items: [{ name: 'Main stage' }],
                                                },
                                                tracks: {
                                                    items: [{ name: 'Main stage' }],
                                                },
                                                speakers: {
                                                    items: [
                                                        {
                                                            name: 'Will Gaybrick',
                                                            title: 'President, Technology and Business',
                                                            companyName: 'Stripe',
                                                            linkedInProfile: 'https://www.linkedin.com/in/william-gaybrick-5730347/',
                                                            fullColorPortrait: {
                                                                url: 'https://images.example/will.png',
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                            {
                                                title: 'Closing reception',
                                                startDateTime: '2026-04-30T17:30:00.000-07:00',
                                                endDateTime: '2026-04-30T19:30:00.000-07:00',
                                                location: 'Expo hall',
                                                tags: {
                                                    items: [{ name: 'Meals and receptions' }],
                                                },
                                                speakers: {
                                                    items: [],
                                                },
                                            },
                                            {
                                                title: 'After hours meetup',
                                                startDateTime: '2026-04-30T21:00:00.000-07:00',
                                                endDateTime: '2026-04-30T22:30:00.000-07:00',
                                                location: 'City View Lounge',
                                                tags: {
                                                    items: [{ name: 'Networking' }],
                                                },
                                                speakers: {
                                                    items: [],
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        })}
                    </script>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://stripesessions.com/talks');

        expect(extracted.title).toBe('Stripe Sessions 2026 | Talks');
        expect(extracted.startTime).toBe('2026-04-29T00:00:00.000Z');
        expect(extracted.endTime).toBe('2026-04-30T00:00:00.000Z');
        expect(extracted.location).toBe('Moscone West, San Francisco');
        expect(extracted.agendaUrl).toBe('https://stripesessions.com/talks');
        expect(extracted.schedule).toEqual([
            expect.objectContaining({
                title: 'Product keynote',
                startTime: '2026-04-29T09:30:00.000-07:00',
                endTime: '2026-04-29T10:45:00.000-07:00',
                location: 'Main stage, Moscone Level 3',
                track: 'Main stage',
                dayNumber: 1,
                speakers: ['Will Gaybrick'],
            }),
            expect.objectContaining({
                title: 'Closing reception',
                dayNumber: 2,
            }),
            expect.objectContaining({
                title: 'After hours meetup',
                startTime: '2026-04-30T21:00:00.000-07:00',
                endTime: '2026-04-30T22:30:00.000-07:00',
                dayNumber: 2,
            }),
        ]);
        expect(extracted.speakers).toEqual([
            expect.objectContaining({
                name: 'Will Gaybrick',
                company: 'Stripe',
                linkedinUrl: 'https://www.linkedin.com/in/william-gaybrick-5730347/',
            }),
        ]);
    });

    it('extracts embedded network state assigned on window objects', () => {
        const html = `
            <html>
                <head>
                    <title>GraphConf 2026 Program</title>
                </head>
                <body>
                    <script>
                        window.__APOLLO_STATE__ = ${JSON.stringify({
                            sessions: [
                                {
                                    title: 'GraphQL and events',
                                    startDateTime: '2026-07-12T13:00:00.000-04:00',
                                    endDateTime: '2026-07-12T14:00:00.000-04:00',
                                    venue: 'Room C',
                                },
                            ],
                            speakers: [
                                {
                                    name: 'Jane Doe',
                                    title: 'Principal Engineer',
                                },
                            ],
                        })};
                    </script>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://graphconf.test/program');

        expect(extracted.title).toBe('GraphConf 2026 Program');
        expect(extracted.schedule).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    title: 'GraphQL and events',
                    startTime: '2026-07-12T13:00:00.000-04:00',
                    location: 'Room C',
                }),
            ])
        );
        expect(extracted.speakers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Jane Doe',
                    title: 'Principal Engineer',
                }),
            ])
        );
        expect(extracted.provenance.sources).toContain('embedded.__APOLLO_STATE__.schedule');
    });

    it('extracts card-based qcon-style schedule items from track pages', () => {
        const html = `
            <html>
                <body>
                    <div class="session-type">
                        <span class="rounded-xl">Session</span>
                        <span class="rounded-xl">architecture</span>
                        <h3>From DVDs to Global Streaming</h3>
                        <p>Monday Mar 16 / 10:35AM GMT</p>
                        <p class="session-description">Short summary from the track page.</p>
                        <a href="/speakers/kasia">Kasia Trapszo</a>
                        <a href="/presentation/mar2026/dvds-global-streaming" class="link-overlay">From DVDs to Global Streaming</a>
                    </div>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(
            html,
            'https://qconlondon.com/track/mar2026/architectures-youve-always-wondered-about'
        );

        expect(extracted.schedule).toEqual([
            expect.objectContaining({
                title: 'From DVDs to Global Streaming',
                startTime: '10:35AM GMT',
                description: 'Short summary from the track page.',
                topics: ['architecture'],
                speakers: ['Kasia Trapszo'],
            }),
        ]);
    });

    it('extracts qcon-style presentation metadata for a single session page', () => {
        const html = `
            <html>
                <body>
                    <h1>From DVDs to Global Streaming</h1>
                    <h3>Abstract</h3>
                    <div>
                        Netflix commerce evolution in depth.
                    </div>
                    <h3>Speaker</h3>
                    <div>
                        <a href="/speakers/kasia">
                            <img src="/images/kasia.jpg" alt="Kasia Trapszo" />
                            <h4>Kasia Trapszo</h4>
                            <p>Principal Engineer @Netflix</p>
                        </a>
                    </div>
                    <div class="sidebar">
                        <h4>Date</h4>
                        <p>Monday Mar 16 / 10:35AM GMT ( 50 minutes )</p>
                        <h4>Location</h4>
                        <p>Fleming (3rd Fl.)</p>
                        <h4>Track</h4>
                        <p><a href="/track/mar2026/architectures-youve-always-wondered-about">Architectures You've Always Wondered About</a></p>
                        <h4>Topics</h4>
                        <a class="rounded-xl" href="/topic/architecture">architecture</a>
                        <span class="rounded-xl">commerce</span>
                        <a class="rounded-xl" href="/topic/system-design">System Design</a>
                    </div>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(
            html,
            'https://qconlondon.com/presentation/mar2026/dvds-global-streaming'
        );

        expect(extracted.schedule).toEqual([
            expect.objectContaining({
                title: 'From DVDs to Global Streaming',
                startTime: '10:35AM GMT',
                description: 'Netflix commerce evolution in depth.',
                location: 'Fleming (3rd Fl.)',
                track: 'Architectures You\'ve Always Wondered About',
                topics: ['architecture', 'commerce', 'System Design'],
                speakers: ['Kasia Trapszo'],
            }),
        ]);
        expect(extracted.speakers).toEqual([
            expect.objectContaining({
                name: 'Kasia Trapszo',
                title: 'Principal Engineer @Netflix',
                photoUrl: 'https://qconlondon.com/images/kasia.jpg',
            }),
        ]);
    });
});
