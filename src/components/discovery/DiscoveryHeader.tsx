'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MagnifyingGlass, MapPin, Calendar, SlidersHorizontal, ArrowCounterClockwise, NavigationArrow, SpinnerGap } from '@phosphor-icons/react';
import QuickDatePicker from '@/components/calendar/QuickDatePicker';
import SearchAutocomplete from './SearchAutocomplete';
import type { SearchSuggestion } from '@/types';
import type { SearchHistoryItem } from '@/hooks/useSearchHistory';

interface DiscoveryHeaderProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    location: string;
    onLocationChange: (value: string) => void;
    dateRange: { start: Date | null; end: Date | null };
    onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
    onSearch: () => void;
    onResetFilters: () => void;
    activeFilterCount: number;
    onFilterClick?: () => void;
    onNearMeClick?: () => void;
    isDetectingLocation?: boolean;
    isSearching?: boolean;
    // Optional autocomplete props
    suggestions?: SearchSuggestion[];
    searchHistory?: SearchHistoryItem[];
    isAutocompletLoading?: boolean;
    onSuggestionSelect?: (suggestion: SearchSuggestion | SearchHistoryItem) => void;
    onHistorySelect?: (item: SearchHistoryItem) => void;
}

// Timezone to location mapping for fallback location detection
const timezoneToLocation: Record<string, { city: string; country: string }> = {
    'America/New_York': { city: 'New York', country: 'USA' },
    'America/Los_Angeles': { city: 'Los Angeles', country: 'USA' },
    'America/Chicago': { city: 'Chicago', country: 'USA' },
    'America/Denver': { city: 'Denver', country: 'USA' },
    'America/Toronto': { city: 'Toronto', country: 'Canada' },
    'America/Vancouver': { city: 'Vancouver', country: 'Canada' },
    'Europe/London': { city: 'London', country: 'UK' },
    'Europe/Berlin': { city: 'Berlin', country: 'Germany' },
    'Europe/Paris': { city: 'Paris', country: 'France' },
    'Europe/Amsterdam': { city: 'Amsterdam', country: 'Netherlands' },
    'Asia/Tokyo': { city: 'Tokyo', country: 'Japan' },
    'Asia/Singapore': { city: 'Singapore', country: 'Singapore' },
    'Asia/Hong_Kong': { city: 'Hong Kong', country: 'Hong Kong' },
    'Asia/Shanghai': { city: 'Shanghai', country: 'China' },
    'Australia/Sydney': { city: 'Sydney', country: 'Australia' },
    'Australia/Melbourne': { city: 'Melbourne', country: 'Australia' },
};

/**
 * Reverse geocode coordinates to get city name using free BigDataCloud API
 */
const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );

        if (!response.ok) {
            console.warn('[NearMe] Reverse geocoding API error:', response.status);
            return null;
        }

        const data = await response.json();

        // Try to get the city name from various fields
        const city = data.city || data.locality || data.principalSubdivision || null;

        if (city) {
            console.log('[NearMe] Detected location:', city, data.countryName);
            return city;
        }

        return null;
    } catch (error) {
        console.warn('[NearMe] Reverse geocoding failed:', error);
        return null;
    }
};

/**
 * Get location from IP address using BigDataCloud's free IP geolocation API
 * This is useful when browser geolocation is denied but user is traveling
 */
const getLocationFromIP = async (): Promise<string | null> => {
    try {
        console.log('[NearMe] Trying IP-based geolocation...');
        // Using BigDataCloud client-info - free, no API key required, HTTPS, returns city from IP
        const response = await fetch('https://api.bigdatacloud.net/data/client-info');

        if (!response.ok) {
            console.warn('[NearMe] IP geolocation API error:', response.status);
            return null;
        }

        const data = await response.json();
        console.log('[NearMe] IP geolocation response:', data);

        // BigDataCloud client-info returns location info based on IP
        const city = data.city || data.locality || data.location?.city || data.location?.locality || data.principalSubdivision || null;

        if (city) {
            console.log('[NearMe] IP-based location detected:', city, data.countryName || data.country);
            return city;
        }

        console.log('[NearMe] IP geolocation returned no city data');
        return null;
    } catch (error) {
        console.warn('[NearMe] IP geolocation failed:', error);
        return null;
    }
};

