'use client';

import React from 'react';
import { MagnifyingGlass, MapPin, Calendar, Funnel } from '@phosphor-icons/react';

interface MobileDiscoverySearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  activeFilterCount: number;
  onFilterClick: () => void;
}

const MobileDiscoverySearchBar: React.FC<MobileDiscoverySearchBarProps> = ({
  searchTerm,
  onSearchChange,
  location,
  onLocationChange,
  dateRange,
  onDateRangeChange: _onDateRangeChange,
  activeFilterCount,
  onFilterClick
}) => {

  return (
    <div className="bg-card/80 dark:bg-card/20 rounded-2xl p-3 shadow-lg border border-border/60 backdrop-blur mb-4">
      {/* Search Input */}
      <div className="relative mb-2">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          <MagnifyingGlass size={18} />
        </div>
        <input
          type="text"
          placeholder="Search events..."
          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-transparent bg-muted/60 dark:bg-muted/20 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-background/40 transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Location & Date Row */}
      <div className="flex gap-2 mb-2">
        {/* Location Input */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            <MapPin size={16} />
          </div>
          <input
            type="text"
            placeholder="Location"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-transparent bg-muted/60 dark:bg-muted/20 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-background/40 transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
          />
        </div>

        {/* Date Picker Button - opens filter modal */}
        <button
          type="button"
          onClick={onFilterClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-transparent bg-muted/60 dark:bg-muted/20 text-sm text-foreground whitespace-nowrap"
        >
          <Calendar size={16} className="text-muted-foreground" />
          {dateRange.start || dateRange.end ? (
            <span className="text-xs">
              {dateRange.start && new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {dateRange.start && dateRange.end && ' - '}
              {dateRange.end && new Date(dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Dates</span>
          )}
        </button>
      </div>

      {/* Filter Button */}
      <button
        onClick={onFilterClick}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary font-medium text-sm transition-all active:scale-95"
      >
        <Funnel size={16} />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default MobileDiscoverySearchBar;
