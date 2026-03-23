'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CaretDown, X, MagnifyingGlass } from '@phosphor-icons/react';
import { normalizeForComparison, validateSkillEntry } from '@/utils/skillSuggestions';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const UPPERCASE_SKILL_TOKENS = new Set([
    'ai',
    'api',
    'aws',
    'bi',
    'css',
    'db',
    'etl',
    'gcp',
    'html',
    'ml',
    'nlp',
    'qa',
    'sql',
    'ui',
    'ux'
]);

function formatFallbackLabel(value: string): string {
    return value
        .split(/(\s+|\/|&|-)/)
        .map((part) => {
            const normalizedPart = part.trim().toLowerCase();
            if (!normalizedPart || /\s+|\/|&|-/.test(part)) {
                return part;
            }

            if (UPPERCASE_SKILL_TOKENS.has(normalizedPart)) {
                return normalizedPart.toUpperCase();
            }

            return part;
        })
        .join('');
}

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
    variant?: 'default' | 'minimal' | 'linear' | 'native' | 'inline-search';
    emphasis?: 'default' | 'primary' | 'subtle';
    statusText?: string;
    relatedValues?: string[];
    relatedLabel?: string;
}

export default function MultiSelectDropdown({
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
    variant = 'default',
    emphasis = 'default',
    statusText,
    relatedValues = [],
    relatedLabel
}: MultiSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [isInlineFocused, setIsInlineFocused] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listboxRef = useRef<HTMLDivElement>(null);
    const isOpenRef = useRef(false);
    const prefersReducedMotion = useReducedMotion();
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
    const isMinimal = variant === 'minimal';
    const isLinear = variant === 'linear';
    const isNative = variant === 'native';
    const isInlineSearch = variant === 'inline-search';
    const fieldId = React.useId();

    // Group options by category if they have one
    const groupedOptions = React.useMemo(() => options.reduce((acc, option) => {
        const category = option.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(option);
        return acc;
    }, {} as Record<string, MultiSelectOption[]>), [options]);

    // Filter options based on search term
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredSuggestions = React.useMemo(() => {
        const seen = new Set<string>();

        return (suggestions ?? [])
            .filter((suggestion) => {
                const normalizedSuggestion = normalizeForComparison(suggestion);
                if (selectedLookup.has(normalizedSuggestion) || seen.has(normalizedSuggestion)) {
                    return false;
                }

                if (normalizedSearch && !normalizedSuggestion.includes(normalizedSearch)) {
                    return false;
                }

                seen.add(normalizedSuggestion);
                return true;
            })
            .map((suggestion) => optionLookup.get(normalizeForComparison(suggestion))?.value ?? suggestion)
            .slice(0, 5);
    }, [normalizedSearch, optionLookup, selectedLookup, suggestions]);
    const suggestionLookup = React.useMemo(
        () => new Set(filteredSuggestions.map(normalizeForComparison)),
        [filteredSuggestions]
    );
    const filteredOptions = React.useMemo(() => {
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
                categoryOptions.filter((option) => {
                    if (!matchesSearch(option)) {
                        return false;
                    }

                    if (!normalizedSearch && suggestionLookup.has(normalizeForComparison(option.value))) {
                        return false;
                    }

                    return true;
                })
            ])
            .filter(([, categoryOptions]) => categoryOptions.length > 0);
    }, [groupedOptions, normalizedSearch, suggestionLookup]);

    // Flatten options for index-based navigation
    const flatOptions = React.useMemo(
        () => filteredOptions.flatMap(([, opts]) => opts),
        [filteredOptions]
    );

    // Calculate dropdown position (fixed positioning uses viewport coordinates)
    const updateDropdownPosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const nextPosition = {
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width
            };

            setDropdownPosition((currentPosition) => {
                if (
                    currentPosition &&
                    currentPosition.top === nextPosition.top &&
                    currentPosition.left === nextPosition.left &&
                    currentPosition.width === nextPosition.width
                ) {
                    return currentPosition;
                }

                return nextPosition;
            });
        }
    }, []);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    const closeDropdown = useCallback(() => {
        isOpenRef.current = false;
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        setDropdownPosition(null);
    }, []);

    const openDropdown = useCallback(() => {
        if (disabled || isOpenRef.current) {
            return;
        }

        updateDropdownPosition();
        isOpenRef.current = true;
        setIsOpen(true);
        requestAnimationFrame(() => {
            searchRef.current?.focus();
        });
    }, [disabled, updateDropdownPosition]);

    const handleToggle = useCallback(() => {
        if (isOpenRef.current) {
            closeDropdown();
            return;
        }

        openDropdown();
    }, [closeDropdown, openDropdown]);

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
    }, [isOpen, updateDropdownPosition]);

    const handleSelect = useCallback((value: string) => {
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
        if (isSelected || !maxSelections || newValues.length < maxSelections) {
            setSearchTerm('');
            // Keep focus on input for rapid selection
            searchRef.current?.focus();
        } else {
            closeDropdown();
        }
    }, [closeDropdown, disabled, maxSelections, onChange, optionLookup, selectedLookup, selectedValues]);

    const handleRemove = useCallback((value: string) => {
        if (disabled) return;
        const normalizedValue = normalizeForComparison(value);
        onChange(selectedValues.filter(v => normalizeForComparison(v) !== normalizedValue));
    }, [disabled, onChange, selectedValues]);

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
                closeDropdown();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeDropdown, isOpen]);

    useEffect(() => {
        if (!isInlineSearch || !isInlineFocused) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (containerRef.current && !containerRef.current.contains(target)) {
                setIsInlineFocused(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isInlineFocused, isInlineSearch]);

    const getLabel = useCallback((value: string) => {
        return optionLookup.get(normalizeForComparison(value))?.label || formatFallbackLabel(value);
    }, [optionLookup]);

    const canonicalSelectedValues = React.useMemo(() => Array.from(
        selectedValues.reduce((acc, value) => {
            const normalizedValue = normalizeForComparison(value);
            if (!acc.has(normalizedValue)) {
                acc.set(normalizedValue, optionLookup.get(normalizedValue)?.value ?? value);
            }
            return acc;
        }, new Map<string, string>())
    ).map(([, value]) => value), [optionLookup, selectedValues]);

    const overlapLabels = React.useMemo(() => {
        if (!relatedValues.length) {
            return [];
        }

        const relatedLookup = new Set(relatedValues.map(normalizeForComparison));

        return canonicalSelectedValues
            .filter((value, index, values) => {
                const normalizedValue = normalizeForComparison(value);
                return relatedLookup.has(normalizedValue)
                    && values.findIndex((candidate) => normalizeForComparison(candidate) === normalizedValue) === index;
            })
            .map(getLabel);
    }, [canonicalSelectedValues, getLabel, relatedValues]);

    const handleCustomEntry = useCallback(() => {
        const validation = validateSkillEntry(searchTerm);
        if (validation.valid && validation.normalized) {
            const normalizedValue = normalizeForComparison(validation.normalized);
            if (selectedLookup.has(normalizedValue)) {
                onDuplicateAttempt?.(validation.normalized);
                setSearchTerm('');
                return;
            }

            handleSelect(optionLookup.get(normalizedValue)?.value ?? validation.normalized);
        }
    }, [handleSelect, onDuplicateAttempt, optionLookup, searchTerm, selectedLookup]);

    const inlineSuggestionButtons = React.useMemo(
        () => filteredSuggestions.slice(0, normalizedSearch ? 4 : 6),
        [filteredSuggestions, normalizedSearch]
    );

    const inlineResultOptions = React.useMemo(() => flatOptions
        .filter((option) => {
            const normalizedValue = normalizeForComparison(option.value);
            return !selectedLookup.has(normalizedValue) && !suggestionLookup.has(normalizedValue);
        })
        .slice(0, normalizedSearch ? 7 : 6), [flatOptions, normalizedSearch, selectedLookup, suggestionLookup]);

    const inlineCustomValidation = React.useMemo(
        () => validateSkillEntry(searchTerm),
        [searchTerm]
    );

    const inlineCanAddCustom = Boolean(
        allowCustom
        && searchTerm.trim()
        && inlineCustomValidation.valid
        && inlineCustomValidation.normalized
        && !selectedLookup.has(normalizeForComparison(inlineCustomValidation.normalized))
        && !optionLookup.has(normalizeForComparison(inlineCustomValidation.normalized))
    );

    const handleInlineConfirm = useCallback(() => {
        const exactMatch = optionLookup.get(normalizeForComparison(searchTerm));
        if (exactMatch && !selectedLookup.has(normalizeForComparison(exactMatch.value))) {
            handleSelect(exactMatch.value);
            return;
        }

        if (inlineSuggestionButtons[0]) {
            handleSelect(inlineSuggestionButtons[0]);
            return;
        }

        if (inlineResultOptions[0]) {
            handleSelect(inlineResultOptions[0].value);
            return;
        }

        if (inlineCanAddCustom) {
            handleCustomEntry();
        }
    }, [handleCustomEntry, handleSelect, inlineCanAddCustom, inlineResultOptions, inlineSuggestionButtons, optionLookup, searchTerm, selectedLookup]);

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
                closeDropdown();
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


    const renderChip = (value: string) => {
        const chipLabel = getLabel(value);

        return (
            <motion.span
                key={value}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className={clsx(
                    "inline-flex w-max items-center gap-1.5 transition-colors",
                    isInlineSearch
                        ? "h-[22px] rounded-full border border-border/70 bg-secondary px-2 text-[11px] font-medium text-foreground shadow-sm dark:border-zinc-100/70 dark:bg-zinc-100 dark:text-zinc-950 dark:shadow-[0_1px_0_rgba(255,255,255,0.14)]"
                        : isLinear
                        ? "h-[22px] rounded-[4px] border border-transparent bg-white/[0.07] pl-2 pr-1 text-[13px] font-medium text-[#EDEDEF] ring-1 ring-inset ring-white/[0.08]"
                        : isMinimal
                            ? "rounded-full border border-border/60 bg-secondary/70 px-2.5 py-1 text-[12px] font-medium text-foreground shadow-sm"
                            : "rounded-md border border-border/50 bg-secondary px-2 py-0.5 text-xs font-medium text-foreground"
                )}
            >
                <span className={clsx("truncate", isInlineSearch ? "max-w-[220px]" : isLinear || isMinimal ? "max-w-[160px]" : "")}>{chipLabel}</span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(value);
                    }}
                    aria-label={`Remove ${chipLabel}`}
                    className={clsx(
                        "flex shrink-0 items-center justify-center rounded-sm transition-colors",
                        isInlineSearch
                            ? "text-muted-foreground/72 hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-950"
                            : isLinear
                            ? "text-white/50 hover:text-white"
                            : isMinimal
                                ? "text-muted-foreground hover:text-foreground"
                                : "p-0.5 hover:bg-white/20"
                    )}
                >
                    <X size={isInlineSearch ? 9 : isLinear ? 12 : 10} weight={isLinear ? "regular" : "bold"} />
                </button>
            </motion.span>
        );
    };

    if (isInlineSearch) {
        const selectedCount = canonicalSelectedValues.length;
        const hasReachedLimit = Boolean(maxSelections && selectedCount >= maxSelections);
        const hintTone = emphasis === 'primary' ? 'text-muted-foreground/82' : 'text-muted-foreground/74';
        const fieldTone = emphasis === 'primary'
            ? 'border-white/[0.18] bg-white/[0.045] hover:border-white/[0.24] focus:border-white/[0.3]'
            : emphasis === 'subtle'
                ? 'border-white/[0.12] bg-white/[0.028] hover:border-white/[0.18] focus:border-white/[0.24]'
                : 'border-white/[0.14] bg-white/[0.035] hover:border-white/[0.2] focus:border-white/[0.26]';
        const actionChipTone = emphasis === 'primary'
            ? 'border-white/[0.18] bg-white/[0.06] text-foreground/92 hover:bg-white/[0.09]'
            : 'border-white/[0.12] bg-white/[0.04] text-foreground/88 hover:bg-white/[0.07]';
        const shouldShowStatus = Boolean(statusText) && (isInlineFocused || hasReachedLimit);

        return (
            <div className={twMerge('space-y-2', className)} ref={containerRef}>
                {(label || description) && (
                    <div className="space-y-0.5">
                        <div className="flex items-baseline gap-2.5">
                            {label && (
                                <label
                                    htmlFor={fieldId}
                                    className={clsx(
                                        'text-[13px] font-medium tracking-[-0.01em]',
                                        emphasis === 'primary' ? 'text-foreground' : 'text-foreground/90'
                                    )}
                                >
                                    {label}
                                </label>
                            )}
                            {maxSelections && (
                                <span className="text-[10px] font-medium text-muted-foreground/58">
                                    {selectedCount}/{maxSelections}
                                </span>
                            )}
                        </div>
                        {description && <p className={clsx('text-[11px] leading-4', hintTone)}>{description}</p>}
                    </div>
                )}

                <div className="space-y-1.5">
                    <div className="relative">
                        <MagnifyingGlass
                            size={13}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/82"
                        />
                        <input
                            ref={searchRef}
                            id={fieldId}
                            type="text"
                            value={searchTerm}
                            onFocus={() => setIsInlineFocused(true)}
                            onChange={(event) => {
                                setIsInlineFocused(true);
                                setSearchTerm(event.target.value);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleInlineConfirm();
                                    return;
                                }

                                if (event.key === 'Backspace' && !searchTerm && selectedValues.length > 0) {
                                    handleRemove(selectedValues[selectedValues.length - 1]);
                                    return;
                                }

                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setIsInlineFocused(false);
                                    setSearchTerm('');
                                }
                            }}
                            placeholder={placeholder}
                            disabled={disabled}
                            className={clsx(
                                'block h-9 w-full rounded-md border px-9 pr-3 text-sm text-foreground/96 outline-none transition-colors placeholder:text-muted-foreground/72',
                                fieldTone,
                                disabled && 'cursor-not-allowed opacity-50'
                            )}
                        />
                    </div>

                    {shouldShowStatus && (
                        <p className="text-[11px] leading-5 text-muted-foreground/78">
                            {hasReachedLimit ? 'Remove one to add another.' : statusText}
                        </p>
                    )}

                    {canonicalSelectedValues.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {canonicalSelectedValues.map(renderChip)}
                        </div>
                    )}

                    {isInlineFocused && overlapLabels.length > 0 && (
                        <p className="text-[11px] leading-5 text-muted-foreground/76">
                            Also in {relatedLabel || 'another section'}: {overlapLabels.join(', ')}. Overlap is okay if you want to go deeper.
                        </p>
                    )}

                    {(isInlineFocused || normalizedSearch) && !hasReachedLimit && (
                        <div className="space-y-2.5 pt-1">
                            {inlineSuggestionButtons.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-medium tracking-[0.01em] text-muted-foreground/62">
                                        {suggestionLabel || 'Suggested'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {inlineSuggestionButtons.map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => handleSelect(suggestion)}
                                                className={clsx(
                                                    'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
                                                    actionChipTone
                                                )}
                                            >
                                                {getLabel(suggestion)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {normalizedSearch && inlineResultOptions.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-medium tracking-[0.01em] text-muted-foreground/58">
                                        Matches
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {inlineResultOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => handleSelect(option.value)}
                                                className="rounded-full border border-white/[0.1] px-2.5 py-1 text-[12px] font-medium text-foreground/82 transition-colors hover:border-white/[0.18] hover:bg-white/[0.04] hover:text-foreground"
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {inlineCanAddCustom && inlineCustomValidation.normalized && (
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-medium tracking-[0.01em] text-muted-foreground/58">
                                        Add custom
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleCustomEntry}
                                        className={clsx(
                                            'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
                                            actionChipTone
                                        )}
                                    >
                                        Add &quot;{inlineCustomValidation.normalized}&quot;
                                    </button>
                                </div>
                            )}

                            {normalizedSearch && inlineSuggestionButtons.length === 0 && inlineResultOptions.length === 0 && !inlineCanAddCustom && (
                                <p className="text-[12px] leading-5 text-muted-foreground/68">
                                    No matching options yet.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (isNative) {
        const nativeSelectedValues = canonicalSelectedValues;
        const nativeSuggestions = (suggestions ?? [])
            .filter((suggestion, index, values) => {
                const normalizedSuggestion = normalizeForComparison(suggestion);
                return (
                    !selectedLookup.has(normalizedSuggestion) &&
                    values.findIndex((value) => normalizeForComparison(value) === normalizedSuggestion) === index
                );
            })
            .map((suggestion) => optionLookup.get(normalizeForComparison(suggestion))?.value ?? suggestion);
        const nativeSuggestionLookup = new Set(nativeSuggestions.map(normalizeForComparison));
        const nativeGroups = Object.entries(groupedOptions)
            .map(([category, categoryOptions]): [string, MultiSelectOption[]] => [
                category,
                categoryOptions.filter((option) => {
                    const normalizedValue = normalizeForComparison(option.value);
                    return !selectedLookup.has(normalizedValue) && !nativeSuggestionLookup.has(normalizedValue);
                })
            ])
            .filter(([, categoryOptions]) => categoryOptions.length > 0);
        const selectedCount = nativeSelectedValues.length;
        const hasReachedLimit = Boolean(maxSelections && selectedCount >= maxSelections);

        return (
            <div className={twMerge("space-y-2", className)} ref={containerRef}>
                {(label || description) && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                            {label && (
                                <label htmlFor={fieldId} className="text-[13px] font-medium tracking-[-0.01em] text-foreground/92">
                                    {label}
                                </label>
                            )}
                            {maxSelections && (
                                <span className="text-[11px] font-medium text-muted-foreground/78">
                                    {selectedCount}/{maxSelections}
                                </span>
                            )}
                        </div>
                        {description && <p className="text-[12px] leading-5 text-muted-foreground/82">{description}</p>}
                    </div>
                )}

                <div className="space-y-2">
                    <div className="relative">
                        <select
                            id={fieldId}
                            value=""
                            onChange={(event) => {
                                const nextValue = event.target.value;
                                if (!nextValue) {
                                    return;
                                }

                                handleSelect(nextValue);
                                event.currentTarget.value = '';
                            }}
                            disabled={disabled || hasReachedLimit}
                            className="block h-9 w-full appearance-none rounded-md border border-white/[0.16] bg-white/[0.035] px-3 pr-9 text-sm text-foreground/96 outline-none transition-colors hover:border-white/[0.22] hover:bg-white/[0.05] focus:border-white/[0.28] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">
                                {hasReachedLimit ? 'Selection limit reached' : placeholder}
                            </option>
                            {nativeSuggestions.length > 0 && (
                                <optgroup label={suggestionLabel || 'Suggested'}>
                                    {nativeSuggestions.map((suggestion) => (
                                        <option key={suggestion} value={suggestion}>
                                            {getLabel(suggestion)}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {nativeGroups.map(([category, categoryOptions]) => (
                                <optgroup key={category} label={category}>
                                    {categoryOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <CaretDown
                            size={14}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/88"
                        />
                    </div>

                    {allowCustom && (
                        <div className="flex items-center gap-2">
                            <input
                                id={`${fieldId}-custom`}
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        handleCustomEntry();
                                    }
                                }}
                                placeholder="Type a custom value"
                                className="h-9 w-full rounded-md border border-white/[0.16] bg-white/[0.035] px-3 text-sm text-foreground/96 placeholder:text-muted-foreground/72 outline-none transition-colors hover:border-white/[0.22] hover:bg-white/[0.05] focus:border-white/[0.28]"
                                disabled={disabled || hasReachedLimit}
                            />
                            <button
                                type="button"
                                onClick={handleCustomEntry}
                                disabled={disabled || hasReachedLimit || !searchTerm.trim()}
                                className="h-9 shrink-0 rounded-md px-1.5 text-sm font-medium text-foreground/90 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Add
                            </button>
                        </div>
                    )}

                    {nativeSelectedValues.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {nativeSelectedValues.map((value) => {
                                const labelValue = getLabel(value);

                                return (
                                    <span
                                        key={value}
                                        className="inline-flex h-6 items-center gap-1 rounded-full border border-white/[0.14] bg-white/[0.03] px-2.5 text-[12px] font-medium text-foreground/94"
                                    >
                                        <span className="truncate max-w-[220px]">{labelValue}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(value)}
                                            aria-label={`Remove ${labelValue}`}
                                            className="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground/78 transition-colors hover:text-foreground"
                                        >
                                            <X size={10} weight="bold" />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {hasReachedLimit && (
                        <div className="flex items-center justify-end">
                            <p className="text-[11px] text-muted-foreground/76">
                                Remove one to add another
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

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
                    onMouseDown={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest('button')) {
                            return;
                        }

                        if (!isOpenRef.current) {
                            event.preventDefault();
                            openDropdown();
                        }
                    }}
                    className={clsx(
                        "w-full cursor-text text-left transition-all duration-150",
                        isMinimal
                            ? "rounded-2xl border border-border/60 bg-background/70 shadow-sm"
                            : isLinear
                                ? "min-h-[40px] rounded-none border-b bg-transparent px-2 py-2.5"
                                : "min-h-[42px] rounded-xl border bg-[hsl(var(--background))] px-3 py-2",
                        isMinimal
                            ? (isOpen
                                ? "border-border bg-background ring-1 ring-border/60"
                                : "hover:border-border hover:bg-secondary/20")
                            : isLinear
                                ? (isOpen ? "border-b-[#5E6AD2]" : "border-b-white/[0.06]")
                                : (isOpen ? "border-border ring-1 ring-border/50 shadow-lg" : "border-border/50 hover:border-border hover:bg-secondary/30")
                    )}
                >
                    {isMinimal ? (
                        <>
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="flex h-5 w-5 items-center justify-center text-muted-foreground/70">
                                    <MagnifyingGlass size={16} weight="regular" />
                                </div>

                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        if (!isOpen) {
                                            openDropdown();
                                        }
                                    }}
                                    onFocus={() => {
                                        if (!isOpenRef.current) {
                                            openDropdown();
                                        }
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder={selectedValues.length > 0 ? 'Add another skill...' : placeholder}
                                    className="min-w-[96px] flex-1 border-none bg-transparent py-0.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/55"
                                />

                                <div className="flex items-center gap-2 text-muted-foreground">
                                    {maxSelections && (
                                        <span className="rounded-full border border-border/60 bg-secondary/50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground/80">
                                            {selectedValues.length}/{maxSelections}
                                        </span>
                                    )}
                                    <CaretDown
                                        size={14}
                                        className={clsx("transition-transform duration-200", isOpen && "rotate-180")}
                                    />
                                </div>
                            </div>

                            {selectedValues.length > 0 && (
                                <div className="flex flex-wrap gap-2 border-t border-border/50 px-3 pb-3 pt-2.5">
                                    <AnimatePresence>{selectedValues.map(renderChip)}</AnimatePresence>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {!isLinear && (
                                <div className="absolute left-3 flex items-center text-[#8A8F98] pointer-events-none">
                                    <MagnifyingGlass size={16} weight="regular" className={clsx("transition-colors", isOpen ? "text-foreground" : "")} />
                                </div>
                            )}

                            {isLinear && selectedValues.length === 0 && (
                                <div className="flex h-5 w-5 items-center justify-center text-[#8A8F98]">
                                    <MagnifyingGlass size={16} weight="bold" />
                                </div>
                            )}

                            <AnimatePresence>{selectedValues.map(renderChip)}</AnimatePresence>

                            <input
                                ref={searchRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    if (!isOpen) {
                                        openDropdown();
                                    }
                                }}
                                onFocus={() => {
                                    if (!isOpenRef.current) {
                                        openDropdown();
                                    }
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={selectedValues.length === 0 || isLinear ? (isLinear && selectedValues.length > 0 ? "" : placeholder) : ""}
                                className={clsx(
                                    "min-w-[60px] flex-1 border-none bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground/50",
                                    isLinear ? "text-[#E3E3E3] placeholder:text-[#8A8F98]" : "text-foreground",
                                    !isLinear ? "pl-6" : ""
                                )}
                                style={{ paddingLeft: !isLinear ? '1.5rem' : '0' }}
                            />

                            {maxSelections && (
                                <div className={clsx(isLinear ? "absolute right-2 top-2.5" : "flex items-center gap-2")}>
                                    <span className={clsx(
                                        "text-[10px] font-mono",
                                        isLinear ? "text-white/35" : "text-muted-foreground/40"
                                    )}>
                                        {selectedValues.length}/{maxSelections}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Dropdown Menu */}
                {isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        <motion.div
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
                            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                            ref={listboxRef}
                            className={clsx(
                                "fixed overflow-hidden z-[9999]",
                                isLinear
                                    ? "bg-[#222326] border border-[#2E2F33] rounded-lg shadow-2xl p-1"
                                    : isMinimal
                                        ? "rounded-2xl border border-border/70 bg-[hsl(var(--background))]/95 p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                                        : "bg-[hsl(var(--background))] border border-border rounded-xl shadow-2xl p-1 backdrop-blur-xl"
                            )}
                            style={{
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`,
                                width: `${dropdownPosition.width}px`,
                            }}
                        >
                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                {flatOptions.length === 0 && !allowCustom && !filteredSuggestions.length && (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        No results found
                                    </div>
                                )}

                                {filteredSuggestions.length > 0 && (
                                    <div className="mb-2">
                                        <div className={clsx(
                                            "px-3 py-2 text-[11px] font-medium tracking-[0.01em]",
                                            isLinear ? "text-[#8A8F98]" : isMinimal ? "text-muted-foreground/55" : "text-muted-foreground/60"
                                        )}>
                                            {suggestionLabel || 'Suggested'}
                                        </div>
                                        {filteredSuggestions.map((suggestion) => {
                                            const isSelected = selectedLookup.has(normalizeForComparison(suggestion));
                                            return (
                                                <div
                                                    key={suggestion}
                                                    onClick={() => handleSelect(suggestion)}
                                                    className={clsx(
                                                        "mx-1 flex cursor-pointer items-center justify-between rounded px-3 transition-colors",
                                                        isLinear
                                                            ? "h-8 text-[13px] text-[#EDEDEF] hover:bg-[#2C2D31]"
                                                            : isMinimal
                                                                ? "h-10 text-sm text-foreground hover:bg-secondary/70"
                                                                : "rounded-lg py-2 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                                                        isSelected && (isLinear ? "bg-[#2C2D31]" : "bg-secondary text-foreground")
                                                    )}
                                                >
                                                    <span className="flex-1 truncate">{getLabel(suggestion)}</span>
                                                    {isSelected && (
                                                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className={isLinear ? "text-[#E3E3E3]" : "text-foreground"}>
                                                            <Check size={14} weight="bold" />
                                                        </motion.span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {filteredOptions.length > 0 && (
                                            <div className={clsx("mx-2 my-1 h-px", isLinear ? "bg-[#2E2F33]" : "bg-border/40")} />
                                        )}
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
                                        <span>Create tag &quot;{searchTerm}&quot;</span>
                                    </div>
                                )}

                                {/* Main Options List */}
                                {filteredOptions.map(([category, activeCategoryOptions]) => {
                                    return (
                                        <div key={category}>
                                            {(Object.keys(groupedOptions).length > 1 || category !== 'Other') && (
                                                <div className={clsx(
                                                    "sticky top-0 z-10 mt-1 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] backdrop-blur-sm",
                                                    isLinear
                                                        ? "bg-[#222326]/90 text-[#8A8F98]"
                                                        : isMinimal
                                                            ? "bg-[hsl(var(--background))]/90 text-muted-foreground/50"
                                                            : "bg-[hsl(var(--background))]/90 text-muted-foreground"
                                                )}>
                                                    {category}
                                                </div>
                                            )}

                                            {activeCategoryOptions.map((option) => {
                                                const isSelected = selectedLookup.has(normalizeForComparison(option.value));
                                                const isDisabled = maxSelections && selectedValues.length >= maxSelections && !isSelected;
                                                const index = flatOptions.indexOf(option);

                                                return (
                                                    <div
                                                    key={option.value}
                                                        data-index={index}
                                                        onClick={() => !isDisabled && handleSelect(option.value)}
                                                        className={clsx(
                                                            "mx-1 flex cursor-pointer items-center justify-between rounded px-3 transition-colors",
                                                            isLinear
                                                                ? "h-8 text-[13px]"
                                                                : isMinimal
                                                                    ? "h-10 text-sm"
                                                                    : "rounded-lg py-2 text-sm",

                                                            isLinear
                                                                ? (index === focusedIndex ? "bg-[#2C2D31] text-[#EDEDEF]" : "text-[#EDEDEF] hover:bg-[#2C2D31]")
                                                                : (index === focusedIndex ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"),

                                                            isSelected && !isDisabled
                                                                ? (isLinear ? "text-[#EDEDEF]" : "bg-secondary text-foreground")
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
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}
            </div>
        </div >
    );
}
