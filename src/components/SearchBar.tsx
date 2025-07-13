'use client';

import { useRef, useEffect, useState } from 'react';

type Suggestion = { 
  id: string; 
  title: string; 
  start_time: string; 
  organizer: string; 
};

interface SearchBarProps { 
  searchTerm: string; 
  onSearchChange: (term: string) => void; 
  suggestions: Suggestion[]; 
  onSuggestionClick: (suggestion: Suggestion) => void; 
}

export default function SearchBar({ 
  searchTerm, 
  onSearchChange, 
  suggestions, 
  onSuggestionClick 
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showSuggestions = isFocused && searchTerm.length > 0 && suggestions.length > 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="relative" ref={searchContainerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search events, organizers..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="w-full bg-background-main border border-border-color rounded-lg py-2.5 pl-10 pr-4 text-sm text-foreground-primary placeholder-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute z-50 w-full mt-2 bg-background-main border border-border-color rounded-lg shadow-lg overflow-hidden">
          <div className="py-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => onSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-background-secondary transition-colors flex items-start space-x-3"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-accent-primary-light rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground-primary truncate">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-foreground-tertiary mt-0.5">
                    {suggestion.organizer} • {formatDate(suggestion.start_time)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}