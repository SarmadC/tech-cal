'use client';

import { FC, useState, useRef, useEffect, useCallback } from 'react';
import { X, MagnifyingGlass, Funnel, Calendar, MapPin, Users, Clock, Tag, Star, ArrowClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartFilterOptions } from '@/hooks/useSmartFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import type { SearchSuggestion } from '@/types';

export interface MobileSearchFilterProps {
    filters: SmartFilterOptions;
    onUpdateFilter: <K extends keyof SmartFilterOptions>(key: K, value: SmartFilterOptions[K]) => void;
    onResetFilters: () => void;
    onApplyQuickFilter: (filterType: string) => void;
    activeFilterCount: number;
    isOpen: boolean;
    onClose: () => void;
    events: Array<{ id: string; title: string; organizer: string; eventTypeId: string; startTime: string; endTime?: string }>;
    categories: Array<{ id: string; name: string; color?: string }>;
    onSearchSuggestionSelect?: (suggestion: SearchSuggestion) => void;
    onDateChange?: (date: Date) => void;
}

// Helper function to get the appropriate Phosphor icon
const getIconComponent = (iconName: string, size: number = 16) => {
    switch (iconName) {
        case 'event':
        case 'calendar':
            return <Calendar size={size} />;
        case 'people':
            return <Users size={size} />;
        case 'label':
        case 'tag':
            return <Tag size={size} />;
        case 'location':
            return <MapPin size={size} />;
        case 'time':
        case 'clock':
            return <Clock size={size} />;
        case 'star':
            return <Star size={size} />;
        case 'close':
            return <X size={size} />;
        case 'refresh':
            return <ArrowClockwise size={size} />;
        default:
            return <Tag size={size} />;
    }
};

