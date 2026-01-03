'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CaretDown, MagnifyingGlass, X, Check } from '@phosphor-icons/react';
import { ALL_PREDEFINED_ROLES, ROLE_TAXONOMY } from '@/types/career';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

interface RoleAutocompleteProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    ariaDescribedBy?: string;
    className?: string; // Added className prop
    placeholder?: string;
    showSuccess?: boolean; // Show success state with green border
}

export function RoleAutocomplete({
    id,
    value,
    onChange,
    label,
    hint,
    error,
    required = false,
    ariaDescribedBy,
    className,
    placeholder = "Search for your role...",
    showSuccess = false
}: RoleAutocompleteProps) {
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
        <div className={twMerge("space-y-1.5", className)} ref={containerRef}>
            <label htmlFor={id} className="block text-sm font-medium text-foreground/80">
                {label}
                {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
            </label>

            {hint && (
                <p id={hintId} className="text-sm text-muted-foreground">
                    {hint}
                </p>
            )}

            <div className="relative">
                {/* Main Combobox Input - direct filtering, no nested search */}
                <div
                    className={clsx(
                        "relative w-full transition-all duration-200 border rounded-xl",
                        "bg-secondary/30 hover:bg-secondary/50",
                        isOpen
                            ? "border-border ring-1 ring-border/50 shadow-lg"
                            : "border-border/50 hover:border-border",
                        error ? "border-red-500/50 hover:border-red-500" : "",
                        showSuccess && !error ? "border-emerald-500/50 ring-2 ring-emerald-500/20" : ""
                    )}
                >
                    <div className="flex items-center">
                        <MagnifyingGlass
                            size={18}
                            className={clsx(
                                "ml-3.5 transition-colors",
                                isOpen ? "text-foreground/60" : "text-muted-foreground"
                            )}
                        />
                        <input
                            ref={inputRef}
                            type="text"
                            value={isOpen ? searchQuery : (displayedRole || '')}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!isOpen) setIsOpen(true);
                            }}
                            onFocus={() => {
                                setIsOpen(true);
                                // Clear search when opening to allow fresh search
                                if (displayedRole) setSearchQuery('');
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className="flex-1 px-3.5 py-3 bg-transparent border-none text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-transparent focus:border-none focus:shadow-none"
                        />
                        {displayedRole && !isOpen ? (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-2 mr-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                aria-label="Clear selection"
                            >
                                <X size={16} />
                            </button>
                        ) : (
                            <CaretDown
                                size={16}
                                className={clsx(
                                    "mr-3.5 transition-transform",
                                    isOpen ? "rotate-180 text-foreground/60" : "text-muted-foreground"
                                )}
                            />
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 w-full mt-2 rounded-xl max-h-72 overflow-hidden shadow-2xl bg-popover border border-border backdrop-blur-sm"
                        >
                            <div
                                ref={listRef}
                                className="overflow-y-auto max-h-72 custom-scrollbar py-1"
                                role="listbox"
                                aria-label="Role options"
                            >
                                {filteredRoles.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
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
                                                <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider sticky top-0 bg-popover/95 text-muted-foreground/60 border-b border-border/50">
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
                                                            className={clsx(
                                                                "w-full text-left px-4 py-2 text-sm transition-all outline-none flex items-center justify-between",
                                                                isSelected
                                                                    ? "bg-secondary text-foreground font-medium"
                                                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                                                                isFocused && !isSelected && "bg-secondary/50 text-foreground"
                                                            )}
                                                        >
                                                            <span>{role}</span>
                                                            {isSelected && (
                                                                <Check size={14} weight="bold" className="text-emerald-400" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {error && (
                <p id={errorId} className="text-sm mt-1 text-red-400" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};
