import { buildCitySummaries, buildCountrySummaries, dedupeCitySummariesBySlug } from '../citySummaries';

describe('buildCitySummaries', () => {
    it('groups city summaries, counts events, selects the earliest date, preserves coordinates, and builds preview events', () => {
        const summaries = buildCitySummaries([
            { location_city: 'Toronto', start_time: '2026-06-12T10:00:00.000Z', title: 'Toronto Infra Day', slug: 'toronto-infra-day' },
            { location_city: 'San Francisco', start_time: '2026-05-10T09:00:00.000Z', title: 'SF Systems Summit', slug: 'sf-systems-summit' },
            { location_city: 'Toronto', start_time: '2026-04-01T15:00:00.000Z', title: 'Toronto Builders Week', slug: 'toronto-builders-week', location_latitude: 43.7, location_longitude: -79.4 },
            { location_city: 'Austin', start_time: '2026-07-20T08:00:00.000Z', title: 'Austin Product Lab', slug: 'austin-product-lab', location_latitude: 30.28, location_longitude: -97.74 },
            { location_city: 'San Francisco', start_time: '2026-05-01T09:00:00.000Z', title: 'SF Founder Forum', slug: 'sf-founder-forum' },
            { location_city: 'Austin', start_time: '2026-03-18T08:00:00.000Z', title: 'Austin Cloud Expo', slug: 'austin-cloud-expo' },
            { location_city: 'Austin', start_time: '2026-08-01T08:00:00.000Z', title: 'Austin AI Days', slug: 'austin-ai-days' },
            { location_city: ' ', start_time: '2026-08-01T08:00:00.000Z' },
            { location_city: null, start_time: '2026-08-01T08:00:00.000Z' },
            { location_city: 'Berlin', start_time: null },
        ]);

        expect(summaries).toEqual([
            {
                cityName: 'Austin',
                citySlug: 'austin',
                eventCount: 3,
                nextEventDate: '2026-03-18T08:00:00.000Z',
                latitude: 30.28,
                longitude: -97.74,
                previewEvents: [
                    {
                        title: 'Austin Cloud Expo',
                        slug: 'austin-cloud-expo',
                        startTime: '2026-03-18T08:00:00.000Z',
                    },
                    {
                        title: 'Austin Product Lab',
                        slug: 'austin-product-lab',
                        startTime: '2026-07-20T08:00:00.000Z',
                    },
                    {
                        title: 'Austin AI Days',
                        slug: 'austin-ai-days',
                        startTime: '2026-08-01T08:00:00.000Z',
                    },
                ],
            },
            {
                cityName: 'San Francisco',
                citySlug: 'san-francisco',
                eventCount: 2,
                nextEventDate: '2026-05-01T09:00:00.000Z',
                latitude: 37.7749,
                longitude: -122.4194,
                previewEvents: [
                    {
                        title: 'SF Founder Forum',
                        slug: 'sf-founder-forum',
                        startTime: '2026-05-01T09:00:00.000Z',
                    },
                    {
                        title: 'SF Systems Summit',
                        slug: 'sf-systems-summit',
                        startTime: '2026-05-10T09:00:00.000Z',
                    },
                ],
            },
            {
                cityName: 'Toronto',
                citySlug: 'toronto',
                eventCount: 2,
                nextEventDate: '2026-04-01T15:00:00.000Z',
                latitude: 43.7,
                longitude: -79.4,
                previewEvents: [
                    {
                        title: 'Toronto Builders Week',
                        slug: 'toronto-builders-week',
                        startTime: '2026-04-01T15:00:00.000Z',
                    },
                    {
                        title: 'Toronto Infra Day',
                        slug: 'toronto-infra-day',
                        startTime: '2026-06-12T10:00:00.000Z',
                    },
                ],
            },
        ]);
    });

    it('merges city-name variants that normalize to the same slug', () => {
        const summaries = buildCitySummaries([
            { location_city: 'Washington, D.C.', start_time: '2026-03-30T09:00:00.000Z', title: 'District AI Summit', slug: 'district-ai-summit' },
            { location_city: 'Washington DC', start_time: '2026-03-22T09:00:00.000Z', title: 'Capital Infra Forum', slug: 'capital-infra-forum', location_latitude: 38.9072, location_longitude: -77.0369 },
        ]);

        expect(summaries).toEqual([
            {
                cityName: 'Washington DC',
                citySlug: 'washington-dc',
                eventCount: 2,
                nextEventDate: '2026-03-22T09:00:00.000Z',
                latitude: 38.9072,
                longitude: -77.0369,
                previewEvents: [
                    {
                        title: 'Capital Infra Forum',
                        slug: 'capital-infra-forum',
                        startTime: '2026-03-22T09:00:00.000Z',
                    },
                    {
                        title: 'District AI Summit',
                        slug: 'district-ai-summit',
                        startTime: '2026-03-30T09:00:00.000Z',
                    },
                ],
            },
        ]);
    });

    it('dedupes repeated city summaries by slug defensively', () => {
        const summaries = dedupeCitySummariesBySlug([
            {
                cityName: 'Washington, D.C.',
                citySlug: 'washington-dc',
                eventCount: 8,
                nextEventDate: '2026-03-30T09:00:00.000Z',
                latitude: null,
                longitude: null,
                previewEvents: [
                    {
                        title: 'District AI Summit',
                        slug: 'district-ai-summit',
                        startTime: '2026-03-30T09:00:00.000Z',
                    },
                ],
            },
            {
                cityName: 'Washington DC',
                citySlug: 'washington-dc',
                eventCount: 3,
                nextEventDate: '2026-03-22T09:00:00.000Z',
                latitude: 38.9072,
                longitude: -77.0369,
                previewEvents: [
                    {
                        title: 'Capital Infra Forum',
                        slug: 'capital-infra-forum',
                        startTime: '2026-03-22T09:00:00.000Z',
                    },
                ],
            },
        ]);

        expect(summaries).toEqual([
            {
                cityName: 'Washington DC',
                citySlug: 'washington-dc',
                eventCount: 11,
                nextEventDate: '2026-03-22T09:00:00.000Z',
                latitude: 38.9072,
                longitude: -77.0369,
                previewEvents: [
                    {
                        title: 'Capital Infra Forum',
                        slug: 'capital-infra-forum',
                        startTime: '2026-03-22T09:00:00.000Z',
                    },
                    {
                        title: 'District AI Summit',
                        slug: 'district-ai-summit',
                        startTime: '2026-03-30T09:00:00.000Z',
                    },
                ],
            },
        ]);
    });
});

