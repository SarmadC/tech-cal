'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, CaretDown, X } from '@phosphor-icons/react';
import { normalizeForComparison, validateSkillEntry } from '@/utils/skillSuggestions';

export interface MultiSelectOption {
  value: string;
  label: string;
  category?: string;
  keywords?: string[];
}

export interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  description?: string;
  maxSelections?: number;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
  suggestions?: string[];
  suggestionLabel?: string;
  allowCustom?: boolean;
  onDuplicateAttempt?: (value: string) => void;
}

export default function MultiSelectDropdown({
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options...',
  label,
  description,
  maxSelections,
  searchable = true,
  className = '',
  disabled = false,
  suggestions,
  suggestionLabel,
  allowCustom = false,
  onDuplicateAttempt
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllChips, setShowAllChips] = useState(false);
  const [liveRegionMessage, setLiveRegionMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  
  const maxVisibleChips = 3;

  // Group options by category if they have one
  const groupedOptions = options.reduce((acc, option) => {
    const category = option.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(option);
    return acc;
  }, {} as Record<string, MultiSelectOption[]>);

  // Filter options based on search term
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchesSearch = (option: MultiSelectOption) => {
    if (!normalizedSearch) return true;
    const haystack = [
      option.label.toLowerCase(),
      option.value.toLowerCase(),
      ...(option.keywords?.map(keyword => keyword.toLowerCase()) ?? [])
    ];
    return haystack.some(entry => entry.includes(normalizedSearch));
  };

  const filteredOptions = Object.entries(groupedOptions).map(([category, categoryOptions]) => [
    category,
    categoryOptions.filter(matchesSearch)
  ]).filter(([, categoryOptions]) => categoryOptions.length > 0);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen && searchable) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  };

  const handleSelect = (value: string) => {
    if (disabled) return;
    
    // Check for duplicate
    if (selectedValues.map(normalizeForComparison).includes(normalizeForComparison(value))) {
      if (onDuplicateAttempt) {
        onDuplicateAttempt(value);
      }
      return;
    }
    
    const isSelected = selectedValues.includes(value);
    let newValues: string[];

    if (isSelected) {
      newValues = selectedValues.filter(v => v !== value);
    } else {
      if (maxSelections && selectedValues.length >= maxSelections) {
        return; // Don't add if max selections reached
      }
      newValues = [...selectedValues, value];
      
      // Announce addition
      const option = options.find(opt => opt.value === value);
      const label = option?.label || value;
      setLiveRegionMessage(`${label} added`);
      setTimeout(() => setLiveRegionMessage(''), 1000);
    }

    onChange(newValues);
  };

  const handleRemove = (value: string) => {
    if (disabled) return;
    
    // Announce removal
    const option = options.find(opt => opt.value === value);
    const label = option?.label || value;
    setLiveRegionMessage(`${label} removed`);
    setTimeout(() => setLiveRegionMessage(''), 1000);
    
    onChange(selectedValues.filter(v => v !== value));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const getLabel = (value: string) => {
    const option = options.find(opt => opt.value === value);
    return option?.label || value;
  };
  
  const handleShowMore = () => {
    setShowAllChips(true);
    setLiveRegionMessage(`Showing all ${selectedValues.length} selected items`);
    setTimeout(() => setLiveRegionMessage(''), 1000);
  };
  
  const handleCustomEntry = () => {
    const validation = validateSkillEntry(searchTerm);
    
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid entry');
      return;
    }
    
    if (!validation.normalized) return;
    
    // Check for duplicate
    if (selectedValues.map(normalizeForComparison).includes(normalizeForComparison(validation.normalized))) {
      if (onDuplicateAttempt) {
        onDuplicateAttempt(validation.normalized);
      }
      return;
    }
    
    handleSelect(validation.normalized);
    setSearchTerm('');
    setValidationError('');
  };
  
  // Filter suggestions to exclude already-selected
  const filteredSuggestions = suggestions?.filter(
    s => !selectedValues.map(normalizeForComparison).includes(normalizeForComparison(s))
  ).slice(0, 7) || [];

  // Chips to display (with overflow logic)
  const chipsToShow = showAllChips ? selectedValues : selectedValues.slice(0, maxVisibleChips);
  const hasOverflow = selectedValues.length > maxVisibleChips;

  // Get all options for keyboard navigation
  const getAllOptions = () => {
    const all: MultiSelectOption[] = [];
    filteredOptions.forEach(([, categoryOptions]) => {
      if (Array.isArray(categoryOptions)) {
        all.push(...categoryOptions);
      }
    });
    return all;
  };

  const handleKeyDownInListbox = (e: React.KeyboardEvent, value: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(value);
      setFocusedIndex(-1);
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && listboxRef.current) {
      const focusedElement = listboxRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      focusedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label}
        </label>
      )}
      
      {/* Suggestion chips */}
      {filteredSuggestions.length > 0 && (
        <div className="space-y-2 mb-3">
          {suggestionLabel && (
            <h3 id={`${label}-suggestions`} className="text-xs font-medium opacity-70 uppercase tracking-wide sr-only">
              {suggestionLabel}
            </h3>
          )}
          <div role="group" aria-labelledby={suggestionLabel ? `${label}-suggestions` : undefined} aria-label={suggestionLabel ? undefined : 'Suggested items'} className="flex flex-wrap gap-2">
            {filteredSuggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSelect(suggestion)}
                disabled={disabled}
                className="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors duration-200 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--foreground-primary)',
                  boxShadow: 'var(--shadow-xs)'
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.color = 'var(--accent-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.color = 'var(--foreground-primary)';
                  }
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Selected chips display (above dropdown) */}
      {selectedValues.length > 0 && (
        <div className="space-y-2 mb-3">
          <div className={`flex flex-wrap gap-2 transition-all duration-300 ease-in-out ${showAllChips ? '' : 'max-h-[88px] overflow-hidden'}`} role="list" aria-label="Selected items">
            {chipsToShow.map((value) => (
              <span
                key={value}
                role="listitem"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--success-light)',
                  borderColor: 'var(--success)',
                  color: 'var(--success)',
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                <span>{getLabel(value)}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(value)}
                    aria-label={`Remove ${getLabel(value)}`}
                    className="flex items-center justify-center w-5 h-5 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors"
                    style={{ 
                      backgroundColor: 'rgba(34, 197, 94, 0.2)',
                      color: 'var(--success)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'}
                  >
                    <X size={14} weight="bold" />
                  </button>
                )}
              </span>
            ))}
            
            {hasOverflow && !showAllChips && (
              <button
                type="button"
                onClick={handleShowMore}
                aria-expanded="false"
                aria-label={`Show ${selectedValues.length - maxVisibleChips} more items`}
                className="px-3 py-1.5 text-sm rounded-lg min-h-[44px] transition-colors"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
              >
                +{selectedValues.length - maxVisibleChips} more
              </button>
            )}
            
            {hasOverflow && showAllChips && (
              <button
                type="button"
                onClick={() => setShowAllChips(false)}
                aria-expanded="true"
                aria-label="Show fewer items"
                className="px-3 py-1.5 text-sm rounded-lg min-h-[44px] transition-colors"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* ARIA live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveRegionMessage}
      </div>
      
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="multiselect-listbox"
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-activedescendant={focusedIndex >= 0 ? `option-${focusedIndex}` : undefined}
        aria-label={label || placeholder}
        aria-describedby={description ? `${label}-description` : undefined}
        tabIndex={disabled ? -1 : 0}
        className="relative w-full px-4 py-2 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1"
        style={{
          borderColor: 'var(--border-default)',
          borderWidth: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          ...(isOpen && { borderColor: 'var(--accent-primary)' })
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = 'var(--border-default)';
          }
        }}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
            setFocusedIndex(0);
          } else if (e.key === 'Escape' && isOpen) {
            setIsOpen(false);
            setSearchTerm('');
            setFocusedIndex(-1);
          } else if (e.key === 'ArrowDown' && isOpen) {
            e.preventDefault();
            setFocusedIndex(prev => Math.min(prev + 1, getAllOptions().length - 1));
          } else if (e.key === 'ArrowUp' && isOpen) {
            e.preventDefault();
            setFocusedIndex(prev => Math.max(prev - 1, 0));
          }
        }}
      >
        <div className="flex items-center justify-between">
          <span className="opacity-80">
            {selectedValues.length === 0 ? placeholder : `${selectedValues.length} selected`}
          </span>
          <CaretDown 
            size={16} 
            className={`transition-transform opacity-60 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div 
          id="multiselect-listbox"
          ref={listboxRef}
          role="listbox"
          aria-label={`${label || 'Options'} selection`}
          className="absolute z-50 w-full mt-1 rounded-lg max-h-60 overflow-hidden glass-card"
          style={{ backdropFilter: 'blur(24px)' }}
        >
          {searchable && (
            <div className="p-2" style={{ borderBottomColor: 'var(--border-default)', borderBottomWidth: '1px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !searchTerm && selectedValues.length > 0) {
                    e.preventDefault();
                    handleRemove(selectedValues[selectedValues.length - 1]);
                  }
                }}
                className="w-full px-3 py-2 text-sm rounded focus:outline-none focus:ring-1 focus:ring-white"
                style={{ borderColor: 'var(--border-default)', borderWidth: '1px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                aria-label="Search options"
              />
            </div>
          )}
          
          <div className="max-h-48 overflow-y-auto" role="group">
            {filteredOptions.length === 0 ? (
              <>
                {allowCustom && searchTerm.trim() ? (
                  <div
                    role="option"
                    aria-selected={false}
                    tabIndex={-1}
                    className="px-4 py-2 text-sm cursor-pointer transition-colors"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                    onClick={handleCustomEntry}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCustomEntry();
                      }
                    }}
                  >
                    Create &quot;{searchTerm.trim()}&quot;
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-center opacity-70">
                    No options found
                  </div>
                )}
                {validationError && (
                  <div className="px-4 py-2 text-sm" style={{ color: 'var(--error)', backgroundColor: 'var(--error-light)', borderTopColor: 'var(--error)', borderTopWidth: '1px' }}>
                    {validationError}
                  </div>
                )}
              </>
            ) : (
              filteredOptions.map(([category, categoryOptions]) => (
                <div key={typeof category === 'string' ? category : 'other'}>
                  {typeof category === 'string' && category !== 'Other' && (
                    <div className="px-4 py-2 text-xs font-semibold sticky top-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottomColor: 'var(--border-default)', borderBottomWidth: '1px', opacity: 0.6 }}>
                      {category}
                    </div>
                  )}
                  {Array.isArray(categoryOptions) && categoryOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    const isDisabled = maxSelections && selectedValues.length >= maxSelections && !isSelected;
                    const globalIndex = getAllOptions().findIndex(opt => opt.value === option.value);
                    const isFocused = globalIndex === focusedIndex;
                    
                    return (
                      <div
                        key={option.value}
                        data-index={globalIndex}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={-1}
                        className="px-4 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors focus:outline-none"
                        style={{
                          backgroundColor: (isSelected || isFocused) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                          color: isSelected ? 'var(--accent-primary)' : undefined,
                          ...(isFocused && { outline: '2px solid', outlineColor: 'var(--accent-primary)', outlineOffset: '-2px' })
                        }}
                        onMouseEnter={(e) => {
                          if (!isDisabled && !isSelected && !isFocused) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDisabled && !isSelected && !isFocused) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        onClick={() => !isDisabled && handleSelect(option.value)}
                        onKeyDown={(e) => handleKeyDownInListbox(e, option.value)}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check size={16} style={{ color: 'var(--accent-primary)' }} />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          
          {maxSelections && (
            <div className="px-4 py-2 text-xs opacity-70" style={{ borderTopColor: 'var(--border-default)', borderTopWidth: '1px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              {selectedValues.length} of {maxSelections} selected
            </div>
          )}
        </div>
      )}

      {description && (
        <p id={`${label}-description`} className="text-xs opacity-70 mt-1">{description}</p>
      )}
    </div>
  );
}
