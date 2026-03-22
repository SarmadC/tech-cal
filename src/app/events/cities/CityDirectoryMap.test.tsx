import type { ReactNode } from 'react';
import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CityDirectoryMap, { normalizeAtlasGeometry } from './CityDirectoryMap';

const easeToMock = vi.fn();
const fitBoundsMock = vi.fn();
const getClusterExpansionZoomMock = vi.fn((clusterId: number, callback: (error: Error | null, zoom: number) => void) => {
    callback(null, clusterId === 3 ? 3.25 : 2.5);
});
const getSourceMock = vi.fn(() => ({
    getClusterExpansionZoom: getClusterExpansionZoomMock,
}));

vi.mock('maplibre-gl', () => ({
    __esModule: true,
    default: {},
}));

vi.mock('topojson-client', () => ({
    feature: () => ({
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [] },
                properties: { name: 'Japan' },
            },
            {
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [] },
                properties: { name: 'United Kingdom' },
            },
        ],
    }),
}));

vi.mock('react-map-gl/maplibre', async () => {
    const React = await import('react');

    return {
        __esModule: true,
        default: React.forwardRef(function MockMap(
            {
                children,
                onClick,
                onMoveEnd,
            }: {
                children: ReactNode;
                onClick?: (event: {
                    features?: Array<{
                        layer: { id: string };
                        properties?: Record<string, unknown>;
                    }>;
                }) => void;
                onMoveEnd?: (event: { viewState: { zoom: number } }) => void;
            },
            ref
        ) {
            React.useImperativeHandle(ref, () => ({
                easeTo: ({ zoom }: { zoom?: number }) => {
                    if (typeof zoom === 'number') {
                        onMoveEnd?.({ viewState: { zoom } });
                    }
                    easeToMock({ zoom });
                },
                getMap: () => ({
                    getSource: getSourceMock,
                    fitBounds: (...args: unknown[]) => {
                        fitBoundsMock(...args);
                    },
                    easeTo: ({ zoom }: { zoom?: number }) => {
                        if (typeof zoom === 'number') {
                            onMoveEnd?.({ viewState: { zoom } });
                        }
                        easeToMock({ zoom });
                    },
                }),
            }));

            return (
                <div data-testid="atlas-map">
                    <button
                        type="button"
                        onClick={() => onClick?.({
                            features: [
                                {
                                    layer: { id: 'atlas-country-fill' },
                                    properties: { normalizedName: 'japan' },
                                },
                            ],
                        })}
                    >
                        Select Japan On Map
                    </button>
                    {children}
                </div>
            );
        }),
        Source: ({
            id,
            children,
        }: {
            id: string;
            children?: ReactNode;
        }) => (
            <div data-testid={`source-${id}`}>
                {children}
            </div>
        ),
        Layer: ({ id }: { id?: string }) => <div data-testid={`layer-${id ?? 'unknown'}`} />,
        Marker: ({ children }: { children: ReactNode }) => (
            <div>{children}</div>
        ),
    };
});

afterEach(() => {
    vi.unstubAllGlobals();
    easeToMock.mockReset();
    fitBoundsMock.mockReset();
    getSourceMock.mockClear();
    getClusterExpansionZoomMock.mockClear();
});