describe('buildCountrySummaries', () => {
    it('groups country activity, counts events, preserves top cities, and builds country-level previews', () => {
        const summaries = buildCountrySummaries([
            {
                location_city: 'Tokyo',
                location_country: 'Japan',
                start_time: '2026-04-08T00:00:00.000Z',
                title: 'Tokyo Build Week',
                slug: 'tokyo-build-week',
            },
            {
                location_city: 'Osaka',
                location_country: 'Japan',
                start_time: '2026-04-03T00:00:00.000Z',
                title: 'Osaka Cloud Forum',
                slug: 'osaka-cloud-forum',
            },
            {
                location_city: 'Tokyo',
                location_country: 'Japan',
                start_time: '2026-04-01T00:00:00.000Z',
                title: 'Tokyo Infra Day',
                slug: 'tokyo-infra-day',
            },
            {
                location_city: 'San Francisco',
                location_country: 'USA',
                start_time: '2026-03-25T00:00:00.000Z',
                title: 'SF Systems Summit',
                slug: 'sf-systems-summit',
            },
            {
                location_city: 'New York',
                location_country: 'United States',
                start_time: '2026-03-24T00:00:00.000Z',
                title: 'NY Product Summit',
                slug: 'ny-product-summit',
            },
        ]);

        expect(summaries).toEqual([
            {
                countryName: 'Japan',
                countryKey: 'japan',
                eventCount: 3,
                nextEventDate: '2026-04-01T00:00:00.000Z',
                cityCount: 2,
                cities: [
                    {
                        cityName: 'Tokyo',
                        citySlug: 'tokyo',
                        eventCount: 2,
                        nextEventDate: '2026-04-01T00:00:00.000Z',
                    },
                    {
                        cityName: 'Osaka',
                        citySlug: 'osaka',
                        eventCount: 1,
                        nextEventDate: '2026-04-03T00:00:00.000Z',
                    },
                ],
                previewEvents: [
                    {
                        title: 'Tokyo Infra Day',
                        slug: 'tokyo-infra-day',
                        startTime: '2026-04-01T00:00:00.000Z',
                    },
                    {
                        title: 'Osaka Cloud Forum',
                        slug: 'osaka-cloud-forum',
                        startTime: '2026-04-03T00:00:00.000Z',
                    },
                    {
                        title: 'Tokyo Build Week',
                        slug: 'tokyo-build-week',
                        startTime: '2026-04-08T00:00:00.000Z',
                    },
                ],
            },
            {
                countryName: 'United States',
                countryKey: 'united states of america',
                eventCount: 2,
                nextEventDate: '2026-03-24T00:00:00.000Z',
                cityCount: 2,
                cities: [
                    {
                        cityName: 'New York',
                        citySlug: 'new-york',
                        eventCount: 1,
                        nextEventDate: '2026-03-24T00:00:00.000Z',
                    },
                    {
                        cityName: 'San Francisco',
                        citySlug: 'san-francisco',
                        eventCount: 1,
                        nextEventDate: '2026-03-25T00:00:00.000Z',
                    },
                ],
                previewEvents: [
                    {
                        title: 'NY Product Summit',
                        slug: 'ny-product-summit',
                        startTime: '2026-03-24T00:00:00.000Z',
                    },
                    {
                        title: 'SF Systems Summit',
                        slug: 'sf-systems-summit',
                        startTime: '2026-03-25T00:00:00.000Z',
                    },
                ],
            },
        ]);
    });
});