// Helper function to format date range for display
const formatDateRange = (range: { start: Date | null; end: Date | null }): string => {
    if (!range.start && !range.end) {
        return 'Any Date';
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    };

    if (range.start && range.end) {
        const startYear = range.start.getFullYear();
        const endYear = range.end.getFullYear();
        const startMonth = range.start.getMonth();
        const endMonth = range.end.getMonth();

        if (startYear === endYear && startMonth === endMonth) {
            // Same month: "Jan 1-15, 2025"
            return `${range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${range.end.getDate()}, ${startYear}`;
        } else if (startYear === endYear) {
            // Same year, different months: "Jan 1 - Feb 15, 2025"
            return `${formatDate(range.start)} - ${formatDate(range.end)}`;
        } else {
            // Different years: "Jan 1, 2024 - Jan 15, 2025"
            return `${range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
    } else if (range.start) {
        return `From ${formatDate(range.start)}`;
    } else if (range.end) {
        return `Until ${formatDate(range.end)}`;
    }

    return 'Any Date';
};

// Memoize to prevent unnecessary re-renders when parent updates
const DiscoveryHeader: React.FC<DiscoveryHeaderProps> = React.memo(({
    searchTerm,
    onSearchChange,
    location,
    onLocationChange,
    dateRange,
    onDateRangeChange,
    onSearch,
    onResetFilters,
    activeFilterCount,
    onFilterClick,
    onNearMeClick,
    isDetectingLocation = false,
    isSearching = false,
    suggestions = [],
    searchHistory = [],
    isAutocompletLoading = false,
    onSuggestionSelect
}) => {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isLocalDetecting, setIsLocalDetecting] = useState(false);
    const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Show autocomplete when typing and there are suggestions or history
    const hasAutocompleteContent = suggestions.length > 0 || searchHistory.length > 0;

    // Handle autocomplete visibility
    useEffect(() => {
        if (searchTerm.length >= 2 && hasAutocompleteContent) {
            setIsAutocompleteOpen(true);
        } else if (searchTerm.length < 2) {
            setIsAutocompleteOpen(false);
        }
    }, [searchTerm, hasAutocompleteContent]);

    // Handle suggestion selection
    const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion | SearchHistoryItem) => {
        if (onSuggestionSelect) {
            onSuggestionSelect(suggestion);
        } else {
            // Default behavior: update search term
            if ('term' in suggestion) {
                // It's a SearchHistoryItem
                onSearchChange(suggestion.term);
            } else {
                // It's a SearchSuggestion
                onSearchChange(suggestion.title);
            }
        }
        setIsAutocompleteOpen(false);
        onSearch();
    }, [onSuggestionSelect, onSearchChange, onSearch]);

    // Handle "Near Me" button click - detect user location
    const handleNearMeClick = useCallback(async () => {
        // If parent provides handler, use it
        if (onNearMeClick) {
            onNearMeClick();
            return;
        }

        // Otherwise, detect location locally
        setIsLocalDetecting(true);

        try {
            // 1. Try browser geolocation with reverse geocoding (most accurate)
            if ('geolocation' in navigator) {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            resolve,
                            reject,
                            { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
                        );
                    });

                    const { latitude, longitude } = position.coords;
                    console.log('[NearMe] Got coordinates:', latitude, longitude);

                    // Try reverse geocoding to get actual city name
                    const city = await reverseGeocode(latitude, longitude);

                    if (city) {
                        onLocationChange(city);
                        return;
                    }

                    console.log('[NearMe] Reverse geocoding returned no city, trying IP geolocation');
                } catch (error) {
                    console.warn('[NearMe] Geolocation failed:', error);
                    // Fall through to IP-based detection
                }
            }

            // 2. Try IP-based geolocation (works when traveling, more accurate than timezone)
            try {
                const ipCity = await getLocationFromIP();
                if (ipCity) {
                    onLocationChange(ipCity);
                    return;
                }
            } catch (error) {
                console.warn('[NearMe] IP geolocation failed:', error);
            }

            // 3. Final fallback: use timezone to guess location
            console.log('[NearMe] Falling back to timezone detection');
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const locationData = timezoneToLocation[timezone];

            if (locationData) {
                onLocationChange(locationData.city);
            } else {
                // Extract city from timezone
                const parts = timezone.split('/');
                if (parts.length > 1) {
                    const city = parts[parts.length - 1].replace(/_/g, ' ');
                    onLocationChange(city);
                }
            }
        } finally {
            setIsLocalDetecting(false);
        }
    }, [onNearMeClick, onLocationChange]);

    const isLoading = isDetectingLocation || isLocalDetecting;
    return (
        <div className={`bg-card/80 dark:bg-card/20 lg:bg-[#0F0F0F] rounded-2xl lg:rounded-xl p-4 border border-border/60 lg:border-[#262626] backdrop-blur mb-8 transition-colors ${isAutocompleteOpen ? 'relative z-[102]' : ''}`}>
            <div className="flex flex-col lg:flex-row items-center gap-4">

                {/* Search Input */}
                <div className={`flex-1 w-full relative group lg:rounded-[99px] lg:hover:bg-[#1A1A1A] transition-colors ${isAutocompleteOpen ? 'z-[102]' : ''}`}>
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5A5A5A] lg:text-[#999999] group-focus-within:text-[#E5E5E5] transition-colors z-10 flex items-center">
                        {isSearching ? (
                            <SpinnerGap size={18} className="animate-spin" />
                        ) : (
                            <MagnifyingGlass size={18} weight="regular" />
                        )}
                    </div>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search events..."
                        maxLength={200}
                        className="w-full pl-12 pr-4 py-3.5 lg:leading-none rounded-xl lg:rounded-[99px] border border-[#2A2A2A] lg:border-0 bg-[#1A1A1A] lg:bg-transparent focus:border-[#3A3A3A] lg:focus:border-0 focus:bg-[#1A1A1A] lg:focus:bg-transparent transition-all outline-none text-[#E5E5E5] placeholder:text-[#5A5A5A] lg:placeholder:text-[#A1A1AA]"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => hasAutocompleteContent && searchTerm.length >= 2 && setIsAutocompleteOpen(true)}
                        onBlur={(e) => {
                            onSearchChange(e.target.value.trim());
                            // Delay closing to allow click on autocomplete items
                            setTimeout(() => setIsAutocompleteOpen(false), 200);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setIsAutocompleteOpen(false);
                                onSearch();
                            } else if (e.key === 'Escape') {
                                setIsAutocompleteOpen(false);
                            }
                        }}
                    />
                    {/* Search Autocomplete Dropdown */}
                    {hasAutocompleteContent && (
                        <SearchAutocomplete
                            suggestions={suggestions}
                            history={searchHistory}
                            isLoading={isAutocompletLoading}
                            isOpen={isAutocompleteOpen}
                            onSelect={handleSuggestionSelect}
                            onClose={() => setIsAutocompleteOpen(false)}
                        />
                    )}
                </div>

                {/* Divider */}
                <div className="hidden lg:flex w-px h-[24px] bg-[#333333] self-center"></div>

                {/* Location Input with Near Me Button */}
                <div className="flex-1 w-full relative group lg:rounded-[99px] lg:hover:bg-[#1A1A1A] transition-colors">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5A5A5A] lg:text-[#999999] group-focus-within:text-[#E5E5E5] transition-colors flex items-center">
                        <MapPin size={18} weight="regular" />
                    </div>
                    <input
                        type="text"
                        placeholder="Location (e.g. San Francisco)"
                        maxLength={100}
                        className="w-full pl-12 pr-14 py-3.5 lg:leading-none rounded-xl lg:rounded-[99px] border border-[#2A2A2A] lg:border-0 bg-[#1A1A1A] lg:bg-transparent focus:border-[#3A3A3A] lg:focus:border-0 focus:bg-[#1A1A1A] lg:focus:bg-transparent transition-all outline-none text-[#E5E5E5] placeholder:text-[#5A5A5A] lg:placeholder:text-[#A1A1AA]"
                        value={location}
                        onChange={(e) => onLocationChange(e.target.value)}
                        onBlur={(e) => onLocationChange(e.target.value.trim())}
                    />
                    <button
                        type="button"
                        onClick={handleNearMeClick}
                        disabled={isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg transition-all text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        title="Find events near me"
                        aria-label="Detect my location"
                    >
                        {isLoading ? (
                            <SpinnerGap size={18} className="animate-spin" />
                        ) : (
                            <NavigationArrow size={18} />
                        )}
                    </button>
                </div>

                {/* Divider */}
                <div className="hidden lg:flex w-px h-[24px] bg-[#333333] self-center"></div>

                {/* Date Range Filter */}
                <div className="flex-1 w-full relative group lg:rounded-[99px] lg:hover:bg-[#1A1A1A] transition-colors">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5A5A5A] lg:text-[#999999] group-focus-within:text-[#E5E5E5] transition-colors flex items-center">
                        <Calendar size={18} weight="regular" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsDatePickerOpen(true)}
                        className="w-full pl-12 pr-4 py-3.5 lg:leading-none rounded-xl lg:rounded-[99px] border border-[#2A2A2A] lg:border-0 bg-[#1A1A1A] lg:bg-transparent focus:border-[#3A3A3A] lg:focus:border-0 focus:bg-[#1A1A1A] lg:focus:bg-transparent transition-all outline-none text-[#E5E5E5] text-left cursor-pointer hover:bg-[#222222] lg:hover:bg-transparent"
                    >
                        {formatDateRange(dateRange)}
                    </button>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <SlidersHorizontal size={16} />
                    </div>
                </div>

                {/* Date Range Picker */}
                <QuickDatePicker
                    currentDate={dateRange.start || new Date()}
                    onDateChange={() => { }} // Not used in range mode
                    view="month"
                    isOpen={isDatePickerOpen}
                    onClose={() => setIsDatePickerOpen(false)}
                    mode="range"
                    dateRange={dateRange}
                    onDateRangeChange={(range) => {
                        onDateRangeChange(range);
                    }}
                />

                {/* Clear All Filters Button */}
                {activeFilterCount > 0 && (
                    <button
                        className="w-full lg:w-auto px-6 py-3 border border-border/60 bg-transparent text-foreground font-semibold rounded-xl hover:bg-muted/60 hover:border-foreground/40 transition-colors active:scale-95 transform duration-100 flex items-center gap-2"
                        onClick={onResetFilters}
                        aria-label="Clear all filters"
                    >
                        <ArrowCounterClockwise size={18} />
                        <span>Clear All</span>
                    </button>
                )}

                {/* Search Button */}
                <button
                    className="w-full lg:w-auto lg:mr-1 px-8 py-3 lg:py-2 lg:bg-[#E5E5E5] lg:text-[#0F0F0F] bg-primary text-primary-foreground font-medium rounded-xl lg:rounded-lg hover:bg-primary/90 lg:hover:bg-[#D5D5D5] transition-colors active:scale-95 transform duration-100"
                    onClick={onSearch}
                >
                    Search
                </button>

                {/* Mobile Filters Button */}
                <button
                    className="lg:hidden w-full px-6 py-3 border border-border/60 bg-card text-foreground font-semibold rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-center gap-2"
                    onClick={onFilterClick}
                >
                    <SlidersHorizontal size={18} />
                    <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
                </button>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for date range
    const dateRangeEqual =
        prevProps.dateRange.start?.getTime() === nextProps.dateRange.start?.getTime() &&
        prevProps.dateRange.end?.getTime() === nextProps.dateRange.end?.getTime();

    // Compare suggestions arrays by length and first few items for performance
    const suggestionsEqual =
        prevProps.suggestions?.length === nextProps.suggestions?.length &&
        prevProps.suggestions?.[0]?.id === nextProps.suggestions?.[0]?.id;

    const historyEqual =
        prevProps.searchHistory?.length === nextProps.searchHistory?.length &&
        prevProps.searchHistory?.[0]?.id === nextProps.searchHistory?.[0]?.id;

    return (
        prevProps.searchTerm === nextProps.searchTerm &&
        prevProps.location === nextProps.location &&
        prevProps.activeFilterCount === nextProps.activeFilterCount &&
        prevProps.onFilterClick === nextProps.onFilterClick &&
        prevProps.isDetectingLocation === nextProps.isDetectingLocation &&
        prevProps.isSearching === nextProps.isSearching &&
        prevProps.isAutocompletLoading === nextProps.isAutocompletLoading &&
        dateRangeEqual &&
        suggestionsEqual &&
        historyEqual
    );
});

DiscoveryHeader.displayName = 'DiscoveryHeader';

export default DiscoveryHeader;
