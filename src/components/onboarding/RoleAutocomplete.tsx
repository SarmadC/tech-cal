'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CaretDown, X, Check } from '@phosphor-icons/react';
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
    hideLabel?: boolean;
    hideHint?: boolean;
}

export function RoleAutocomplete({
    id,
    value,
    onChange,
    label,
    hint,
    error,
    required = false,
    ariaDescribedBy: _ariaDescribedBy,
    className,
    placeholder = "Search for your role...",
    showSuccess = false,
    hideLabel = false,
    hideHint = false
}: RoleAutocompleteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId, _ariaDescribedBy].filter(Boolean).join(' ') || undefined;

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
            {!hideLabel && (
                <div className="flex items-center justify-between">
                    <label htmlFor={id} className="text-[14px] sm:text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                        {label}
                        {required && <span className="text-red-500/80 ml-0.5">*</span>}
                    </label>
                </div>
            )}

            {!hideHint && hint && (
                <p id={hintId} className="text-[13px] sm:text-[12px] text-zinc-500 dark:text-zinc-500">
                    {hint}
                </p>
            )}

            <div className="relative">
                {/* Main Combobox Input */}
                <div
                    className={clsx(
                        "relative w-full transition-all duration-150 rounded-md outline-none",
                        "shadow-sm",
                        // Base State (Closed)
                        !isOpen && "bg-zinc-50 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/[0.15] hover:bg-zinc-100 dark:hover:bg-white/[0.08]",
                        // Active State (Open) - Background change
                        isOpen && "bg-white dark:bg-[#2C2D30] border border-zinc-200 dark:border-white/[0.08]",
                        // Focus Visible - Strong Indication (Keyboard)
                        "has-[:focus-visible]:border-zinc-500 dark:has-[:focus-visible]:border-zinc-500 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-zinc-500",
                        error ? "bg-red-50 dark:bg-red-900/10 border-red-500/50 has-[:focus-visible]:border-red-500 has-[:focus-visible]:ring-red-500" : "",
                        showSuccess && !error ? "border-emerald-500/50 bg-emerald-500/5" : ""
                    )}
                    onClick={() => {
                        if (!isOpen) setIsOpen(true);
                        inputRef.current?.focus();
                    }}
                >
                    <div className="flex items-center px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-[38px]">
                        <input
                            ref={inputRef}
                            id={id}
                            type="text"
                            value={isOpen ? searchQuery : (displayedRole || '')}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!isOpen) setIsOpen(true);
                            }}
                            onFocus={() => {
                                setIsOpen(true);
                                if (displayedRole) setSearchQuery('');
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            aria-label={hideLabel ? label : undefined}
                            aria-describedby={describedBy}
                            className="w-full bg-transparent border-none p-0 text-[15px] sm:text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-0"
                        />

                        {displayedRole && !isOpen ? (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-1 -mr-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                aria-label="Clear selection"
                            >
                                <X size={14} />
                            </button>
                        ) : (
                            <CaretDown
                                size={14}
                                className={clsx(
                                    "ml-2 transition-transform opacity-50 flex-shrink-0 text-zinc-500",
                                    isOpen ? "rotate-180" : ""
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
                                    <div className="px-4 py-6 text-center text-[14px] sm:text-sm text-muted-foreground">
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
                                                                "w-full text-left px-4 py-2.5 sm:py-2 text-[15px] sm:text-sm transition-all outline-none flex items-center justify-between",
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
