'use client';

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type {
    FeatureCollection,
    GeoJsonProperties,
    Geometry,
    Position,
} from 'geojson';
import Link from 'next/link';
import {
    ArrowClockwise,
    CaretRight,
    CircleNotch,
    Minus,
    Plus,
    X,
} from '@phosphor-icons/react';
import maplibregl, {
    type StyleSpecification,
} from 'maplibre-gl';
import MapLibreMap, {
    Layer,
    Source,
    type LayerProps,
    type MapLayerMouseEvent,
    type MapRef,
} from 'react-map-gl/maplibre';
import { feature as topojsonFeature } from 'topojson-client';
import type { CitySummary, CountrySummary } from '@/utils/citySummaries';
import { normalizeCountryName } from '@/utils/citySummaries';
import { formatDate } from '@/utils/dateUtils';

const geoUrl = '/maps/countries-110m.json';
const DEFAULT_CENTER: [number, number] = [10, 20];
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ATLAS_BOUNDS = [
    [-165, -54],
    [190, 78],
] as const;

const ATLAS_STYLE: StyleSpecification = {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {},
    layers: [
        {
            id: 'atlas-background',
            type: 'background',
            paint: {
                'background-color': '#05070c',
            },
        },
    ],
};

type AtlasCitySummary = CitySummary & { rank: number };
type MappedCitySummary = AtlasCitySummary & { latitude: number; longitude: number };
type AtlasCountrySummary = CountrySummary;
type CountryFeatureCollection = FeatureCollection<Geometry, GeoJsonProperties & {
    name?: string;
    eventCount?: number;
    normalizedName?: string;
    displayName?: string;
}>;

interface CityDirectoryMapProps {
    cities: AtlasCitySummary[];
    suggestedCities: AtlasCitySummary[];
    countryEventCounts: Record<string, number>;
    countrySummaries: AtlasCountrySummary[];
    selectedCitySlug: string | null;
    highlightedCitySlugs: string[];
    searchQuery: string;
    focusRequest: { citySlug: string; nonce: number } | null;
    onSelectedCitySlugChange: (citySlug: string | null) => void;
}

function isMappedCity(city: AtlasCitySummary): city is MappedCitySummary {
    return city.latitude != null && city.longitude != null;
}

function clampZoom(nextZoom: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoom.toFixed(2))));
}

function formatRank(rank: number): string {
    return `#${rank}`;
}

function getSearchMatchScore(value: string, normalizedQuery: string): number | null {
    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue) {
        return null;
    }

    if (normalizedValue === normalizedQuery) {
        return 0;
    }

    if (normalizedValue.startsWith(normalizedQuery)) {
        return 1;
    }

    if (normalizedValue.includes(normalizedQuery)) {
        return 2;
    }

    return null;
}

function buildNormalizedCountryCounts(countryEventCounts: Record<string, number>): Record<string, number> {
    return Object.entries(countryEventCounts).reduce<Record<string, number>>((acc, [country, count]) => {
        const normalized = normalizeCountryName(country);
        acc[normalized] = (acc[normalized] ?? 0) + count;
        return acc;
    }, {});
}

function buildCountryFillExpression(maxCountryEvents: number): LayerProps['paint'] {
    if (maxCountryEvents <= 0) {
        return {
            'fill-color': '#11141a',
            'fill-opacity': 0.92,
        };
    }

    const high = Math.max(2, Math.round(maxCountryEvents * 0.35));
    const peak = Math.max(high + 1, maxCountryEvents);

    return {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'eventCount'], 0],
            0, '#11141a',
            1, '#465166',
            high, '#2d3647',
            peak, '#1a2230',
        ],
        'fill-opacity': 0.96,
    };
}

const COUNTRY_FILL_LAYER_BASE: Omit<LayerProps, 'paint'> = {
    id: 'atlas-country-fill',
    type: 'fill',
    source: 'atlas-countries',
};

const COUNTRY_ACTIVE_LINE_LAYER_BASE: Omit<LayerProps, 'filter'> = {
    id: 'atlas-country-active-line',
    type: 'line',
    source: 'atlas-countries',
    paint: {
        'line-color': '#a5f3fc',
        'line-width': 1.5,
        'line-opacity': 0.9,
    },
};