describe('CityDirectoryMap', () => {
    it('normalizes dateline-crossing polygons so they do not span the entire map', () => {
        const geometry = normalizeAtlasGeometry({
            type: 'MultiPolygon',
            coordinates: [
                [[
                    [-180, -16.06],
                    [-179.79, -16.02],
                    [179.36, -16.8],
                    [180, -16.06],
                    [-180, -16.06],
                ]],
            ],
        });

        expect(geometry.type).toBe('MultiPolygon');
        expect(geometry.coordinates[0][0]).toEqual([
            [-180, -16.06],
            [-179.79, -16.02],
            [-180.64, -16.8],
            [-180, -16.06],
            [-180, -16.06],
        ]);
    });

    it('renders map layers, loads country shading data, and opens city and country inspection panels', async () => {
        const user = userEvent.setup();

        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => ({
                objects: {
                    countries: {},
                },
            }),
        })) as unknown as typeof fetch);

        render(
            <ControlledMap />
        );

        await waitFor(() => {
            expect(screen.getByTestId('source-atlas-countries')).toBeInTheDocument();
        });

        expect(screen.getByTestId('layer-atlas-country-fill')).toBeInTheDocument();
        expect(screen.queryByTestId('source-atlas-cities')).not.toBeInTheDocument();
        expect(screen.getByText(/Click a country to inspect activity/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Select Japan On Map' }));
        expect(screen.getByRole('heading', { name: 'Japan' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Tokyo Build Week/i })).toHaveAttribute('href', '/events/tokyo-build-week');
        expect(screen.getByRole('button', { name: /Tokyo/i })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Tokyo/i }));
        expect(screen.getByRole('heading', { name: 'Tokyo' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Tokyo Build Week/i })).toHaveAttribute('href', '/events/tokyo-build-week');
        expect(screen.getByRole('link', { name: /View city calendar/i })).toHaveAttribute('href', '/events/cities/tokyo');

        act(() => {
            easeToMock.mockClear();
        });

        await user.click(screen.getByLabelText('Reset map'));
        expect(fitBoundsMock).toHaveBeenCalled();
    });

    it('shows a visible atlas fallback message when country geometry fails to load', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: false,
            status: 500,
            json: async () => ({ objects: {} }),
        })) as unknown as typeof fetch);

        render(
            <CityDirectoryMap
                countryEventCounts={{ Japan: 14 }}
                countrySummaries={[
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
                cities={[
                    {
                        cityName: 'Tokyo',
                        citySlug: 'tokyo',
                        eventCount: 14,
                        nextEventDate: '2026-04-08T00:00:00.000Z',
                        latitude: 35.6762,
                        longitude: 139.6503,
                        rank: 1,
                        previewEvents: [],
                    },
                ]}
                suggestedCities={[
                    {
                        cityName: 'Tokyo',
                        citySlug: 'tokyo',
                        eventCount: 14,
                        nextEventDate: '2026-04-08T00:00:00.000Z',
                        latitude: 35.6762,
                        longitude: 139.6503,
                        rank: 1,
                        previewEvents: [],
                    },
                ]}
                selectedCitySlug={null}
                highlightedCitySlugs={[]}
                searchQuery=""
                focusRequest={null}
                onSelectedCitySlugChange={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/country shading is unavailable right now/i)).toBeInTheDocument();
        });
    });

    it('uses the search query to select matching countries and cities', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => ({
                objects: {
                    countries: {},
                },
            }),
        })) as unknown as typeof fetch);

        const onSelectedCitySlugChange = vi.fn();

        const { rerender } = render(
            <CityDirectoryMap
                countryEventCounts={{ Japan: 14, 'United Kingdom': 34 }}
                countrySummaries={[
                    {
                        countryName: 'Japan',
                        countryKey: 'japan',
                        eventCount: 14,
                        nextEventDate: '2026-04-08T00:00:00.000Z',
                        cityCount: 1,
                        cities: [{ cityName: 'Tokyo', citySlug: 'tokyo', eventCount: 14, nextEventDate: '2026-04-08T00:00:00.000Z' }],
                        previewEvents: [{ title: 'Tokyo Build Week', slug: 'tokyo-build-week', startTime: '2026-04-08T00:00:00.000Z' }],
                    },
                    {
                        countryName: 'United Kingdom',
                        countryKey: 'united kingdom',
                        eventCount: 34,
                        nextEventDate: '2026-03-22T00:00:00.000Z',
                        cityCount: 1,
                        cities: [{ cityName: 'London', citySlug: 'london', eventCount: 34, nextEventDate: '2026-03-22T00:00:00.000Z' }],
                        previewEvents: [{ title: 'London Infra Summit', slug: 'london-infra-summit', startTime: '2026-03-22T00:00:00.000Z' }],
                    },
                ]}
                cities={[
                    {
                        cityName: 'Tokyo',
                        citySlug: 'tokyo',
                        eventCount: 14,
                        nextEventDate: '2026-04-08T00:00:00.000Z',
                        latitude: 35.6762,
                        longitude: 139.6503,
                        rank: 1,
                        previewEvents: [{ title: 'Tokyo Build Week', slug: 'tokyo-build-week', startTime: '2026-04-08T00:00:00.000Z' }],
                    },
                    {
                        cityName: 'London',
                        citySlug: 'london',
                        eventCount: 34,
                        nextEventDate: '2026-03-22T00:00:00.000Z',
                        latitude: 51.5074,
                        longitude: -0.1278,
                        rank: 2,
                        previewEvents: [{ title: 'London Infra Summit', slug: 'london-infra-summit', startTime: '2026-03-22T00:00:00.000Z' }],
                    },
                ]}
                suggestedCities={[]}
                selectedCitySlug={null}
                highlightedCitySlugs={[]}
                searchQuery="japan"
                focusRequest={null}
                onSelectedCitySlugChange={onSelectedCitySlugChange}
            />
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Japan' })).toBeInTheDocument();
        });

        rerender(
            <CityDirectoryMap
                countryEventCounts={{ Japan: 14 }}
                countrySummaries={[
                    {
                        countryName: 'Japan',
                        countryKey: 'japan',
                        eventCount: 14,
                        nextEventDate: '2026-04-08T00:00:00.000Z',
                        cityCount: 1,
                        cities: [{ cityName: 'Tokyo', citySlug: 'tokyo', eventCount: 14, nextEventDate: '2026-04-08T00:00:00.000Z' }],
                        previewEvents: [{ title: 'Tokyo Build Week', slug: 'tokyo-build-week', startTime: '2026-04-08T00:00:00.000Z' }],
                    },
                ]}
                cities={[
                    {
                        cityName: 'Tokyo',
                        citySlug: 'tokyo',
                        eventCount: 14,
                        nextEventDate: '2026-04-08T00:00:00.000Z',
                        latitude: 35.6762,
                        longitude: 139.6503,
                        rank: 1,
                        previewEvents: [{ title: 'Tokyo Build Week', slug: 'tokyo-build-week', startTime: '2026-04-08T00:00:00.000Z' }],
                    },
                ]}
                suggestedCities={[]}
                selectedCitySlug={null}
                highlightedCitySlugs={[]}
                searchQuery="tokyo"
                focusRequest={null}
                onSelectedCitySlugChange={onSelectedCitySlugChange}
            />
        );

        await waitFor(() => {
            expect(onSelectedCitySlugChange).toHaveBeenCalledWith('tokyo');
        });
    });
});

