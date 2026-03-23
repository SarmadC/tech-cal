import { describe, expect, it } from 'vitest';
import { extractCoreFieldsFromHtml } from '../../EventHtmlExtractor';

describe('GoogleDevelopersAdapter', () => {
    it('extracts events from Google Developers events page HTML structure', () => {
        const html = `
            <html>
                <body>
                    <div class="devsite-landing-row">
                        <div class="devsite-landing-row-item" data-category="event">
                            <h3 class="devsite-landing-row-item-title">Wednesday Build Hour</h3>
                            <div class="devsite-landing-row-item-description">
                                March 4 - April 1 (Wednesdays) | Online
                            </div>
                            <p>Your weekly space to sharpen technical skills, stay close to what's next in cloud.</p>
                        </div>
                        <div class="devsite-landing-row-item" data-category="event">
                            <h3 class="devsite-landing-row-item-title">Future of multimodal and production ready AI</h3>
                            <div class="devsite-landing-row-item-description">
                                March 12-13 (DC Metro Area) | In-person
                            </div>
                            <p>Join our workshop series designed for builders ready to scale.</p>
                        </div>
                        <div class="devsite-landing-row-item" data-category="event">
                            <h3 class="devsite-landing-row-item-title">Cloud Technical Series: AI in Action</h3>
                            <div class="devsite-landing-row-item-description">
                                March 17-18, 2026 | Online
                            </div>
                            <p>Join us for a 2-day event to accelerate your AI mastery!</p>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://developers.google.com/events');

        // Primary event should be extracted
        expect(extracted.title).toBe('Wednesday Build Hour');
        expect(extracted.location).toBe('Online');
        expect(extracted.provenance.sources).toContain('google-developers.primary.title');
        expect(extracted.provenance.sources).toContain('google-developers.primary.location');

        // Only the primary (first) event is extracted — other events are distinct future events,
        // not sub-sessions of a single event, so they are not stored in schedule
        expect(extracted.startTime).toBeDefined();
    });

    it('extracts events from JSON-LD structured data', () => {
        const html = `
            <html>
                <body>
                    <script type="application/ld+json">
                        {
                            "@type": "Event",
                            "name": "Google I/O 2026",
                            "startDate": "2026-05-20T09:00:00-07:00",
                            "endDate": "2026-05-21T17:00:00-07:00",
                            "location": {
                                "@type": "Place",
                                "name": "Mountain View, CA"
                            },
                            "description": "Google's annual developer conference"
                        }
                    </script>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://developers.google.com/events');

        expect(extracted.title).toBe('Google I/O 2026');
        expect(extracted.startTime).toBeDefined();
        expect(extracted.location).toBe('Mountain View, CA');
    });

    it('extracts multiple events from JSON-LD array', () => {
        const html = `
            <html>
                <body>
                    <script type="application/ld+json">
                        [
                            {
                                "@type": "Event",
                                "name": "DevFest Berlin 2026",
                                "startDate": "2026-09-15T09:00:00+02:00",
                                "location": { "name": "Berlin" }
                            },
                            {
                                "@type": "Event",
                                "name": "Cloud Summit London",
                                "startDate": "2026-10-20T10:00:00+01:00",
                                "endDate": "2026-10-21T18:00:00+01:00",
                                "location": { "name": "London" }
                            }
                        ]
                    </script>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://developers.google.com/events');

        // Primary event (first in list) is extracted to the top-level fields
        expect(extracted.title).toBe('DevFest Berlin 2026');
        expect(extracted.startTime).toBeDefined();
        expect(extracted.location).toBe('Berlin');
    });

    it('does not apply to non-events pages', () => {
        const html = `
            <html>
                <body>
                    <h1>Google Developers Documentation</h1>
                    <div class="devsite-landing-row-item">
                        <h3>Getting Started</h3>
                    </div>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://developers.google.com/docs');

        // Should not have Google Developers specific provenance
        expect(extracted.provenance.sources).not.toContain('google-developers.primary.title');
    });

    it('correctly infers virtual format for online events', () => {
        const html = `
            <html>
                <body>
                    <div class="devsite-landing-row-item" data-category="event">
                        <h3>Virtual Workshop</h3>
                        <div class="devsite-landing-row-item-description">
                            March 15 | Online
                        </div>
                    </div>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://developers.google.com/events');

        expect(extracted.location).toBe('Online');
    });

    it('correctly infers in-person format for city locations', () => {
        const html = `
            <html>
                <body>
                    <div class="devsite-landing-row-item" data-category="event">
                        <h3>Summit Event</h3>
                        <div class="devsite-landing-row-item-description">
                            April 20-21 | San Francisco
                        </div>
                    </div>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://developers.google.com/events');

        expect(extracted.location).toBe('San Francisco');
    });

    it('handles single day events', () => {
        const html = `
            <html>
                <body>
                    <div class="devsite-landing-row-item" data-category="event">
                        <h3>Single Day Workshop</h3>
                        <div class="devsite-landing-row-item-description">
                            June 15, 2026 | Online
                        </div>
                    </div>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://developers.google.com/events');

        expect(extracted.title).toBe('Single Day Workshop');
        expect(extracted.startTime).toBeDefined();
    });

    it('handles multi-month recurring events', () => {
        const html = `
            <html>
                <body>
                    <div class="devsite-landing-row-item" data-category="event">
                        <h3>Weekly Series</h3>
                        <div class="devsite-landing-row-item-description">
                            January 10 - March 15 (Fridays) | Online
                        </div>
                    </div>
                </body>
            </html>
        `;

        const extracted = extractCoreFieldsFromHtml(html, 'https://developers.google.com/events');

        expect(extracted.title).toBe('Weekly Series');
        expect(extracted.startTime).toBeDefined();
    });
});