const COUNTRY_LINE_LAYER: LayerProps = {
    id: 'atlas-country-lines',
    type: 'line',
    source: 'atlas-countries',
    paint: {
        'line-color': 'rgba(148, 163, 184, 0.18)',
        'line-width': 0.8,
    },
};

function unwrapRing(ring: Position[]): Position[] {
    if (ring.length === 0) {
        return ring;
    }

    let offset = 0;
    let previousLongitude = ring[0][0];
    const adjustedRing: Position[] = [ring[0]];

    for (let index = 1; index < ring.length; index += 1) {
        const [longitude, latitude] = ring[index];
        let adjustedLongitude = longitude + offset;
        const delta = adjustedLongitude - previousLongitude;

        if (delta > 180) {
            offset -= 360;
            adjustedLongitude = longitude + offset;
        } else if (delta < -180) {
            offset += 360;
            adjustedLongitude = longitude + offset;
        }

        adjustedRing.push([adjustedLongitude, latitude]);
        previousLongitude = adjustedLongitude;
    }

    const longitudes = adjustedRing.map(([longitude]) => longitude);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);

    if (minLongitude > 180) {
        return adjustedRing.map(([longitude, latitude]) => [longitude - 360, latitude]);
    }

    if (maxLongitude < -180) {
        return adjustedRing.map(([longitude, latitude]) => [longitude + 360, latitude]);
    }

    return adjustedRing;
}

export function normalizeAtlasGeometry(geometry: Geometry): Geometry {
    if (geometry.type === 'Polygon') {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map(unwrapRing),
        };
    }

    if (geometry.type === 'MultiPolygon') {
        return {
            ...geometry,
            coordinates: geometry.coordinates.map((polygon) => polygon.map(unwrapRing)),
        };
    }

    return geometry;
}

function isAtlasDrifted(map: ReturnType<NonNullable<MapRef['getMap']>>) {
    if (typeof map.getBounds !== 'function') {
        return false;
    }

    const bounds = map.getBounds();
    const west = bounds.getWest();
    const east = bounds.getEast();
    const south = bounds.getSouth();
    const north = bounds.getNorth();

    return (
        west < ATLAS_BOUNDS[0][0] - 38 ||
        east > ATLAS_BOUNDS[1][0] + 38 ||
        south < ATLAS_BOUNDS[0][1] - 12 ||
        north > ATLAS_BOUNDS[1][1] + 12
    );
}

function getAtlasPadding() {
    if (typeof window === 'undefined') {
        return { top: 80, right: 28, bottom: 220, left: 28 };
    }

    if (window.innerWidth >= 1024) {
        return { top: 32, right: 56, bottom: 32, left: 56 };
    }

    if (window.innerWidth >= 768) {
        return { top: 96, right: 32, bottom: 260, left: 32 };
    }

    return { top: 104, right: 20, bottom: 260, left: 20 };
}

function getFocusPadding() {
    if (typeof window === 'undefined') {
        return { top: 80, right: 28, bottom: 220, left: 28 };
    }

    if (window.innerWidth >= 1024) {
        return { top: 40, right: 300, bottom: 40, left: 56 };
    }

    return { top: 96, right: 24, bottom: 260, left: 24 };
}

