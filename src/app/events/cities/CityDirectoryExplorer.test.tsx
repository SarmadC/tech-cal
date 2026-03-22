import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CityDirectoryExplorer from './CityDirectoryExplorer';

vi.mock('./CityDirectoryMap', () => ({
    __esModule: true,
    default: ({
        selectedCitySlug,
        searchQuery,
        onSelectedCitySlugChange,
    }: {
        selectedCitySlug: string | null;
        searchQuery: string;
        onSelectedCitySlugChange: (citySlug: string | null) => void;
    }) => (
        <div>
            <div data-testid="map-selection">{selectedCitySlug ?? 'none'}</div>
            <div data-testid="map-search">{searchQuery || 'none'}</div>
            <button type="button" onClick={() => onSelectedCitySlugChange('london')}>
                Select London On Map
            </button>
        </div>
    ),
}));

describe('CityDirectoryExplorer', () => {
    it('syncs atlas selection and search highlighting with the directory', async () => {
        const user = userEvent.setup();

        render(
            <CityDirectoryExplorer
                countryEventCounts={{}}
                countrySummaries={[]}
                cities={[
                    {
                        cityName: 'Amsterdam',
                        citySlug: 'amsterdam',
                        eventCount: 34,
                        nextEventDate: '2026-03-22T00:00:00.000Z',
                        latitude: 52.3676,
                        longitude: 4.9041,
                        rank: 1,
                        previewEvents: [],
                    },
                    {
                        cityName: 'London',
                        citySlug: 'london',
                        eventCount: 28,
                        nextEventDate: '2026-03-24T00:00:00.000Z',
                        latitude: 51.5074,
                        longitude: -0.1278,
                        rank: 2,
                        previewEvents: [],
                    },
                    {
                        cityName: 'Remote',
                        citySlug: 'remote',
                        eventCount: 4,
                        nextEventDate: '2026-04-01T00:00:00.000Z',
                        latitude: null,
                        longitude: null,
                        rank: 3,
                        previewEvents: [],
                    },
                ]}
            />
        );

        expect(screen.getByTestId('map-selection')).toHaveTextContent('none');
        expect(screen.getByTestId('map-search')).toHaveTextContent('none');

        await user.type(screen.getByRole('searchbox', { name: 'Search city pages' }), 'lon');
        expect(screen.getByTestId('map-search')).toHaveTextContent('lon');

        await user.click(screen.getByRole('button', { name: 'Select London On Map' }));
        expect(screen.getByTestId('map-selection')).toHaveTextContent('london');
    });
});