const MobileSearchFilter: FC<MobileSearchFilterProps> = ({
    filters,
    onUpdateFilter,
    onResetFilters,
    onApplyQuickFilter: _onApplyQuickFilter,
    activeFilterCount,
    isOpen,
    onClose,
    events,
    categories,
    onSearchSuggestionSelect,
    onDateChange
}) => {
    const [searchTerm, setSearchTerm] = useState(filters.searchTerm);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeTab, setActiveTab] = useState<'search' | 'filters'>('search');
    const [_isSearchFocused, setIsSearchFocused] = useState(false);
    
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Use search suggestions hook
    const {
        suggestions,
        isLoading: isSuggestionsLoading,
        hasResults
    } = useSearchSuggestions({
        searchTerm: debouncedSearchTerm,
        events,
        categories,
        maxSuggestions: 8,
        debounceMs: 300
    });

    // Update search term when filters change externally
    useEffect(() => {
        setSearchTerm(filters.searchTerm);
    }, [filters.searchTerm]);

    // Apply debounced search term
    useEffect(() => {
        if (debouncedSearchTerm !== filters.searchTerm) {
            onUpdateFilter('searchTerm', debouncedSearchTerm);
        }
    }, [debouncedSearchTerm, filters.searchTerm, onUpdateFilter]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && activeTab === 'search') {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, activeTab]);

    const handleSearchChange = useCallback((value: string) => {
        setSearchTerm(value);
        setShowSuggestions(value.length > 0);
    }, []);

    const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
        setSearchTerm(suggestion.title);
        setShowSuggestions(false);
        onSearchSuggestionSelect?.(suggestion);
    }, [onSearchSuggestionSelect]);

    // Show suggestions when we have results
    useEffect(() => {
        setShowSuggestions(hasResults && searchTerm.length > 0);
    }, [hasResults, searchTerm]);

    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        onUpdateFilter('searchTerm', '');
        setShowSuggestions(false);
        searchInputRef.current?.focus();
    }, [onUpdateFilter]);


    // Quick date options similar to web view
    const quickDateOptions = [
        { 
            id: 'today', 
            label: 'Today', 
            date: new Date(),
            isToday: true
        },
        { 
            id: 'tomorrow', 
            label: 'Tomorrow', 
            date: (() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow;
            })(),
            isToday: false
        },
        { 
            id: 'next-week', 
            label: 'Next Week', 
            date: (() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                return nextWeek;
            })(),
            isToday: false
        },
        { 
            id: 'next-month', 
            label: 'Next Month', 
            date: (() => {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                return nextMonth;
            })(),
            isToday: false
        },
    ];


    const formatOptions = [
        { value: 'all', label: 'All Formats', icon: 'calendar' as const },
        { value: 'virtual', label: 'Virtual', icon: 'wifi' as const },
        { value: 'in-person', label: 'In-Person', icon: 'location' as const },
        { value: 'hybrid', label: 'Hybrid', icon: 'people' as const }
    ];

    const costOptions = [
        { value: 'all', label: 'All Events' },
        { value: 'free', label: 'Free Only' },
        { value: 'paid', label: 'Paid Events' }
    ];

    const budgetOptions = [
        { value: 'all', label: 'All Budgets' },
        { value: 'free-only', label: 'Free Only' },
        { value: 'low', label: 'Low (≤ $100)' },
        { value: 'moderate', label: 'Moderate (≤ $500)' },
        { value: 'high', label: 'High (≤ $2000)' },
        { value: 'unlimited', label: 'Unlimited' }
    ];

    const difficultyOptions = [
        { value: 'all', label: 'All Levels' },
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
    ];


    const availabilityOptions = [
        { value: 'all', label: 'All Events', icon: 'event' as const },
        { value: 'available', label: 'Available', icon: 'check-circle' as const },
        { value: 'no-conflicts', label: 'No Conflicts', icon: 'check' as const }
    ];

    const popularityOptions = [
        { value: 'all', label: 'All Events', icon: 'trending-up' as const },
        { value: 'trending', label: 'Trending', icon: 'trending-up' as const },
        { value: 'high-attendance', label: 'High Attendance', icon: 'people' as const },
        { value: 'niche', label: 'Niche', icon: 'star' as const }
    ];

    const durationOptions = [
        { value: 'all', label: 'Any Duration', icon: 'time' as const },
        { value: 'short', label: 'Short (< 1 hour)', icon: 'time' as const },
        { value: 'medium', label: 'Medium (1-3 hours)', icon: 'time' as const },
        { value: 'long', label: 'Long (3+ hours)', icon: 'time' as const },
        { value: 'multi-day', label: 'Multi-day', icon: 'calendar' as const }
    ];

    // Get active filter chips
    const getActiveFilterChips = () => {
        const chips = [];
        
        if (filters.searchTerm) {
            chips.push({ key: 'search', label: `"${filters.searchTerm}"`, type: 'search' });
        }
        
        if (filters.format !== 'all') {
            const formatLabel = formatOptions.find(opt => opt.value === filters.format)?.label || filters.format;
            chips.push({ key: 'format', label: formatLabel, type: 'format' });
        }
        
        if (filters.cost !== 'all') {
            const costLabel = costOptions.find(opt => opt.value === filters.cost)?.label || filters.cost;
            chips.push({ key: 'cost', label: costLabel, type: 'cost' });
        }

        if ((filters as any).budget && (filters as any).budget !== 'all') { // eslint-disable-line @typescript-eslint/no-explicit-any
            const b = (filters as any).budget as string; // eslint-disable-line @typescript-eslint/no-explicit-any
            const label = budgetOptions.find(opt => opt.value === b)?.label || b;
            chips.push({ key: 'budget', label, type: 'budget' });
        }
        
        if (filters.difficulty !== 'all') {
            const difficultyLabel = difficultyOptions.find(opt => opt.value === filters.difficulty)?.label || filters.difficulty;
            chips.push({ key: 'difficulty', label: difficultyLabel, type: 'difficulty' });
        }
        
        
        if (filters.availability !== 'all') {
            const availabilityLabel = availabilityOptions.find(opt => opt.value === filters.availability)?.label || filters.availability;
            chips.push({ key: 'availability', label: availabilityLabel, type: 'availability' });
        }
        
        if (filters.popularity !== 'all') {
            const popularityLabel = popularityOptions.find(opt => opt.value === filters.popularity)?.label || filters.popularity;
            chips.push({ key: 'popularity', label: popularityLabel, type: 'popularity' });
        }
        
        if (filters.duration !== 'all') {
            const durationLabel = durationOptions.find(opt => opt.value === filters.duration)?.label || filters.duration;
            chips.push({ key: 'duration', label: durationLabel, type: 'duration' });
        }
        
        if (filters.myTracked) {
            chips.push({ key: 'myTracked', label: 'My Tracked', type: 'personal' });
        }
        
        if (filters.myNetwork) {
            chips.push({ key: 'myNetwork', label: 'My Network', type: 'personal' });
        }
        
        if (filters.recommended) {
            chips.push({ key: 'recommended', label: 'Recommended', type: 'personal' });
        }
        
        return chips;
    };

    const activeFilterChips = getActiveFilterChips();

    const handleRemoveFilterChip = (key: string) => {
        switch (key) {
            case 'search':
                onUpdateFilter('searchTerm', '');
                setSearchTerm('');
                break;
            case 'format':
                onUpdateFilter('format', 'all');
                break;
            case 'cost':
                onUpdateFilter('cost', 'all');
                break;
            case 'budget':
                onUpdateFilter('budget' as any, 'all' as any); // eslint-disable-line @typescript-eslint/no-explicit-any
                break;
            case 'difficulty':
                onUpdateFilter('difficulty', 'all');
                break;
            case 'availability':
                onUpdateFilter('availability', 'all');
                break;
            case 'popularity':
                onUpdateFilter('popularity', 'all');
                break;
            case 'duration':
                onUpdateFilter('duration', 'all');
                break;
            case 'myTracked':
                onUpdateFilter('myTracked', false);
                break;
            case 'myNetwork':
                onUpdateFilter('myNetwork', false);
                break;
            case 'recommended':
                onUpdateFilter('recommended', false);
                break;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="mobile-search-filter-overlay">
            <div className="mobile-search-filter-container">
                {/* Header */}
                <div className="mobile-search-filter-header">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="mobile-search-close-button"
                            aria-label="Close search and filters"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="mobile-search-title">Search & Filters</h2>
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="mobile-filter-badge">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="mobile-search-tabs">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`mobile-search-tab ${activeTab === 'search' ? 'active' : ''}`}
                    >
                        <MagnifyingGlass size={18} />
                        <span>Search</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('filters')}
                        className={`mobile-search-tab ${activeTab === 'filters' ? 'active' : ''}`}
                    >
                        <Funnel size={18} />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                            <div className="mobile-tab-badge">{activeFilterCount}</div>
                        )}
                    </button>
                </div>

                {/* Search Tab */}
                {activeTab === 'search' && (
                    <div className="mobile-search-content">
                        {/* Search Input */}
                        <div className="mobile-search-input-container">
                            <div className="mobile-search-input-wrapper">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => {
                                        setIsSearchFocused(false);
                                        setTimeout(() => setShowSuggestions(false), 200);
                                    }}
                                    placeholder="Search events, organizers, topics..."
                                    className="mobile-search-input"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={handleClearSearch}
                                        className="mobile-search-clear"
                                        aria-label="Clear search"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Search Suggestions */}
                            {showSuggestions && (
                                <div className="mobile-search-suggestions">
                                    {isSuggestionsLoading ? (
                                        <div className="mobile-search-suggestions-loading">
                                            <div className="mobile-suggestion-loading-spinner"></div>
                                            <span>Searching...</span>
                                        </div>
                                    ) : suggestions.length > 0 ? (
                                        suggestions.map((suggestion) => (
                                            <button
                                                key={suggestion.id}
                                                onClick={() => handleSuggestionSelect(suggestion)}
                                                className="mobile-search-suggestion"
                                            >
                                                {getIconComponent(
                                                    (suggestion.icon as string) || (suggestion.type === 'event' ? 'event' : suggestion.type === 'organizer' ? 'people' : 'label'), 
                                                    16
                                                )}
                                                <div className="mobile-suggestion-content">
                                                    <span className="mobile-suggestion-text">{suggestion.title}</span>
                                                    {suggestion.subtitle && (
                                                        <span className="mobile-suggestion-subtitle">{suggestion.subtitle}</span>
                                                    )}
                                                </div>
                                                <span className="mobile-suggestion-type">{suggestion.type}</span>
                                            </button>
                                        ))
                                    ) : searchTerm.length > 1 ? (
                                        <div className="mobile-search-no-results">
                                            {getIconComponent('search', 20)}
                                            <span>No results found for &quot;{searchTerm}&quot;</span>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        {/* Active Filter Chips */}
                        {activeFilterChips.length > 0 && (
                            <div className="mobile-active-filters">
                                <div className="mobile-active-filters-header">
                                    <h3 className="mobile-section-title">Active Filters</h3>
                                    <button
                                        onClick={onResetFilters}
                                        className="mobile-clear-all-filters"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                <div className="mobile-filter-chips">
                                    {activeFilterChips.map((chip) => (
                                        <div key={chip.key} className={`mobile-filter-chip mobile-filter-chip-${chip.type}`}>
                                            <span className="mobile-filter-chip-label">{chip.label}</span>
                                            <button
                                                onClick={() => handleRemoveFilterChip(chip.key)}
                                                className="mobile-filter-chip-remove"
                                                aria-label={`Remove ${chip.label} filter`}
                                            >
                                                {getIconComponent('close', 14)}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}


                        {/* Quick Date Navigation */}
                        {onDateChange && (
                            <div className="mobile-quick-date-section">
                                <h3 className="mobile-section-title">Quick Dates</h3>
                                <div className="mobile-quick-dates-grid">
                                    {quickDateOptions.map((dateOption) => (
                                        <button
                                            key={dateOption.id}
                                            onClick={() => {
                                                if (onDateChange) {
                                                    console.log('MobileSearchFilter: Quick date selected:', dateOption.label, dateOption.date);
                                                    onDateChange(dateOption.date);
                                                    onClose();
                                                }
                                            }}
                                            className={`mobile-quick-date-button ${dateOption.isToday ? 'today' : ''}`}
                                        >
                                            <span>{dateOption.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Filters Tab */}
                {activeTab === 'filters' && (
                    <div className="mobile-filters-content">
                        <div className="mobile-filters-scroll">
                            {/* Format Filter */}
                            <div className="mobile-filter-section">
                                <h3 className="mobile-section-title">Format</h3>
                                <div className="mobile-filter-options">
                                    {formatOptions.map((option) => (
                                        <label key={option.value} className="mobile-filter-option">
                                            <input
                                                type="radio"
                                                name="format"
                                                value={option.value}
                                                checked={filters.format === option.value}
                                                onChange={(e) => onUpdateFilter('format', e.target.value as SmartFilterOptions['format'])}
                                                className="mobile-filter-radio"
                                            />
                                            <div className="mobile-filter-option-content">
                                                {getIconComponent(option.icon, 16)}
                                                <span>{option.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Cost Filter */}
                            <div className="mobile-filter-section">
                                <h3 className="mobile-section-title">Cost</h3>
                                <div className="mobile-filter-options">
                                    {costOptions.map((option) => (
                                        <label key={option.value} className="mobile-filter-option">
                                            <input
                                                type="radio"
                                                name="cost"
                                                value={option.value}
                                                checked={filters.cost === option.value}
                                                onChange={(e) => onUpdateFilter('cost', e.target.value as SmartFilterOptions['cost'])}
                                                className="mobile-filter-radio"
                                            />
                                            <div className="mobile-filter-option-content">
                                                <span>{option.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Budget Filter */}
                            <div className="mobile-filter-section">
                                <h3 className="mobile-section-title">Budget</h3>
                                <div className="mobile-filter-options">
                                    {budgetOptions.map((option) => (
                                        <label key={option.value} className="mobile-filter-option">
                                            <input
                                                type="radio"
                                                name="budget"
                                                value={option.value}
                                                checked={(filters as any).budget === (option.value as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
                                                onChange={(e) => onUpdateFilter('budget' as any, e.target.value as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
                                                className="mobile-filter-radio"
                                            />
                                            <div className="mobile-filter-option-content">
                                                <span>{option.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Difficulty Filter */}
                            <div className="mobile-filter-section">
                                <h3 className="mobile-section-title">Difficulty Level</h3>
                                <div className="mobile-filter-options">
                                    {difficultyOptions.map((option) => (
                                        <label key={option.value} className="mobile-filter-option">
                                            <input
                                                type="radio"
                                                name="difficulty"
                                                value={option.value}
                                                checked={filters.difficulty === option.value}
                                                onChange={(e) => onUpdateFilter('difficulty', e.target.value as SmartFilterOptions['difficulty'])}
                                                className="mobile-filter-radio"
                                            />
                                            <div className="mobile-filter-option-content">
                                                <span>{option.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>


                            {/* Availability Filter */}
                            <div className="mobile-filter-section">
                                <h3 className="mobile-section-title">Availability</h3>
                                <div className="mobile-filter-options">
                                    {availabilityOptions.map((option) => (
                                        <label key={option.value} className="mobile-filter-option">
                                            <input
                                                type="radio"
                                                name="availability"
                                                value={option.value}
                                                checked={filters.availability === option.value}
                                                onChange={(e) => onUpdateFilter('availability', e.target.value as SmartFilterOptions['availability'])}
                                                className="mobile-filter-radio"
                                            />
                                            <div className="mobile-filter-option-content">
                                                {getIconComponent(option.icon, 16)}
                                                <span>{option.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Popularity Filter */}
                            <div className="mobile-filter-section">
                                <h3 className="mobile-section-title">Popularity</h3>
                                <div className="mobile-filter-options">
                                    {popularityOptions.map((option) => (
                                        <label key={option.value} className="mobile-filter-option">
                                            <input
                                                type="radio"
                                                name="popularity"
                                                value={option.value}
                                                checked={filters.popularity === option.value}
                                                onChange={(e) => onUpdateFilter('popularity', e.target.value as SmartFilterOptions['popularity'])}
                                                className="mobile-filter-radio"
                                            />
                                            <div className="mobile-filter-option-content">
                                                {getIconComponent(option.icon, 16)}
                                                <span>{option.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Duration Filter */}
                            <div className="mobile-filter-section">
                                <h3 className="mobile-section-title">Duration</h3>
                                <div className="mobile-filter-options">
                                    {durationOptions.map((option) => (
                                        <label key={option.value} className="mobile-filter-option">
                                            <input
                                                type="radio"
                                                name="duration"
                                                value={option.value}
                                                checked={filters.duration === option.value}
                                                onChange={(e) => onUpdateFilter('duration', e.target.value as SmartFilterOptions['duration'])}
                                                className="mobile-filter-radio"
                                            />
                                            <div className="mobile-filter-option-content">
                                                {getIconComponent(option.icon, 16)}
                                                <span>{option.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sort Options */}
                            <div className="mobile-filter-section">
                                <h3 className="mobile-section-title">Sort By</h3>
                                <div className="mobile-filter-options">
                                    {[
                                        { value: 'default', label: 'Default', icon: 'calendar' },
                                        { value: 'date', label: 'Date', icon: 'time' },
                                        { value: 'popularity', label: 'Popularity', icon: 'trending-up' },
                                        { value: 'career-impact', label: 'Career Impact', icon: 'target' }
                                    ].map((option) => (
                                        <label key={option.value} className="mobile-filter-option">
                                            <input
                                                type="radio"
                                                name="sortBy"
                                                value={option.value}
                                                checked={filters.sortBy === option.value}
                                                onChange={(e) => onUpdateFilter('sortBy', e.target.value as SmartFilterOptions['sortBy'])}
                                                className="mobile-filter-radio"
                                            />
                                            <div className="mobile-filter-option-content">
                                                {getIconComponent(option.icon, 16)}
                                                <span>{option.label}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Personal Filters */}
                            <div className="mobile-filter-section">
                                <h3 className="mobile-section-title">Personal</h3>
                                <div className="mobile-filter-options">
                                    <label className="mobile-filter-option">
                                        <input
                                            type="checkbox"
                                            checked={filters.myTracked}
                                            onChange={(e) => onUpdateFilter('myTracked', e.target.checked)}
                                            className="mobile-filter-checkbox"
                                        />
                                        <div className="mobile-filter-option-content">
                                            {getIconComponent('star', 16)}
                                            <span>My Favorites</span>
                                        </div>
                                    </label>
                                    <label className="mobile-filter-option">
                                        <input
                                            type="checkbox"
                                            checked={filters.myNetwork}
                                            onChange={(e) => onUpdateFilter('myNetwork', e.target.checked)}
                                            className="mobile-filter-checkbox"
                                        />
                                        <div className="mobile-filter-option-content">
                                            {getIconComponent('people', 16)}
                                            <span>My Network</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Filter Actions */}
                        <div className="mobile-filter-actions">
                            {activeFilterCount > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={onResetFilters}
                                    className="mobile-reset-button"
                                >
                                    {getIconComponent('refresh', 16)}
                                    Reset All Filters
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default MobileSearchFilter;
