import { describe, expect, it } from 'vitest';
import {
    buildStructuredExtractedEventData,
    collectLinkedPageDocuments,
} from '../linkedPageExtraction';

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
});