export default function CityDirectoryMap({
    cities,
    suggestedCities: _suggestedCities,
    countryEventCounts,
    countrySummaries,
    selectedCitySlug,
    highlightedCitySlugs: _highlightedCitySlugs,
    searchQuery,
    focusRequest,
    onSelectedCitySlugChange,
}: CityDirectoryMapProps) {
    const mapRef = useRef<MapRef | null>(null);
    const lastAppliedSearchQueryRef = useRef('');
    const mappedCities = useMemo(
        () => cities.filter(isMappedCity),
        [cities]
    );
    const cityBySlug = useMemo(
        () => new Map(cities.map((city) => [city.citySlug, city])),
        [cities]
    );
    const mappedCityBySlug = useMemo(
        () => new Map(mappedCities.map((city) => [city.citySlug, city])),
        [mappedCities]
    );
    const normalizedCountryCounts = useMemo(
        () => buildNormalizedCountryCounts(countryEventCounts),
        [countryEventCounts]
    );
    const countrySummaryByKey = useMemo(
        () => new Map(countrySummaries.map((country) => [country.countryKey, country])),
        [countrySummaries]
    );
    const maxCountryEvents = useMemo(
        () => Math.max(...Object.values(normalizedCountryCounts), 0),
        [normalizedCountryCounts]
    );
    const [countryGeoJson, setCountryGeoJson] = useState<CountryFeatureCollection | null>(null);
    const [topologyStatus, setTopologyStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
    const [selectedCountryKey, setSelectedCountryKey] = useState<string | null>(null);
    const selectedCity = selectedCitySlug ? cityBySlug.get(selectedCitySlug) ?? null : null;
    const selectedCountry = selectedCountryKey ? countrySummaryByKey.get(selectedCountryKey) ?? null : null;
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const countryFillLayer = useMemo<LayerProps>(() => ({
        ...COUNTRY_FILL_LAYER_BASE,
        paint: buildCountryFillExpression(maxCountryEvents),
    }), [maxCountryEvents]);
    const activeCountryLineLayer = useMemo<LayerProps | null>(() => {
        if (!selectedCountryKey) {
            return null;
        }

        return {
            ...COUNTRY_ACTIVE_LINE_LAYER_BASE,
            filter: ['==', ['coalesce', ['get', 'normalizedName'], ''], selectedCountryKey],
        };
    }, [selectedCountryKey]);
    const interactiveLayerIds = useMemo(
        () => [COUNTRY_FILL_LAYER_BASE.id as string],
        []
    );

    useEffect(() => {
        if (selectedCitySlug) {
            setSelectedCountryKey(null);
        }
    }, [selectedCitySlug]);

    const fitAtlasBoard = (duration = 0) => {
        const map = mapRef.current?.getMap();

        if (!map) {
            return;
        }

        map.fitBounds(ATLAS_BOUNDS, {
            padding: getAtlasPadding(),
            duration,
            linear: true,
        });
        if (typeof map.getZoom === 'function') {
            setMapZoom(clampZoom(map.getZoom()));
        }
    };

    useEffect(() => {
        let cancelled = false;

        async function loadCountries() {
            try {
                setTopologyStatus('loading');
                const response = await fetch(geoUrl);

                if (!response.ok) {
                    throw new Error(`Failed to load atlas geometry: ${response.status}`);
                }

                const topology = await response.json() as {
                    objects: Record<string, unknown>;
                };
                const objectKey = Object.keys(topology.objects)[0];
                const geoJson = topojsonFeature(
                    topology as never,
                    topology.objects[objectKey] as never
                ) as CountryFeatureCollection;

                if (!cancelled) {
                    setCountryGeoJson(geoJson);
                    setTopologyStatus('ready');
                }
            } catch {
                if (!cancelled) {
                    setCountryGeoJson(null);
                    setTopologyStatus('error');
                }
            }
        }

        void loadCountries();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const handleRealign = () => {
            const map = mapRef.current?.getMap();

            if (selectedCity) {
                mapRef.current?.easeTo({
                    center: [selectedCity.longitude, selectedCity.latitude],
                    zoom: Math.max(typeof map?.getZoom === 'function' ? map.getZoom() : mapZoom, 2.6),
                    duration: 0,
                    padding: getFocusPadding(),
                });
                return;
            }

            fitAtlasBoard();
        };

        window.addEventListener('resize', handleRealign);
        window.addEventListener('orientationchange', handleRealign);

        return () => {
            window.removeEventListener('resize', handleRealign);
            window.removeEventListener('orientationchange', handleRealign);
        };
    }, [mapZoom, selectedCity]);

    useEffect(() => {
        if (!focusRequest) {
            return;
        }

        const city = cityBySlug.get(focusRequest.citySlug);
        const map = mapRef.current?.getMap();

        if (!city) {
            return;
        }

        mapRef.current?.easeTo({
            center: [city.longitude, city.latitude],
            zoom: Math.max(typeof map?.getZoom === 'function' ? map.getZoom() : DEFAULT_ZOOM, 2.6),
            duration: 650,
            padding: getFocusPadding(),
        });
    }, [cityBySlug, focusRequest]);

    const bestSearchCity = useMemo(() => {
        if (!normalizedSearchQuery) {
            return null;
        }

        return cities
            .map((city) => ({
                city,
                score: Math.min(
                    ...[city.cityName, city.citySlug]
                        .map((value) => getSearchMatchScore(value, normalizedSearchQuery))
                        .filter((score): score is number => score != null)
                ),
            }))
            .filter((entry) => Number.isFinite(entry.score))
            .sort((a, b) => {
                if (a.score !== b.score) {
                    return a.score - b.score;
                }

                if (b.city.eventCount !== a.city.eventCount) {
                    return b.city.eventCount - a.city.eventCount;
                }

                return a.city.rank - b.city.rank;
            })[0]?.city ?? null;
    }, [cities, normalizedSearchQuery]);

    const bestSearchCountry = useMemo(() => {
        if (!normalizedSearchQuery) {
            return null;
        }

        return countrySummaries
            .map((country) => ({
                country,
                score: Math.min(
                    ...[country.countryName, country.countryKey]
                        .map((value) => getSearchMatchScore(value, normalizedSearchQuery))
                        .filter((score): score is number => score != null)
                ),
            }))
            .filter((entry) => Number.isFinite(entry.score))
            .sort((a, b) => {
                if (a.score !== b.score) {
                    return a.score - b.score;
                }

                if (b.country.eventCount !== a.country.eventCount) {
                    return b.country.eventCount - a.country.eventCount;
                }

                return a.country.countryName.localeCompare(b.country.countryName);
            })[0]?.country ?? null;
    }, [countrySummaries, normalizedSearchQuery]);

    useEffect(() => {
        if (!normalizedSearchQuery) {
            lastAppliedSearchQueryRef.current = '';
            return;
        }

        if (lastAppliedSearchQueryRef.current === normalizedSearchQuery) {
            return;
        }

        const countryScore = bestSearchCountry
            ? Math.min(
                ...[bestSearchCountry.countryName, bestSearchCountry.countryKey]
                    .map((value) => getSearchMatchScore(value, normalizedSearchQuery))
                    .filter((score): score is number => score != null)
            )
            : null;
        const cityScore = bestSearchCity
            ? Math.min(
                ...[bestSearchCity.cityName, bestSearchCity.citySlug]
                    .map((value) => getSearchMatchScore(value, normalizedSearchQuery))
                    .filter((score): score is number => score != null)
            )
            : null;

        if (bestSearchCountry && (countryScore ?? Number.POSITIVE_INFINITY) <= (cityScore ?? Number.POSITIVE_INFINITY)) {
            lastAppliedSearchQueryRef.current = normalizedSearchQuery;
            onSelectedCitySlugChange(null);
            setSelectedCountryKey(bestSearchCountry.countryKey);
            return;
        }

        if (!bestSearchCity) {
            lastAppliedSearchQueryRef.current = normalizedSearchQuery;
            return;
        }

        lastAppliedSearchQueryRef.current = normalizedSearchQuery;
        onSelectedCitySlugChange(bestSearchCity.citySlug);
        setSelectedCountryKey(null);

        const mappedSearchCity = mappedCityBySlug.get(bestSearchCity.citySlug);
        const map = mapRef.current?.getMap();

        if (mappedSearchCity) {
            mapRef.current?.easeTo({
                center: [mappedSearchCity.longitude, mappedSearchCity.latitude],
                zoom: Math.max(typeof map?.getZoom === 'function' ? map.getZoom() : DEFAULT_ZOOM, 2.6),
                duration: 500,
                padding: getFocusPadding(),
            });
        }
    }, [
        bestSearchCity,
        bestSearchCountry,
        mappedCityBySlug,
        normalizedSearchQuery,
        onSelectedCitySlugChange,
    ]);

    const countriesWithCounts = useMemo<CountryFeatureCollection | null>(() => {
        if (!countryGeoJson) {
            return null;
        }

        return {
            type: 'FeatureCollection',
            features: countryGeoJson.features.map((country) => {
                const countryName =
                    typeof country.properties?.name === 'string'
                        ? normalizeCountryName(country.properties.name)
                        : '';
                const summary = countrySummaryByKey.get(countryName);
                const eventCount = summary?.eventCount ?? normalizedCountryCounts[countryName] ?? 0;

                return {
                    ...country,
                    geometry: normalizeAtlasGeometry(country.geometry),
                    properties: {
                        ...country.properties,
                        eventCount,
                        normalizedName: countryName,
                        displayName: summary?.countryName ?? country.properties?.name,
                    },
                };
            }),
        };
    }, [countryGeoJson, countrySummaryByKey, normalizedCountryCounts]);

    if (mappedCities.length === 0) {
        return (
            <section className="rounded-[34px] border border-border-subtle bg-background-secondary/16 p-8 text-center backdrop-blur-sm">
                <p className="text-xs font-medium text-foreground-tertiary/70">
                    Atlas offline
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground-primary">
                    This directory does not have mapped cities yet.
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-foreground-secondary">
                    City pages are still available below, but the interactive atlas will activate once upcoming events
                    include usable coordinates.
                </p>
            </section>
        );
    }

    const focusCity = (city: MappedCitySummary) => {
        const map = mapRef.current?.getMap();

        onSelectedCitySlugChange(city.citySlug);
        setSelectedCountryKey(null);
        mapRef.current?.easeTo({
            center: [city.longitude, city.latitude],
            zoom: Math.max(typeof map?.getZoom === 'function' ? map.getZoom() : mapZoom, 2.6),
            duration: 650,
            padding: getFocusPadding(),
        });
    };

    const resetMap = () => {
        onSelectedCitySlugChange(null);
        setSelectedCountryKey(null);
        fitAtlasBoard(650);
    };

    const zoomBy = (delta: number) => {
        const nextZoom = clampZoom(mapZoom + delta);
        mapRef.current?.easeTo({
            zoom: nextZoom,
            duration: 350,
        });
        setMapZoom(nextZoom);
    };

    const handleMapClick = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];

        if (!feature) {
            onSelectedCitySlugChange(null);
            setSelectedCountryKey(null);
            return;
        }

        if (feature.layer.id === COUNTRY_FILL_LAYER_BASE.id) {
            const countryKey =
                typeof feature.properties?.normalizedName === 'string'
                    ? feature.properties.normalizedName
                    : null;
            const countrySummary = countryKey ? countrySummaryByKey.get(countryKey) ?? null : null;

            if (!countrySummary || countrySummary.eventCount <= 0) {
                return;
            }

            onSelectedCitySlugChange(null);
            setSelectedCountryKey(countryKey);
            return;
        }
    };

    return (
        <section aria-labelledby="interactive-city-atlas" className="space-y-6">
            <h2 id="interactive-city-atlas" className="sr-only">
                Interactive city atlas
            </h2>
            <div className="relative overflow-hidden rounded-[36px] border border-border-subtle bg-[#05070c] shadow-[0_16px_60px_-42px_rgba(15,23,42,0.65)]">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:44px_44px]" />
                </div>

                <div className="relative h-[50vh] min-h-[24rem] sm:h-[55vh] lg:h-[70vh]">
                    <MapLibreMap
                        ref={mapRef}
                        mapLib={maplibregl}
                        initialViewState={{
                            longitude: DEFAULT_CENTER[0],
                            latitude: DEFAULT_CENTER[1],
                            zoom: DEFAULT_ZOOM,
                        }}
                        mapStyle={ATLAS_STYLE}
                        attributionControl={false}
                        dragRotate={false}
                        maxPitch={0}
                        renderWorldCopies={false}
                        touchZoomRotate={false}
                        interactiveLayerIds={interactiveLayerIds}
                        onClick={handleMapClick}
                        onLoad={() => {
                            fitAtlasBoard();
                        }}
                        onMoveEnd={(event) => {
                            setMapZoom(clampZoom(event.viewState.zoom));
                            const map = mapRef.current?.getMap();
                            if (map && isAtlasDrifted(map)) {
                                if (selectedCity) {
                                    mapRef.current?.easeTo({
                                        center: [selectedCity.longitude, selectedCity.latitude],
                                        zoom: Math.max(clampZoom(event.viewState.zoom), 2.6),
                                        duration: 420,
                                        padding: getFocusPadding(),
                                    });
                                } else {
                                    fitAtlasBoard(420);
                                }
                            }
                        }}
                        reuseMaps
                        style={{ width: '100%', height: '100%' }}
                    >
                        {countriesWithCounts ? (
                            <Source id="atlas-countries" type="geojson" data={countriesWithCounts}>
                                <Layer {...countryFillLayer} />
                                <Layer {...COUNTRY_LINE_LAYER} />
                                {activeCountryLineLayer ? <Layer {...activeCountryLineLayer} /> : null}
                            </Source>
                        ) : null}
                    </MapLibreMap>
                </div>

                <div className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-sm rounded-[20px] border border-white/10 bg-black/45 px-4 py-3 text-xs leading-5 text-zinc-300 backdrop-blur-md sm:bottom-6 sm:left-6">
                    <p>Shaded countries show regional event density. Click a country to inspect activity.</p>
                    {topologyStatus === 'loading' ? (
                        <p className="mt-2 inline-flex items-center gap-2 text-zinc-400">
                            <CircleNotch size={12} className="animate-spin" />
                            Loading atlas geometry
                        </p>
                    ) : null}
                    {topologyStatus === 'error' ? (
                        <p className="mt-2 text-amber-200">
                            Atlas country shading is unavailable right now. Use the directory below while it reloads.
                        </p>
                    ) : null}
                </div>

                <div className="absolute right-4 top-[8.5rem] z-20 flex flex-col gap-2 sm:right-6 sm:top-[9rem]">
                    <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-zinc-100 backdrop-blur-md transition-colors hover:bg-black/50"
                        aria-label="Zoom in"
                        onClick={() => zoomBy(0.55)}
                    >
                        <Plus size={18} weight="bold" />
                    </button>
                    <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-zinc-100 backdrop-blur-md transition-colors hover:bg-black/50"
                        aria-label="Zoom out"
                        onClick={() => zoomBy(-0.55)}
                    >
                        <Minus size={18} weight="bold" />
                    </button>
                    <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-zinc-100 backdrop-blur-md transition-colors hover:bg-black/50"
                        aria-label="Reset map"
                        onClick={resetMap}
                    >
                        <ArrowClockwise size={18} weight="bold" />
                    </button>
                </div>

                {selectedCity || selectedCountry ? (
                    <aside className="absolute bottom-3 left-3 right-3 z-20 max-h-[45vh] overflow-y-auto rounded-[28px] border border-white/10 bg-black/55 p-5 backdrop-blur-xl sm:bottom-5 sm:left-5 sm:right-5 md:left-auto md:right-5 md:top-5 md:bottom-auto md:max-h-[calc(100%-2.5rem)] md:w-[20rem] lg:w-[22rem] md:max-w-[calc(100%-3rem)]">
                        {selectedCity ? (
                        <div className="flex flex-col">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-sky-200/75">
                                        Selected city
                                    </p>
                                    <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                                        {selectedCity.cityName}
                                    </h3>
                                </div>

                                <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition-colors hover:bg-white/6 hover:text-white"
                                    aria-label="Clear city selection"
                                    onClick={() => {
                                        onSelectedCitySlugChange(null);
                                    }}
                                >
                                    <X size={16} weight="bold" />
                                </button>
                            </div>

                            <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
                                <div className="flex items-center justify-between gap-4 py-4">
                                    <div className="text-xs font-medium text-zinc-400">
                                        Next event
                                    </div>
                                    <p className="text-sm font-medium text-white">
                                        {formatDate(selectedCity.nextEventDate)}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-4">
                                    <div className="text-xs font-medium text-zinc-400">
                                        Atlas standing
                                    </div>
                                    <p className="text-right text-sm font-medium text-white">
                                        Ranked {formatRank(selectedCity.rank)}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-4">
                                    <div className="text-xs font-medium text-zinc-400">
                                        Total events
                                    </div>
                                    <p className="text-sm font-medium text-white">
                                        {selectedCity.eventCount}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-zinc-400">
                                        Upcoming preview
                                    </p>
                                    <span className="text-xs text-zinc-500">
                                        {selectedCity.previewEvents.length} of {selectedCity.eventCount}
                                    </span>
                                </div>
                                <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
                                    {selectedCity.previewEvents.length > 0 ? (
                                        selectedCity.previewEvents.map((event) => (
                                            <Link
                                                key={event.slug}
                                                href={`/events/${event.slug}`}
                                                className="flex items-center justify-between gap-3 py-3 text-sm text-zinc-200 transition-colors hover:text-white"
                                            >
                                                <span className="min-w-0 truncate">{event.title}</span>
                                                <span className="shrink-0 text-xs text-zinc-400">
                                                    {formatDate(event.startTime)}
                                                </span>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="py-4 text-sm leading-6 text-zinc-400">
                                            Event previews are unavailable for this city right now, but the full calendar is still linked below.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Link
                                href={`/events/cities/${selectedCity.citySlug}`}
                                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-sky-200 transition-colors hover:text-white"
                            >
                                View city calendar
                                <CaretRight size={14} weight="bold" />
                            </Link>
                        </div>
                    ) : selectedCountry ? (
                        <div className="flex flex-col">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-sky-200/75">
                                        Selected country
                                    </p>
                                    <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                                        {selectedCountry.countryName}
                                    </h3>
                                </div>

                                <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition-colors hover:bg-white/6 hover:text-white"
                                    aria-label="Clear country selection"
                                    onClick={() => {
                                        setSelectedCountryKey(null);
                                    }}
                                >
                                    <X size={16} weight="bold" />
                                </button>
                            </div>

                            <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
                                <div className="flex items-center justify-between gap-4 py-4">
                                    <div className="text-xs font-medium text-zinc-400">
                                        Next event
                                    </div>
                                    <p className="text-sm font-medium text-white">
                                        {formatDate(selectedCountry.nextEventDate)}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-4">
                                    <div className="text-xs font-medium text-zinc-400">
                                        Total events
                                    </div>
                                    <p className="text-sm font-medium text-white">
                                        {selectedCountry.eventCount}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between gap-4 py-4">
                                    <div className="text-xs font-medium text-zinc-400">
                                        Active city pages
                                    </div>
                                    <p className="text-sm font-medium text-white">
                                        {selectedCountry.cityCount}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-zinc-400">
                                        City activity
                                    </p>
                                    <span className="text-xs text-zinc-500">
                                        {selectedCountry.cities.length} shown
                                    </span>
                                </div>
                                <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
                                    {selectedCountry.cities.map((city) => {
                                        const mappedCity = cityBySlug.get(city.citySlug);

                                        if (mappedCity) {
                                            return (
                                                <button
                                                    key={city.citySlug}
                                                    type="button"
                                                    className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm text-zinc-200 transition-colors hover:text-white"
                                                    onClick={() => focusCity(mappedCity)}
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block truncate">{city.cityName}</span>
                                                        <span className="mt-1 block text-xs text-zinc-400">
                                                            {city.eventCount} upcoming events
                                                        </span>
                                                    </span>
                                                    <CaretRight size={14} weight="bold" className="shrink-0 text-zinc-500" />
                                                </button>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={city.citySlug}
                                                href={`/events/cities/${city.citySlug}`}
                                                className="flex items-center justify-between gap-3 py-3 text-sm text-zinc-200 transition-colors hover:text-white"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate">{city.cityName}</span>
                                                    <span className="mt-1 block text-xs text-zinc-400">
                                                        {city.eventCount} upcoming events
                                                    </span>
                                                </span>
                                                <CaretRight size={14} weight="bold" className="shrink-0 text-zinc-500" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-zinc-400">
                                        Upcoming events
                                    </p>
                                    <span className="text-xs text-zinc-500">
                                        {selectedCountry.previewEvents.length} of {selectedCountry.eventCount}
                                    </span>
                                </div>
                                <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
                                    {selectedCountry.previewEvents.length > 0 ? (
                                        selectedCountry.previewEvents.map((event) => (
                                            <Link
                                                key={event.slug}
                                                href={`/events/${event.slug}`}
                                                className="flex items-center justify-between gap-3 py-3 text-sm text-zinc-200 transition-colors hover:text-white"
                                            >
                                                <span className="min-w-0 truncate">{event.title}</span>
                                                <span className="shrink-0 text-xs text-zinc-400">
                                                    {formatDate(event.startTime)}
                                                </span>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="py-4 text-sm leading-6 text-zinc-400">
                                            Upcoming event previews are unavailable for this country right now.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                    </aside>
                ) : null}
            </div>
        </section>
    );
}
