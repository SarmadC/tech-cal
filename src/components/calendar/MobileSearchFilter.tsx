'use client';

import { FC, useState, useRef, useEffect, useCallback } from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartFilterOptions } from '@/hooks/useSmartFilters';
import { useDebounce } from '@/hooks/useDebounce';

export interface MobileSearchFilterProps {
    filters: SmartFilterOptions;
    onUpdateFilter: <K extends keyof SmartFilterOptions>(key: K, value: SmartFilterOptions[K]) => void;
    onResetFilters: () => void;
    onApplyQuickFilter: (filterType: string) => void;
    activeFilterCount: number;
    isOpen: boolean;
    onClose: () => void;
    searchSuggestions?: Array<{ id: string; title: string; type: 'event' | 'organizer' | 'category' }>;
    onSearchSuggestionSelect?: (suggestion: { id: string; title: string; type: 'event' | 'organizer' | 'category' }) => void;
}

const MobileSearchFilter: FC<MobileSearchFilterProps> = ({
    filters,
    onUpdateFilter,
    onResetFilters,
    onApplyQuickFilter,
    activeFilterCount,
    isOpen,
    onClose,
    searchSuggestions = [],
    onSearchSuggestionSelect
}) => {
    const [searchTerm, setSearchTerm] = useState(filters.searchTerm);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeTab, setActiveTab] = useState<'search' | 'filters'>('search');
    const [_isSearchFocused, setIsSearchFocused] = useState(false);
    
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

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

    const handleSuggestionSelect = useCallback((suggestion: { id: string; title: string; type: 'event' | 'organizer' | 'category' }) => {
        setSearchTerm(suggestion.title);
        setShowSuggestions(false);
        onSearchSuggestionSelect?.(suggestion);
    }, [onSearchSuggestionSelect]);

    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        onUpdateFilter('searchTerm', '');
        setShowSuggestions(false);
        searchInputRef.current?.focus();
    }, [onUpdateFilter]);

    const quickFilters = [
        { id: 'this-week', label: 'This Week', icon: 'calendar' as const, color: 'blue' },
        { id: 'free-events', label: 'Free Events', icon: 'money' as const, color: 'green' },
        { id: 'virtual-only', label: 'Virtual', icon: 'wifi' as const, color: 'purple' },
        { id: 'trending', label: 'Trending', icon: 'trending-up' as const, color: 'orange' },
        { id: 'my-level', label: 'My Level', icon: 'star' as const, color: 'yellow' },
        { id: 'no-conflicts', label: 'No Conflicts', icon: 'check-circle' as const, color: 'emerald' },
    ];

    const formatOptions = [
        { value: 'all', label: 'All Formats', icon: 'calendar' as const },
        { value: 'virtual', label: 'Virtual', icon: 'wifi' as const },
        { value: 'in-person', label: 'In-Person', icon: 'people' as const },
        { value: 'hybrid', label: 'Hybrid', icon: 'star' as const }
    ];

    const costOptions = [
        { value: 'all', label: 'All Events' },
        { value: 'free', label: 'Free Only' },
        { value: 'paid', label: 'Paid Events' }
    ];

    const difficultyOptions = [
        { value: 'all', label: 'All Levels' },
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
    ];

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
                            <MaterialIcon name="close" size={20} />
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
                        <MaterialIcon name="search" size={18} />
                        <span>Search</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('filters')}
                        className={`mobile-search-tab ${activeTab === 'filters' ? 'active' : ''}`}
                    >
                        <MaterialIcon name="filter" size={18} />
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
                                <MaterialIcon name="search" size={20} className="mobile-search-icon" />
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
                                        <MaterialIcon name="close" size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Search Suggestions */}
                            {showSuggestions && searchSuggestions.length > 0 && (
                                <div className="mobile-search-suggestions">
                                    {searchSuggestions.map((suggestion) => (
                                        <button
                                            key={suggestion.id}
                                            onClick={() => handleSuggestionSelect(suggestion)}
                                            className="mobile-search-suggestion"
                                        >
                                            <MaterialIcon 
                                                name={suggestion.type === 'event' ? 'event' : suggestion.type === 'organizer' ? 'people' : 'label'} 
                                                size={16} 
                                            />
                                            <span className="mobile-suggestion-text">{suggestion.title}</span>
                                            <span className="mobile-suggestion-type">{suggestion.type}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Search Filters */}
                        <div className="mobile-quick-search-filters">
                            <h3 className="mobile-section-title">Quick Search</h3>
                            <div className="mobile-quick-filters-grid">
                                {quickFilters.map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => onApplyQuickFilter(filter.id)}
                                        className={`mobile-quick-filter mobile-quick-filter-${filter.color}`}
                                    >
                                        <MaterialIcon name={filter.icon} size={16} />
                                        <span>{filter.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
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
                                                <MaterialIcon name={option.icon} size={16} />
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
                                            <MaterialIcon name="star" size={16} />
                                            <span>My Tracked Events</span>
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
                                            <MaterialIcon name="people" size={16} />
                                            <span>My Network is Attending</span>
                                        </div>
                                    </label>
                                    <label className="mobile-filter-option">
                                        <input
                                            type="checkbox"
                                            checked={filters.recommended}
                                            onChange={(e) => onUpdateFilter('recommended', e.target.checked)}
                                            className="mobile-filter-checkbox"
                                        />
                                        <div className="mobile-filter-option-content">
                                            <MaterialIcon name="star" size={16} />
                                            <span>Recommended for Me</span>
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
                                    <MaterialIcon name="refresh" size={16} />
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
