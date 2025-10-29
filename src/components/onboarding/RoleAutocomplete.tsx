'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CaretDown, MagnifyingGlass, X } from '@phosphor-icons/react';
import { ALL_PREDEFINED_ROLES, ROLE_TAXONOMY } from '@/types/career';

interface RoleAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  ariaDescribedBy?: string;
}

export const RoleAutocomplete: React.FC<RoleAutocompleteProps> = ({
  id,
  value,
  onChange,
  label,
  hint,
  error,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  // Filter roles based on search query
  const filteredRoles = React.useMemo(() => {
    if (!searchQuery) return ALL_PREDEFINED_ROLES;
    const query = searchQuery.toLowerCase();
    return ALL_PREDEFINED_ROLES.filter(role => 
      role.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const displayedRole = React.useMemo(() => {
    if (!value) return null;
    return ALL_PREDEFINED_ROLES.find(role => role === value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => 
        prev < filteredRoles.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredRoles.length) {
        handleSelect(filteredRoles[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleSelect = (role: string) => {
    onChange(role);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  return (
    <div className="space-y-1" ref={containerRef}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-600 ml-1" aria-label="required">*</span>}
      </label>
      
      {hint && (
        <p id={hintId} className="text-sm opacity-80">
          {hint}
        </p>
      )}

      <div className="relative">
        <div
          className="w-full px-3 py-2 rounded-lg transition-all duration-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-white focus-within:ring-offset-1"
          style={{
            borderColor: error ? 'var(--error)' : 'var(--border-default)',
            borderWidth: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          }}
          onClick={() => setIsOpen(true)}
        >
          {displayedRole ? (
            <div className="flex items-center justify-between">
              <span>{displayedRole}</span>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded transition-colors"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                aria-label="Clear selection"
              >
                <X size={16} style={{ opacity: 0.6 }} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="opacity-60">Search for your role...</span>
              <CaretDown size={16} style={{ opacity: 0.6 }} />
            </div>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 rounded-lg max-h-80 overflow-hidden glass-card" style={{ backdropFilter: 'blur(24px)' }}>
            <div className="p-2 sticky top-0" style={{ borderBottomColor: 'var(--border-default)', borderBottomWidth: '1px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2" size={16} weight="duotone" style={{ opacity: 0.6 }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search roles..."
                  className="w-full pl-10 pr-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                  style={{ borderColor: 'var(--border-default)', borderWidth: '1px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  autoFocus
                />
              </div>
            </div>
            
            <div 
              ref={listRef}
              className="overflow-y-auto max-h-64"
              role="listbox"
              aria-label="Role options"
            >
              {filteredRoles.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm opacity-70">
                  No roles found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                Object.entries(ROLE_TAXONOMY).map(([category, roles]) => {
                  const visibleRoles = roles.filter(role => 
                    filteredRoles.includes(role)
                  );
                  
                  if (visibleRoles.length === 0) return null;
                  
                  return (
                    <div key={category} className="py-1">
                      <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide sticky top-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', opacity: 0.6 }}>
                        {category}
                      </div>
                      {visibleRoles.map((role) => {
                        const globalIndex = filteredRoles.indexOf(role);
                        const isSelected = value === role;
                        const isFocused = focusedIndex === globalIndex;
                        
                        return (
                          <button
                            key={role}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelect(role)}
                            className="w-full text-left px-4 py-2 text-sm transition-colors focus:outline-none"
                            style={{
                              backgroundColor: isSelected || isFocused ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                              color: isSelected ? 'var(--accent-primary)' : undefined
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-sm mt-1" style={{ color: 'var(--error)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
