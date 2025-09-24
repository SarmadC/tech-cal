'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, CaretDown, X } from '@phosphor-icons/react';

export interface MultiSelectOption {
  value: string;
  label: string;
  category?: string;
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
  disabled = false
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
  const filteredOptions = Object.entries(groupedOptions).map(([category, categoryOptions]) => [
    category,
    categoryOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
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
    
    const isSelected = selectedValues.includes(value);
    let newValues: string[];

    if (isSelected) {
      newValues = selectedValues.filter(v => v !== value);
    } else {
      if (maxSelections && selectedValues.length >= maxSelections) {
        return; // Don't add if max selections reached
      }
      newValues = [...selectedValues, value];
    }

    onChange(newValues);
  };

  const handleRemove = (value: string) => {
    if (disabled) return;
    onChange(selectedValues.filter(v => v !== value));
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
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

  const getSelectedLabels = () => {
    return selectedValues.map(value => {
      const option = options.find(option => option.value === value);
      return option?.label || value;
    });
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label || placeholder}
        aria-describedby={description ? `${label}-description` : undefined}
        tabIndex={disabled ? -1 : 0}
        className={`
          relative w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}
        `}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          } else if (e.key === 'Escape' && isOpen) {
            setIsOpen(false);
            setSearchTerm('');
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {selectedValues.length === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {getSelectedLabels().map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {label}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(selectedValues[index]);
                        }}
                        className="hover:text-blue-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {selectedValues.length > 0 && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
            <CaretDown 
              size={16} 
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <div 
          role="listbox"
          aria-label={`${label || 'Options'} selection`}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden"
        >
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Search options"
              />
            </div>
          )}
          
          <div className="max-h-48 overflow-y-auto" role="group">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map(([category, categoryOptions]) => (
                <div key={typeof category === 'string' ? category : 'other'}>
                  {typeof category === 'string' && category !== 'Other' && (
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                      {category}
                    </div>
                  )}
                  {Array.isArray(categoryOptions) && categoryOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    const isDisabled = maxSelections && selectedValues.length >= maxSelections && !isSelected;
                    
                    return (
                      <div
                        key={option.value}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={-1}
                        className={`
                          px-4 py-2 text-sm cursor-pointer flex items-center justify-between
                          hover:bg-gray-50 transition-colors
                          ${isSelected ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        onClick={() => !isDisabled && handleSelect(option.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (!isDisabled) handleSelect(option.value);
                          }
                        }}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check size={16} className="text-blue-600" />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          
          {maxSelections && (
            <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
              {selectedValues.length} of {maxSelections} selected
            </div>
          )}
        </div>
      )}

      {description && (
        <p id={`${label}-description`} className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
}
