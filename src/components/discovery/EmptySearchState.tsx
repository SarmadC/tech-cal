'use client';

import React from 'react';
import { MagnifyingGlass, MapPin, Calendar, Funnel } from '@phosphor-icons/react';

interface EmptySearchStateProps {
  searchTerm?: string;
  location?: string;
  hasDateRange?: boolean;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  onViewAll?: () => void;
}

const EmptySearchState: React.FC<EmptySearchStateProps> = ({
  searchTerm,
  location,
  hasDateRange,
  activeFilterCount = 0,
  onClearFilters,
  onViewAll
}) => {
  // Determine suggestions based on what filters are active
  const suggestions: { icon: React.ReactNode; text: string; action?: () => void }[] = [];

  if (location) {
    suggestions.push({
      icon: <MapPin size={20} />,
      text: 'Try expanding your location search'
    });
  }

  if (hasDateRange) {
    suggestions.push({
      icon: <Calendar size={20} />,
      text: 'Try a wider date range'
    });
  }

  if (activeFilterCount > 2) {
    suggestions.push({
      icon: <Funnel size={20} />,
      text: 'Try removing some filters',
      action: onClearFilters
    });
  }

  if (searchTerm) {
    suggestions.push({
      icon: <MagnifyingGlass size={20} />,
      text: 'Try different keywords or check spelling'
    });
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-muted/60 dark:bg-muted/20 flex items-center justify-center mb-6">
        <MagnifyingGlass size={40} className="text-muted-foreground" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No events found
      </h3>

      {/* Description */}
      <p className="text-muted-foreground mb-6 max-w-md">
        {searchTerm || location ? (
          <>
            We couldn't find any events matching{' '}
            {searchTerm && <span className="font-medium text-foreground">"{searchTerm}"</span>}
            {searchTerm && location && ' '}
            {location && <span className="font-medium text-foreground">in {location}</span>}
          </>
        ) : (
          'We couldn\'t find any events matching your search criteria'
        )}
      </p>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="w-full max-w-md mb-6">
          <p className="text-sm font-medium text-foreground mb-3">Try this:</p>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 dark:bg-muted/10 text-left"
              >
                <div className="flex-shrink-0 text-muted-foreground">
                  {suggestion.icon}
                </div>
                <p className="text-sm text-foreground flex-1">{suggestion.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-6 py-2.5 rounded-xl border border-border bg-background hover:bg-muted/60 text-foreground font-medium transition-colors"
          >
            Clear filters
          </button>
        )}
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors shadow-lg shadow-primary/20"
          >
            View all events
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptySearchState;
