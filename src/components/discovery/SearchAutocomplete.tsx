'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, Calendar, Users, Folder, Tag as TagIcon, Clock } from '@phosphor-icons/react';
import type { SearchSuggestion } from '@/types';
import type { SearchHistoryItem } from '@/hooks/useSearchHistory';

interface SearchAutocompleteProps {
  suggestions: SearchSuggestion[];
  history?: SearchHistoryItem[];
  isLoading?: boolean;
  isOpen: boolean;
  onSelect: (suggestion: SearchSuggestion | SearchHistoryItem) => void;
  onClose: () => void;
  maxHeight?: number;
}

const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  suggestions,
  history = [],
  isLoading,
  isOpen,
  onSelect,
  onClose,
  maxHeight = 400
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const totalItems = suggestions.length + history.length;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex < history.length) {
            onSelect(history[selectedIndex]);
          } else {
            onSelect(suggestions[selectedIndex - history.length]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, suggestions, history, onSelect, onClose]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions, history]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <Calendar size={18} className="text-primary" />;
      case 'organizer':
        return <Users size={18} className="text-blue-500" />;
      case 'category':
        return <Folder size={18} className="text-purple-500" />;
      case 'tag':
        return <TagIcon size={18} className="text-green-500" />;
      case 'history':
        return <Clock size={18} className="text-muted-foreground" />;
      default:
        return <MagnifyingGlass size={18} className="text-muted-foreground" />;
    }
  };

  const hasContent = history.length > 0 || suggestions.length > 0;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-card/95 dark:bg-card/90 backdrop-blur-xl rounded-xl border border-border/60 shadow-2xl overflow-hidden z-[101] animate-in slide-in-from-top-2 duration-200"
      style={{ maxHeight }}
    >
      {isLoading ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Searching...</span>
          </div>
        </div>
      ) : hasContent ? (
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {/* Search History */}
          {history.length > 0 && (
            <div className="border-b border-border/40">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Searches
              </div>
              {history.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/60 transition-colors text-left ${
                      isSelected ? 'bg-muted/80' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">{getIcon('history')}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.term || 'Search'}
                        {item.location && (
                          <span className="text-muted-foreground"> in {item.location}</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              {history.length > 0 && (
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Suggestions
                </div>
              )}
              {suggestions.map((suggestion, index) => {
                const actualIndex = index + history.length;
                const isSelected = actualIndex === selectedIndex;

                return (
                  <button
                    key={suggestion.id}
                    onClick={() => onSelect(suggestion)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/60 transition-colors text-left ${
                      isSelected ? 'bg-muted/80' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">{getIcon(suggestion.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {suggestion.title}
                      </p>
                      {suggestion.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {suggestion.subtitle}
                        </p>
                      )}
                    </div>
                    {suggestion.careerScore !== undefined && (
                      <div className="flex-shrink-0">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {Math.round(suggestion.careerScore * 100)}% match
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No suggestions available
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
