'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, CaretDown, X, MagnifyingGlass } from '@phosphor-icons/react';
import { normalizeForComparison, validateSkillEntry } from '@/utils/skillSuggestions';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

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
    variant?: 'default' | 'minimal' | 'linear';
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
    onDuplicateAttempt,
    variant = 'default'
}: MultiSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listboxRef = useRef<HTMLDivElement>(null);

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
    ]).filter(([, categoryOptions]) => (categoryOptions as MultiSelectOption[]).length > 0);

    // Flatten options for index-based navigation
    const flatOptions = filteredOptions.flatMap(([, opts]) => opts as MultiSelectOption[]);

    // Calculate dropdown position (fixed positioning uses viewport coordinates)
    const updateDropdownPosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 8, // 8px gap (mt-2)
                left: rect.left,
                width: rect.width
            });
        }
    };

    const handleToggle = () => {
        if (disabled) return;
        if (!isOpen) {
            updateDropdownPosition();
            setIsOpen(true);
            setTimeout(() => searchRef.current?.focus(), 0);
        } else {
            setIsOpen(false);
            setSearchTerm('');
            setFocusedIndex(-1);
            setDropdownPosition(null);
        }
    };

    // Update position on scroll/resize when open
    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            updateDropdownPosition();
        };

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    const handleSelect = (value: string) => {
        if (disabled) return;

        // Check for duplicate
        if (selectedValues.map(normalizeForComparison).includes(normalizeForComparison(value))) {
            onDuplicateAttempt?.(value);
            setSearchTerm('');
            return;
        }

        const isSelected = selectedValues.includes(value);
        let newValues: string[];

        if (isSelected) {
            newValues = selectedValues.filter(v => v !== value);
        } else {
            if (maxSelections && selectedValues.length >= maxSelections) return;
            newValues = [...selectedValues, value];
        }

        onChange(newValues);
        if (!maxSelections || newValues.length < maxSelections) {
            setSearchTerm('');
            // Keep focus on input for rapid selection
            searchRef.current?.focus();
        } else {
            setIsOpen(false);
            setDropdownPosition(null);
        }
    };

    const handleRemove = (value: string) => {
        if (disabled) return;
        onChange(selectedValues.filter(v => v !== value));
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                listboxRef.current &&
                !listboxRef.current.contains(target)
            ) {
                setIsOpen(false);
                setSearchTerm('');
                setDropdownPosition(null);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const getLabel = (value: string) => {
        const option = options.find(opt => opt.value === value);
        return option?.label || value;
    };

    const handleCustomEntry = () => {
        const validation = validateSkillEntry(searchTerm);
        if (validation.valid && validation.normalized) {
            handleSelect(validation.normalized);
        }
    };

    // Keyboard Navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                handleToggle();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev => Math.min(prev + 1, flatOptions.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => Math.max(prev - 1, -1)); // -1 means input focus
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIndex >= 0 && flatOptions[focusedIndex]) {
                    handleSelect(flatOptions[focusedIndex].value);
                } else if (allowCustom && searchTerm) {
                    handleCustomEntry();
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                setDropdownPosition(null);
                break;
            case 'Backspace':
                if (!searchTerm && selectedValues.length > 0) {
                    handleRemove(selectedValues[selectedValues.length - 1]);
                }
                break;
        }
    };

    // Scroll focused item into view
    useEffect(() => {
        if (focusedIndex >= 0 && listboxRef.current) {
            const el = listboxRef.current.querySelector(`[data-index="${focusedIndex}"]`);
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [focusedIndex]);


    const filteredSuggestions = suggestions?.filter(
        s => !selectedValues.map(normalizeForComparison).includes(normalizeForComparison(s))
    ).slice(0, 5) || [];

    return (
        <div className={twMerge(
            variant === 'linear' ? "space-y-2" : "space-y-4",
            className
        )} ref={containerRef}>
            {/* Header Section */}
            {(label || description) && (
                <div className="space-y-1">
                    {label && <label className="text-sm font-medium text-foreground/90">{label}</label>}
                    {description && (
                        <p className={clsx(
                            variant === 'linear' ? "text-[13px] text-[#8A8F98]" : "text-xs text-muted-foreground"
                        )}>
                            {description}
                        </p>
                    )}
                </div>
            )}

            {/* Main Interaction Area */}
            <div
                className={clsx(
                    "relative group transition-all duration-200",
                    isOpen ? "z-[100]" : "z-0"
                )}
            >
                {/* Trigger Area */}
                <div
                    ref={triggerRef}
                    onClick={() => { if (!isOpen) handleToggle(); searchRef.current?.focus(); }}
                    className={clsx(
                        "w-full text-left transition-all duration-200 flex flex-wrap gap-2 items-center cursor-text relative",
                        variant === 'minimal'
                            ? "min-h-[42px] px-3 py-2 rounded-xl border bg-transparent border-transparent hover:bg-secondary/50"
                            : variant === 'linear'
                                ? "min-h-[40px] rounded-none border-b bg-transparent px-2 py-2.5" // Input container
                                : "min-h-[42px] px-3 py-2 rounded-xl border bg-[hsl(var(--background))]",
                        isOpen && variant !== 'linear'
                            ? (variant === 'minimal' ? "bg-secondary/50" : "border-border ring-1 ring-border/50 shadow-lg")
                            : (variant === 'linear'
                                // Linear Active State: 1px bottom accent #5E6AD2
                                ? (isOpen ? "border-b-[#5E6AD2]" : "border-b-white/[0.06]")
                                // Default Hover
                                : "border-border/50 hover:border-border hover:bg-secondary/30")
                    )}
                >
                    {(variant !== 'linear') && (
                        <div className={clsx(
                            "absolute pointer-events-none flex items-center text-[#8A8F98]",
                            "left-3"
                        )}>
                            <MagnifyingGlass size={16} weight="regular" className={clsx("transition-colors", isOpen ? "text-foreground" : "")} />
                        </div>
                    )}

                    {/* Linear Icon - only layout if no chips? Or just first element */}
                    {variant === 'linear' && selectedValues.length === 0 && (
                        <div className="flex items-center justify-center w-5 h-5 text-[#8A8F98]">
                            <MagnifyingGlass size={16} weight="bold" />
                        </div>
                    )}

                    {/* Selected Chips - Inside Input for Linear */}
                    <AnimatePresence>
                        {selectedValues.map(value => (
                            <motion.span
                                key={value}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className={clsx(
                                    "inline-flex items-center gap-1.5 cursor-default transition-colors w-max",
                                    variant === 'linear'
                                        ? "h-[22px] pl-2 pr-1 rounded-[4px] bg-white/[0.07] text-[#EDEDEF] text-[13px] font-medium border border-transparent ring-1 ring-inset ring-white/[0.08]"
                                        : "px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-foreground border border-border/50"
                                )}
                            >
                                <span className={clsx("truncate", variant === 'linear' ? "max-w-[160px]" : "")}>{getLabel(value)}</span>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleRemove(value); }}
                                    className={clsx(
                                        "rounded-sm transition-all flex-shrink-0 flex items-center justify-center",
                                        variant === 'linear'
                                            ? "text-white/50 hover:text-white"
                                            : "hover:bg-white/20 p-0.5"
                                    )}
                                >
                                    <X size={variant === 'linear' ? 12 : 10} weight={variant === 'linear' ? "regular" : "bold"} />
                                </button>
                            </motion.span>
                        ))}
                    </AnimatePresence>

                    {/* Input */}
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!isOpen) {
                                updateDropdownPosition();
                                setIsOpen(true);
                            }
                        }}
                        onFocus={() => {
                            if (!isOpen) {
                                updateDropdownPosition();
                                setIsOpen(true);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedValues.length === 0 || variant === 'linear' ? (variant === 'linear' && selectedValues.length > 0 ? "" : placeholder) : ""}
                        className={clsx(
                            "bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50 flex-1 py-0.5 min-w-[60px]",
                            variant === 'linear' ? "text-[#E3E3E3] placeholder:text-[#8A8F98]" : "text-foreground",
                            variant !== 'linear' ? "pl-6" : ""
                        )}
                        style={{ paddingLeft: variant !== 'linear' ? '1.5rem' : '0' }}
                    />

                    {/* Counter - Centered on right for Linear */}
                    {maxSelections && (
                        <div className={clsx(
                            variant === 'linear' ? "absolute right-2 top-2.5" : "flex items-center gap-2"
                        )}>
                            <span className={clsx(
                                "text-[10px] font-mono",
                                variant === 'linear' ? "text-white/35" : "text-muted-foreground/40"
                            )}>
                                {selectedValues.length}/{maxSelections}
                            </span>
                        </div>
                    )}
                </div>

                {/* Dropdown Menu */}
                {isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
                            ref={listboxRef}
                            className={clsx(
                                "fixed overflow-hidden z-[9999]",
                                variant === 'linear'
                                    ? "bg-[#222326] border border-[#2E2F33] rounded-lg shadow-2xl p-1"
                                    : "bg-[hsl(var(--background))] border border-border rounded-xl shadow-2xl p-1 backdrop-blur-xl"
                            )}
                            style={{
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`,
                                width: `${dropdownPosition.width}px`,
                            }}
                        >
                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
                                {flatOptions.length === 0 && !allowCustom && !filteredSuggestions.length && (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        No results found
                                    </div>
                                )}

                                {/* Suggestions Section (Merged for Linear) */}
                                {variant === 'linear' && !searchTerm && filteredSuggestions.length > 0 && (
                                    <div className="mb-2">
                                        <div className="px-3 py-2 text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                                            {suggestionLabel || 'Suggested'}
                                        </div>
                                        {filteredSuggestions.map((suggestion) => {
                                            const isSelected = selectedValues.includes(suggestion);
                                            return (
                                                <div
                                                    key={suggestion}
                                                    onClick={() => handleSelect(suggestion)}
                                                    className={clsx(
                                                        "flex items-center justify-between px-3 h-8 rounded text-[13px] cursor-pointer transition-colors mx-1",
                                                        "text-[#EDEDEF] hover:bg-[#2C2D31]",
                                                        isSelected ? "bg-[#2C2D31]" : ""
                                                    )}
                                                >
                                                    <span className="flex-1 truncate">{suggestion}</span>
                                                    {isSelected && (
                                                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#E3E3E3]">
                                                            <Check size={14} weight="bold" />
                                                        </motion.span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {/* Divider between suggestions and main list */}
                                        <div className="h-[1px] bg-[#2E2F33] my-1 mx-2" />
                                    </div>
                                )}


                                {flatOptions.length === 0 && allowCustom && searchTerm && (
                                    <div
                                        className={clsx(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors",
                                            focusedIndex === -1 ? "bg-secondary text-foreground" : "text-muted-foreground"
                                        )}
                                        onClick={handleCustomEntry}
                                    >
                                        <span className="flex items-center justify-center w-5 h-5 rounded bg-secondary text-foreground text-xs">+</span>
                                        <span>Create tag "{searchTerm}"</span>
                                    </div>
                                )}

                                {/* Main Options List */}
                                {Object.entries(groupedOptions).map(([category, categoryOptions]) => {
                                    const activeCategoryOptions = categoryOptions.filter(matchesSearch);
                                    if (activeCategoryOptions.length === 0) return null;

                                    return (
                                        <div key={category}>
                                            {/* Show Category Header if multiple categories exist or always if desired. 
                                                Linear often just lists, but if we have explicit categories, use headers. 
                                            */}
                                            {(Object.keys(groupedOptions).length > 1 || category !== 'Other') && (
                                                <div className={clsx(
                                                    "px-3 py-1.5 mt-1 text-[11px] font-medium uppercase tracking-wider sticky top-0 bg-[#222326]/90 backdrop-blur-sm z-10",
                                                    variant === 'linear' ? "text-[#8A8F98]" : "text-muted-foreground"
                                                )}>
                                                    {category}
                                                </div>
                                            )}

                                            {activeCategoryOptions.map((option) => {
                                                const isSelected = selectedValues.includes(option.value);
                                                const isDisabled = maxSelections && selectedValues.length >= maxSelections && !isSelected;
                                                const index = flatOptions.indexOf(option);

                                                return (
                                                    <div
                                                        key={option.value}
                                                        data-index={index}
                                                        onClick={() => !isDisabled && handleSelect(option.value)}
                                                        className={clsx(
                                                            "flex items-center justify-between px-3 rounded cursor-pointer transition-colors mx-1",
                                                            variant === 'linear'
                                                                ? "h-8 text-[13px]"
                                                                : "py-2 px-3 text-sm rounded-lg",

                                                            variant === 'linear'
                                                                ? (index === focusedIndex ? "bg-[#2C2D31] text-[#EDEDEF]" : "text-[#EDEDEF] hover:bg-[#2C2D31]")
                                                                : (index === focusedIndex ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"),

                                                            isSelected && !isDisabled
                                                                ? (variant === 'linear' ? "text-[#EDEDEF]" : "text-emerald-400 bg-emerald-400/5 group")
                                                                : "",
                                                            isDisabled && "opacity-40 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <span className="flex-1 truncate">{option.label}</span>
                                                        {isSelected && (
                                                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className={variant === 'linear' ? "text-[#E3E3E3]" : ""}>
                                                                <Check size={14} weight="bold" />
                                                            </motion.span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Old Footer - Only if NOT linear */}
                            {variant !== 'linear' && filteredSuggestions.length > 0 && (
                                <div className="p-2 border-t border-border/50 bg-secondary/20">
                                    <div className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-2 px-1">
                                        {suggestionLabel || 'Suggested'}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredSuggestions.map(suggestion => (
                                            <button
                                                key={suggestion}
                                                onClick={() => handleSelect(suggestion)}
                                                className="px-2 py-1 text-xs rounded-md bg-secondary/50 border border-border/50 hover:bg-secondary hover:border-border text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                + {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}
            </div>
        </div >
    );
}
