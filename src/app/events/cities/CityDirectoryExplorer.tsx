'use client';

import { useMemo, useState } from 'react';
import type { CitySummary, CountrySummary } from '@/utils/citySummaries';
import CityDirectoryMap from './CityDirectoryMap';
import CityDirectorySearch from './CityDirectorySearch';

export type RankedCitySummary = CitySummary & { rank: number };

function isMappedCity(city: RankedCitySummary): city is RankedCitySummary & { latitude: number; longitude: number } {
    return city.latitude != null && city.longitude != null;
}

export default function CityDirectoryExplorer({
    cities,
    countryEventCounts,
    countrySummaries,
}: {
    cities: RankedCitySummary[];
    countryEventCounts: Record<string, number>;
    countrySummaries: CountrySummary[];
}) {
    const [selectedCitySlug, setSelectedCitySlug] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const mappedCities = useMemo(
        () => cities.filter(isMappedCity),
        [cities]
    );

    return (
        <div className="space-y-6">
            <CityDirectorySearch
                cities={cities}
                selectedCitySlug={selectedCitySlug}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onChooseCity={setSelectedCitySlug}
            />

            <CityDirectoryMap
                cities={cities}
                suggestedCities={mappedCities.slice(0, 3)}
                countryEventCounts={countryEventCounts}
                countrySummaries={countrySummaries}
                selectedCitySlug={selectedCitySlug}
                highlightedCitySlugs={[]}
                searchQuery={searchQuery}
                focusRequest={null}
                onSelectedCitySlugChange={setSelectedCitySlug}
            />
        </div>
    );
}