function ControlledMap() {
    const [selectedCitySlug, setSelectedCitySlug] = useState<string | null>(null);

    return (
        <CityDirectoryMap
            countryEventCounts={{
                'United Kingdom': 34,
                France: 24,
                Netherlands: 21,
                Japan: 14,
            }}
            countrySummaries={[
                {
                    countryName: 'United Kingdom',
                    countryKey: 'united kingdom',
                    eventCount: 34,
                    nextEventDate: '2026-03-22T00:00:00.000Z',
                    cityCount: 1,
                    cities: [
                        {
                            cityName: 'London',
                            citySlug: 'london',
                            eventCount: 34,
                            nextEventDate: '2026-03-22T00:00:00.000Z',
                        },
                    ],
                    previewEvents: [
                        {
                            title: 'London Infra Summit',
                            slug: 'london-infra-summit',
                            startTime: '2026-03-22T00:00:00.000Z',
                        },
                    ],
                },
                {
                    countryName: 'Japan',
                    countryKey: 'japan',
                    eventCount: 14,
                    nextEventDate: '2026-04-08T00:00:00.000Z',
                    cityCount: 1,
                    cities: [
                        {
                            cityName: 'Tokyo',
                            citySlug: 'tokyo',
                            eventCount: 14,
                            nextEventDate: '2026-04-08T00:00:00.000Z',
                        },
                    ],
                    previewEvents: [
                        {
                            title: 'Tokyo Build Week',
                            slug: 'tokyo-build-week',
                            startTime: '2026-04-08T00:00:00.000Z',
                        },
                    ],
                },
            ]}
            cities={[
                {
                    cityName: 'London',
                    citySlug: 'london',
                    eventCount: 34,
                    nextEventDate: '2026-03-22T00:00:00.000Z',
                    latitude: 51.5074,
                    longitude: -0.1278,
                    rank: 1,
                    previewEvents: [
                        {
                            title: 'London Infra Summit',
                            slug: 'london-infra-summit',
                            startTime: '2026-03-22T00:00:00.000Z',
                        },
                    ],
                },
                {
                    cityName: 'Paris',
                    citySlug: 'paris',
                    eventCount: 24,
                    nextEventDate: '2026-03-24T00:00:00.000Z',
                    latitude: 48.8566,
                    longitude: 2.3522,
                    rank: 2,
                    previewEvents: [
                        {
                            title: 'Paris Engineering Week',
                            slug: 'paris-engineering-week',
                            startTime: '2026-03-24T00:00:00.000Z',
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
                    rank: 4,
                    previewEvents: [
                        {
                            title: 'Tokyo Build Week',
                            slug: 'tokyo-build-week',
                            startTime: '2026-04-08T00:00:00.000Z',
                        },
                    ],
                },
                {
                    cityName: 'Remote',
                    citySlug: 'remote',
                    eventCount: 8,
                    nextEventDate: '2026-04-16T00:00:00.000Z',
                    latitude: null,
                    longitude: null,
                    rank: 5,
                    previewEvents: [
                        {
                            title: 'Remote Builders Day',
                            slug: 'remote-builders-day',
                            startTime: '2026-04-16T00:00:00.000Z',
                        },
                    ],
                },
            ]}
            suggestedCities={[
                {
                    cityName: 'London',
                    citySlug: 'london',
                    eventCount: 34,
                    nextEventDate: '2026-03-22T00:00:00.000Z',
                    latitude: 51.5074,
                    longitude: -0.1278,
                    rank: 1,
                    previewEvents: [
                        {
                            title: 'London Infra Summit',
                            slug: 'london-infra-summit',
                            startTime: '2026-03-22T00:00:00.000Z',
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
                    rank: 4,
                    previewEvents: [
                        {
                            title: 'Tokyo Build Week',
                            slug: 'tokyo-build-week',
                            startTime: '2026-04-08T00:00:00.000Z',
                        },
                    ],
                },
            ]}
            selectedCitySlug={selectedCitySlug}
            highlightedCitySlugs={['tokyo']}
            searchQuery=""
            focusRequest={null}
            onSelectedCitySlugChange={setSelectedCitySlug}
        />
    );
}
