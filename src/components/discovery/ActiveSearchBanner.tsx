'use client';

import React from 'react';
import { X, MagnifyingGlass } from '@phosphor-icons/react';

interface ActiveSearchBannerProps {
  searchTerm?: string;
  location?: string;
  dateRange?: { start: Date | null; end: Date | null };
  expandedTerms?: string[];
  resultCount?: number;
  activeFilterCount?: number;
  onDismiss?: () => void;
  onClear?: () => void;
}

const MAX_VISIBLE_EXPANDED_TERMS = 3; // Show up to N expanded terms before "+X more"

const ActiveSearchBanner: React.FC<ActiveSearchBannerProps> = ({
  searchTerm,
  location,
  dateRange,
  expandedTerms,
  resultCount,
  activeFilterCount,
  onDismiss,
  onClear
}) => {
  // Only show if there's an active search
  const hasSearch = searchTerm || location || dateRange?.start || dateRange?.end;

  if (!hasSearch) return null;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const buildSearchDescription = () => {
    const parts: string[] = [];

    if (searchTerm) {
      parts.push(`"${searchTerm}"`);
    }

    if (location) {
      parts.push(`in ${location}`);
    }

    if (dateRange?.start && dateRange?.end) {
      parts.push(`${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`);
    } else if (dateRange?.start) {
      parts.push(`from ${formatDate(dateRange.start)}`);
    } else if (dateRange?.end) {
      parts.push(`until ${formatDate(dateRange.end)}`);
    }

    return parts.join(' ');
  };

  const description = buildSearchDescription();

  return (
    <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-xl p-4 mb-6 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <MagnifyingGlass size={20} className="text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Active Search
              </h3>
              {activeFilterCount !== undefined && activeFilterCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  +{activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
                </span>
              )}
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-background/60 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Dismiss banner"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <p className="text-sm text-foreground/80 mb-2">
            {resultCount !== undefined ? (
              <>
                Showing <span className="font-semibold text-primary">{resultCount}</span>{' '}
                {resultCount === 1 ? 'event' : 'events'}
                {description && (
                  <>
                    {' '}for <span className="font-medium">{description}</span>
                  </>
                )}
              </>
            ) : (
              <>
                Searching for <span className="font-medium">{description}</span>
              </>
            )}
          </p>

          {/* Expanded terms hint */}
          {expandedTerms && expandedTerms.length > 1 && (
            <div className="text-xs text-muted-foreground">
              Also searching: {expandedTerms.slice(1, MAX_VISIBLE_EXPANDED_TERMS + 1).join(', ')}
              {expandedTerms.length > MAX_VISIBLE_EXPANDED_TERMS + 1 &&
                ` +${expandedTerms.length - MAX_VISIBLE_EXPANDED_TERMS - 1} more`}
            </div>
          )}

          {/* Clear button */}
          {onClear && (
            <button
              onClick={onClear}
              className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveSearchBanner;
