'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from './useDebounce';

export interface SearchSuggestion {
    id: string;
    title: string;
    type: 'event' | 'organizer' | 'category';
    subtitle?: string;
    icon?: string;
    careerScore?: number;
}

export interface UseSearchSuggestionsProps {
    searchTerm: string;
    events: Array<{ id: string; title: string; organizer: string; eventTypeId: string }>;
    categories: Array<{ id: string; name: string }>;
    maxSuggestions?: number;
    debounceMs?: number;
}

export function useSearchSuggestions({
    searchTerm,
    events,
    categories,
    maxSuggestions = 5,
    debounceMs = 300
}: UseSearchSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

    useEffect(() => {
        if (debouncedSearchTerm && debouncedSearchTerm.length >= 2) {
            setIsLoading(true);
            
            // Simulate API delay for better UX
            const timer = setTimeout(() => {
                const term = debouncedSearchTerm.toLowerCase();
                const suggestions: SearchSuggestion[] = [];

                // Event suggestions with career impact ranking
                const eventMatches = events
                    .filter(event => 
                        event.title.toLowerCase().includes(term) ||
                        event.organizer.toLowerCase().includes(term)
                    )
                    .sort((a, b) => {
                        // Sort by career impact if available, otherwise by relevance
                        const aCareerScore = (a as { careerImpactLite?: { overall: number } }).careerImpactLite?.overall || 0;
                        const bCareerScore = (b as { careerImpactLite?: { overall: number } }).careerImpactLite?.overall || 0;
                        
                        if (aCareerScore !== bCareerScore) {
                            return bCareerScore - aCareerScore; // Higher career impact first
                        }
                        
                        // Fallback to title relevance (exact matches first)
                        const aExactMatch = a.title.toLowerCase() === term;
                        const bExactMatch = b.title.toLowerCase() === term;
                        if (aExactMatch && !bExactMatch) return -1;
                        if (!aExactMatch && bExactMatch) return 1;
                        
                        // Then by start of title
                        const aStartsWithTerm = a.title.toLowerCase().startsWith(term);
                        const bStartsWithTerm = b.title.toLowerCase().startsWith(term);
                        if (aStartsWithTerm && !bStartsWithTerm) return -1;
                        if (!aStartsWithTerm && bStartsWithTerm) return 1;
                        
                        return 0;
                    })
                    .slice(0, Math.ceil(maxSuggestions / 2))
                    .map(event => ({
                        id: `event-${event.id}`,
                        title: event.title,
                        type: 'event' as const,
                        subtitle: event.organizer,
                        icon: 'event',
                        careerScore: (event as { careerImpactLite?: { overall: number } }).careerImpactLite?.overall
                    }));

                suggestions.push(...eventMatches);

                // Organizer suggestions
                const organizerMatches = events
                    .filter(event => event.organizer.toLowerCase().includes(term))
                    .map(event => event.organizer)
                    .filter((organizer, index, self) => self.indexOf(organizer) === index)
                    .slice(0, Math.ceil(maxSuggestions / 4))
                    .map(organizer => ({
                        id: `organizer-${organizer}`,
                        title: organizer,
                        type: 'organizer' as const,
                        subtitle: 'Organizer',
                        icon: 'people'
                    }));

                suggestions.push(...organizerMatches);

                // Category suggestions
                const categoryMatches = categories
                    .filter(category => category.name.toLowerCase().includes(term))
                    .slice(0, Math.ceil(maxSuggestions / 4))
                    .map(category => ({
                        id: `category-${category.id}`,
                        title: category.name,
                        type: 'category' as const,
                        subtitle: 'Category',
                        icon: 'category'
                    }));

                suggestions.push(...categoryMatches);

                // Remove duplicates and limit results
                const uniqueSuggestions = suggestions
                    .filter((suggestion, index, self) => 
                        self.findIndex(s => s.title === suggestion.title) === index
                    )
                    .slice(0, maxSuggestions);

                setSuggestions(uniqueSuggestions);
                setIsLoading(false);
            }, 100);

            return () => clearTimeout(timer);
        } else {
            setSuggestions([]);
            setIsLoading(false);
        }
    }, [debouncedSearchTerm]); // Only depend on debouncedSearchTerm to prevent infinite re-renders
    // Note: events, categories, and maxSuggestions are intentionally excluded from dependencies
    // to prevent infinite re-renders when these arrays are recreated on every render

    return {
        suggestions,
        isLoading,
        hasResults: suggestions.length > 0,
        searchTerm: debouncedSearchTerm
    };
}
