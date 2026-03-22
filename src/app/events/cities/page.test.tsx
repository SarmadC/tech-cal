import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CityDirectoryPageView } from './page';

vi.mock('./CityDirectoryMap', () => ({
    __esModule: true,
    default: ({
        cities,
        suggestedCities,
        countryEventCounts,
        countrySummaries,
    }: {
        cities: Array<{ citySlug: string }>;
        suggestedCities: Array<{ citySlug: string }>;
        countryEventCounts: Record<string, number>;
        countrySummaries: Array<{ countryKey: string }>;
    }) => (
        <div data-testid="city-directory-map">
            map:{cities.length}:suggested:{suggestedCities.length}:countries:{Object.keys(countryEventCounts).length}:summaries:{countrySummaries.length}
        </div>
    ),
}));

describe('CityDirectoryPageView', () => {
    it('renders the atlas hero, map band, and searchable directory links while deduping repeated city slugs', async () => {
        const user = userEvent.setup();

        render(
            <CityDirectoryPageView
                nonce=""
                countryEventCounts={{
                    Netherlands: 34,
                    'United Kingdom': 28,
                    Germany: 24,
                    Japan: 14,
                }}
                countrySummaries={[
                    {
                        countryName: 'Netherlands',
                        countryKey: 'netherlands',
                        eventCount: 34,
                        nextEventDate: '2026-03-22T00:00:00.000Z',
                        cityCount: 1,
                        cities: [],
                        previewEvents: [],
                    },
                    {
                        countryName: 'United Kingdom',
                        countryKey: 'united kingdom',
                        eventCount: 28,
                        nextEventDate: '2026-03-24T00:00:00.000Z',
                        cityCount: 1,
                        cities: [],
                        previewEvents: [],
                    },
                    {
                        countryName: 'Germany',
                        countryKey: 'germany',
                        eventCount: 24,
                        nextEventDate: '2026-04-14T00:00:00.000Z',
                        cityCount: 1,
                        cities: [],
                        previewEvents: [],
                    },
                    {
                        countryName: 'Japan',
                        countryKey: 'japan',
                        eventCount: 14,
                        nextEventDate: '2026-04-08T00:00:00.000Z',
                        cityCount: 1,
                        cities: [],
                        previewEvents: [],
                    },
                ]}
                citySummaries={[
                    {
                        cityName: 'Amsterdam',
                        citySlug: 'amsterdam',
                        eventCount: 34,
                        nextEventDate: '2026-03-22T00:00:00.000Z',
                        latitude: 52.3676,
                        longitude: 4.9041,
                        previewEvents: [
                            {
                                title: 'Amsterdam AI Week',
                                slug: 'amsterdam-ai-week',
                                startTime: '2026-03-22T00:00:00.000Z',
                            },
                        ],
                    },
                    {
                        cityName: 'London',
                        citySlug: 'london',
                        eventCount: 28,
                        nextEventDate: '2026-03-24T00:00:00.000Z',
                        latitude: 51.5074,
                        longitude: -0.1278,
                        previewEvents: [
                            {
                                title: 'London Founder Summit',
                                slug: 'london-founder-summit',
                                startTime: '2026-03-24T00:00:00.000Z',
                            },
                        ],
                    },
                    {
                        cityName: 'Berlin',
                        citySlug: 'berlin',
                        eventCount: 24,
                        nextEventDate: '2026-04-14T00:00:00.000Z',
                        latitude: 52.52,
                        longitude: 13.405,
                        previewEvents: [
                            {
                                title: 'Berlin Data Forum',
                                slug: 'berlin-data-forum',
                                startTime: '2026-04-14T00:00:00.000Z',
                            },
                        ],
                    },
                    {
                        cityName: 'Tokyo',
                        citySlug: 'tokyo',
                        eventCount: 14,
                        nextEventDate: '2026-04-08T00:00:00.000Z',
                        latitude: 35.6762,
                        longitude: 139.6503,
                        previewEvents: [
                            {
                                title: 'Tokyo Build Week',
                                slug: 'tokyo-build-week',
                                startTime: '2026-04-08T00:00:00.000Z',
                            },
                        ],
                    },
                    {
                        cityName: 'Washington, D.C.',
                        citySlug: 'washington-dc',
                        eventCount: 8,
                        nextEventDate: '2026-04-10T00:00:00.000Z',
                        latitude: null,
                        longitude: null,
                        previewEvents: [
                            {
                                title: 'District AI Summit',
                                slug: 'district-ai-summit',
                                startTime: '2026-04-10T00:00:00.000Z',
                            },
                        ],
                    },
                    {
                        cityName: 'Washington DC',
                        citySlug: 'washington-dc',
                        eventCount: 3,
                        nextEventDate: '2026-03-28T00:00:00.000Z',
                        latitude: 38.9072,
                        longitude: -77.0369,
                        previewEvents: [
                            {
                                title: 'Capital Infra Forum',
                                slug: 'capital-infra-forum',
                                startTime: '2026-03-28T00:00:00.000Z',
                            },
                        ],
                    },
                ]}
            />
        );

        expect(screen.getByRole('heading', { name: 'City Directory' })).toBeInTheDocument();
        expect(screen.getByTestId('city-directory-map')).toHaveTextContent('map:5:suggested:3:countries:4:summaries:4');
        expect(screen.getByRole('searchbox', { name: 'Search city pages' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Tokyo' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Open' })).not.toBeInTheDocument();

        await user.type(screen.getByRole('searchbox', { name: 'Search city pages' }), 'tok');
        expect(screen.getByRole('searchbox', { name: 'Search city pages' })).toHaveValue('tok');
        expect(screen.queryByRole('heading', { name: 'Amsterdam' })).not.toBeInTheDocument();
    });
});
