'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, MagnifyingGlass, CaretLeft } from '@phosphor-icons/react';
import { normalizeForComparison, validateSkillEntry } from '@/utils/skillSuggestions';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiSelectOption } from './MultiSelectDropdown';

export interface MobileMultiSelectDropdownProps {
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
    variant?: 'default' | 'linear';
}

export default function MobileMultiSelectDropdown({
    options,
    selectedValues,
    onChange,
    placeholder = 'Select options...',
    label,
    description,
    maxSelections,
    searchable: _searchable = true,
    className = '',
    disabled = false,
    suggestions,
    suggestionLabel,
    allowCustom = false,
    onDuplicateAttempt,
}: MobileMultiSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectedLookup = React.useMemo(
        () => new Set(selectedValues.map(normalizeForComparison)),
        [selectedValues]
    );
    const optionLookup = React.useMemo(() => {
        const lookup = new Map<string, MultiSelectOption>();
        options.forEach((option) => {
            lookup.set(normalizeForComparison(option.value), option);
            lookup.set(normalizeForComparison(option.label), option);
        });
        return lookup;
    }, [options]);

    // Group options by category (Memoized)
    const groupedOptions = React.useMemo(() => options.reduce((acc, option) => {
        const category = option.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(option);
        return acc;
    }, {} as Record<string, MultiSelectOption[]>), [options]);

    // Filter options based on search term (Memoized)
    const filteredOptions = React.useMemo((): [string, MultiSelectOption[]][] => {
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

        return Object.entries(groupedOptions)
            .map(([category, categoryOptions]): [string, MultiSelectOption[]] => [
                category,
                categoryOptions.filter(matchesSearch)
            ])
            .filter(([, categoryOptions]) => categoryOptions.length > 0);
    }, [groupedOptions, searchTerm]);

    // Also memoized normalizedSearch for suggestions
    const normalizedSearch = searchTerm.trim().toLowerCase();

    // Suggestions logic
    const filteredSuggestions = (suggestions ?? [])
        .filter((suggestion) => !selectedLookup.has(normalizeForComparison(suggestion)) && suggestion.toLowerCase().includes(normalizedSearch))
        .map((suggestion) => optionLookup.get(normalizeForComparison(suggestion))?.value ?? suggestion)
        .slice(0, 5);

    const handleToggle = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        if (!isOpen) {
            setSearchTerm('');
        }
    };

    const handleSelect = (value: string) => {
        if (disabled) return;

        const resolvedValue = optionLookup.get(normalizeForComparison(value))?.value ?? value;
        const normalizedValue = normalizeForComparison(resolvedValue);
        const isSelected = selectedLookup.has(normalizedValue);
        let newValues: string[];

        if (isSelected) {
            newValues = selectedValues.filter(v => normalizeForComparison(v) !== normalizedValue);
        } else {
            if (maxSelections && selectedValues.length >= maxSelections) return;
            newValues = [...selectedValues, resolvedValue];
        }

        onChange(newValues);
    };

    const handleRemove = (value: string) => {
        if (disabled) return;
        const normalizedValue = normalizeForComparison(value);
        onChange(selectedValues.filter(v => normalizeForComparison(v) !== normalizedValue));
    };

    const getLabel = (value: string) => {
        return optionLookup.get(normalizeForComparison(value))?.label || value;
    };

    const handleCustomEntry = () => {
        const validation = validateSkillEntry(searchTerm);
        if (validation.valid && validation.normalized) {
            const normalizedValue = normalizeForComparison(validation.normalized);
            if (selectedLookup.has(normalizedValue)) {
                onDuplicateAttempt?.(validation.normalized);
                return;
            }

            handleSelect(optionLookup.get(normalizeForComparison(validation.normalized))?.value ?? validation.normalized);
            setSearchTerm('');
        }
    };

    // Close logic
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Helper to format category headers
    const formatCategory = (cat: string) => {
        return cat
            .replace(/[_-]/g, ' ') // Replace underscores and hyphens
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div className={twMerge("space-y-2", className)} ref={containerRef}>
            {/* ... (rest of render) ... */}
            {(label || description) && (
                <div className="space-y-1">
                    {label && <label className="text-sm font-medium text-foreground/90">{label}</label>}
                    {description && (
                        <p className="text-[13px] text-[#8A8F98]">
                            {description}
                        </p>
                    )}
                </div>
            )}

            {/* Trigger Area (Linear Style - Mobile Optimized) */}
            <div
                onClick={handleToggle}
                className={clsx(
                    "w-full text-left flex flex-wrap gap-2 items-center relative transition-all duration-200",
                    "min-h-[40px] rounded-none border-b bg-transparent px-2 py-2.5", // Field style
                    isOpen ? "border-b-[#5E6AD2]" : "border-b-white/[0.06]"
                )}
            >
                {/* Icon */}
                {selectedValues.length === 0 && (
                    <div className="flex items-center justify-center w-5 h-5 text-[#8A8F98]">
                        <MagnifyingGlass size={16} weight="bold" />
                    </div>
                )}

                {/* Chips */}
                {selectedValues.map(value => (
                    <span
                        key={value}
                        onClick={(e) => { e.stopPropagation(); /* prevent reopen if tapping chip */ }}
                        className={clsx(
                            "inline-flex items-center gap-1.5 w-max",
                            "h-[22px] pl-2 pr-1 rounded-[4px] bg-white/[0.07] text-[#EDEDEF] text-[13px] font-medium border border-transparent ring-1 ring-inset ring-white/[0.08]"
                        )}
                    >
                        <span className="truncate max-w-[160px]">{getLabel(value)}</span>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemove(value); }}
                            aria-label={`Remove ${getLabel(value)}`}
                            className="text-white/50 hover:text-white rounded-sm flex items-center justify-center"
                        >
                            <X size={12} weight="regular" />
                        </button>
                    </span>
                ))}

                {/* Read-only Input Placeholder (To mimic text field but no keyboard) */}
                <input
                    readOnly
                    type="text"
                    className={clsx(
                        "bg-transparent border-none outline-none text-sm placeholder:text-[#8A8F98] flex-1 py-0.5 min-w-[60px] text-[#E3E3E3]",
                        "pointer-events-none" // Let clicks pass to container logic
                    )}
                    placeholder={selectedValues.length === 0 ? placeholder : ""}
                    value="" // Always empty in trigger, real search is in sheet
                />

                {/* Counter */}
                {maxSelections && (
                    <div className="absolute right-2 top-2.5">
                        <span className="text-[10px] font-mono text-white/35">
                            {selectedValues.length}/{maxSelections}
                        </span>
                    </div>
                )}
            </div>

            {/* Bottom Sheet Portal (Full Screen on Mobile) */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => setIsOpen(false)}
                                className="fixed inset-0 bg-black/60 z-[9998]"
                            />

                            {/* Sheet Container */}
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "tween", duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                                className="fixed inset-x-0 bottom-0 z-[9999] bg-[#1D1E21] border-t border-[#36373A] rounded-t-[16px] overflow-hidden flex flex-col h-[92vh] will-change-transform"
                            >
                                {/* Minimal Header */}
                                <div className="flex items-center justify-between px-4 h-12 border-b border-[#2C2D31] flex-shrink-0">
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="text-[#8A8F98] flex items-center gap-1 text-[15px]"
                                    >
                                        <CaretLeft size={16} />
                                        Back
                                    </button>

                                    <h3 className="text-[15px] font-medium text-[#E3E3E3]">{label}</h3>

                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="text-[#5E6AD2] font-medium text-[15px]"
                                    >
                                        Done
                                    </button>
                                </div>

                                {/* Integrated Search Row */}
                                <div className="px-4 border-b border-[#2C2D31] flex-shrink-0">
                                    <div className="flex items-center h-11 gap-3">
                                        <MagnifyingGlass size={16} className="text-[#8A8F98] flex-shrink-0" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder={`Search ${label?.toLowerCase() || 'options'}...`}
                                            className="flex-1 bg-transparent text-[15px] text-white placeholder:text-[#5A5B60] outline-none border-none h-full"
                                            autoFocus={false}
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="text-[#8A8F98] p-1"
                                            >
                                                <X size={14} weight="bold" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Horizontal Token Preview (Optional Linear Touch) */}
                                {selectedValues.length > 0 && (
                                    <div className="px-4 py-3 border-b border-[#2C2D31] overflow-x-auto hide-scrollbar flex gap-2 flex-shrink-0">
                                        {selectedValues.map(value => (
                                            <span
                                                key={value}
                                                className={clsx(
                                                    "inline-flex items-center gap-1.5 flex-shrink-0",
                                                    "h-[24px] pl-2 pr-1 rounded-[4px] bg-[#2E2F33] text-[#EDEDEF] text-[13px] font-medium border border-[#36373A]"
                                                )}
                                            >
                                                <span className="whitespace-nowrap">{getLabel(value)}</span>
                                                <button
                                                    onClick={() => handleRemove(value)}
                                                    aria-label={`Remove ${getLabel(value)}`}
                                                    className="text-[#8A8F98] hover:text-white p-0.5"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Scrollable List */}
                                <div className="flex-1 overflow-y-auto px-4 py-2">
                                    {/* Suggestions */}
                                    {filteredSuggestions.length > 0 && (
                                        <div className="mb-4">
                                            <div className="py-2 text-[11px] font-medium text-[#8A8F98] tracking-wider opacity-60">
                                                {suggestionLabel || 'Suggested'}
                                            </div>
                                            {filteredSuggestions.map(suggestion => {
                                                const isSelected = selectedValues.includes(suggestion);
                                                return (
                                                    <div
                                                        key={suggestion}
                                                        onClick={() => handleSelect(suggestion)}
                                                        className="flex items-center justify-between h-[44px] cursor-pointer"
                                                    >
                                                        <span className={clsx("text-[15px]", isSelected ? "text-white font-medium" : "text-[#EDEDEF]")}>
                                                            {suggestion}
                                                        </span>
                                                        {isSelected && <Check size={16} weight="bold" className="text-[#5E6AD2]" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Main Categories */}
                                    {filteredOptions.length > 0 ? (
                                        filteredOptions.map(([category, opts]) => (
                                            <div key={category} className="mb-4">
                                                {(Object.keys(groupedOptions).length > 1 || category !== 'Other') && (
                                                    <div className="py-2 text-[11px] font-medium text-[#8A8F98] tracking-wider opacity-60">
                                                        {formatCategory(category)}
                                                    </div>
                                                )}
                                                <div>
                                                    {(opts as MultiSelectOption[]).map((option) => {
                                                        const isSelected = selectedValues.includes(option.value);
                                                        const isDisabled = maxSelections && selectedValues.length >= maxSelections && !isSelected;

                                                        return (
                                                            <div
                                                                key={option.value}
                                                                onClick={() => !isDisabled && handleSelect(option.value)}
                                                                className={clsx(
                                                                    "flex items-center justify-between h-[44px] cursor-pointer",
                                                                    isDisabled && "opacity-40"
                                                                )}
                                                            >
                                                                <span className={clsx("text-[15px]", isSelected ? "text-white font-medium" : "text-[#EDEDEF]")}>
                                                                    {option.label}
                                                                </span>
                                                                {isSelected && <Check size={16} weight="bold" className="text-[#5E6AD2]" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        !filteredSuggestions.length && (
                                            <div className="text-center py-12 text-[#8A8F98] text-sm">
                                                No results found
                                                {allowCustom && searchTerm && (
                                                    <button
                                                        onClick={handleCustomEntry}
                                                        className="block mx-auto mt-4 text-[#5E6AD2] font-medium"
                                                    >
                                                        Tap to add &quot;{searchTerm}&quot;
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    )}

                                    <div className="h-safe-area-bottom" />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
