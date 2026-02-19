'use client';

import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { X, Check, CaretDownIcon } from '@phosphor-icons/react';
import { searchSkills, POPULAR_SKILLS } from '@/data/skillsData';
import { cn } from '@/lib/utils';

interface SkillsDropdownProps {
    selectedSkills: string[];
    onSkillsChange: (skills: string[]) => void;
    placeholder?: string;
    maxSkills?: number;
    className?: string;
    disabled?: boolean;
    suggestions?: readonly string[];
    suggestionHeaderLabel?: string;
    entityName?: string;
}

export const SkillsDropdown: React.FC<SkillsDropdownProps> = ({
    selectedSkills,
    onSkillsChange,
    placeholder = "Search and select skills...",
    maxSkills = 50,
    className,
    disabled = false,
    suggestions,
    suggestionHeaderLabel = 'Popular Skills',
    entityName = 'skills',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [duplicateError, setDuplicateError] = useState<string | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const inputId = useId();
    const errorId = `${inputId}-error`;
    const normalizedSuggestions = suggestions && suggestions.length > 0
      ? Array.from(new Set(suggestions.map((item) => item.trim()).filter(Boolean)))
      : null;

    const filteredSkills = useMemo(() => {
        let skills: string[] = [];
        const searchLimit = 50;

        if (searchQuery.trim()) {
            if (normalizedSuggestions) {
                const lowercaseQuery = searchQuery.toLowerCase();
                skills = normalizedSuggestions
                    .filter((item) => item.toLowerCase().includes(lowercaseQuery))
                    .slice(0, searchLimit);
            } else {
                skills = searchSkills(searchQuery, searchLimit);
            }
        } else {
            // Show popular skills when no query
            skills = normalizedSuggestions || POPULAR_SKILLS;
        }

        // Remove duplicate skill entries before filtering
        skills = Array.from(new Set(skills));

        // Filter out already selected skills (case-insensitive)
        const normalizedSelected = selectedSkills.map(s => s.toLowerCase());
        skills = skills.filter(skill => !normalizedSelected.includes(skill.toLowerCase()));
        return skills.slice(0, 30); // Limit to 30 for performance
    }, [normalizedSuggestions, searchQuery, selectedSkills]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Backspace to remove last skill when input is empty
        if (e.key === 'Backspace' && searchQuery === '' && selectedSkills.length > 0) {
            e.preventDefault();
            handleSkillRemove(selectedSkills[selectedSkills.length - 1]);
            return;
        }

        // Enter to add current search query if it's not empty and not in dropdown
        if (e.key === 'Enter' && searchQuery.trim() && highlightedIndex === -1) {
            e.preventDefault();
            handleAddSkill(searchQuery);
            return;
        }

        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
                inputRef.current?.focus();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredSkills.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredSkills[highlightedIndex]) {
                    handleSkillSelect(filteredSkills[highlightedIndex]);
                } else if (searchQuery.trim()) {
                    handleAddSkill(searchQuery);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSearchQuery('');
                setHighlightedIndex(-1);
                setDuplicateError(null);
                break;
        }
    };

    const handleSkillSelect = (skill: string) => {
        // Check for duplicates (case-insensitive)
        const normalizedSelected = selectedSkills.map(s => s.toLowerCase());
        if (normalizedSelected.includes(skill.toLowerCase())) {
            setDuplicateError('Already added');
            return;
        }

        if (selectedSkills.length >= maxSkills) {
            setDuplicateError(`Maximum ${maxSkills} skills allowed`);
            return;
        }

        onSkillsChange([...selectedSkills, skill]);
        setSearchQuery('');
        setHighlightedIndex(-1);
        setDuplicateError(null);

        // Keep dropdown open for multiple selections
        inputRef.current?.focus();
    };

    const handleSkillRemove = (skill: string) => {
        onSkillsChange(selectedSkills.filter(s => s !== skill));
        setDuplicateError(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        setHighlightedIndex(-1);
        setDuplicateError(null);
        if (!isOpen && value.trim()) {
            setIsOpen(true);
        }
    };

    const handleAddSkill = (skill: string) => {
        const normalizedSkill = skill.trim();
        if (!normalizedSkill) return;

        // Check for duplicates (case-insensitive)
        const normalizedSelected = selectedSkills.map(s => s.toLowerCase());
        if (normalizedSelected.includes(normalizedSkill.toLowerCase())) {
            setDuplicateError('Already added');
            return;
        }

        if (selectedSkills.length >= maxSkills) {
            setDuplicateError(`Maximum ${maxSkills} skills allowed`);
            return;
        }

        // Normalize casing: capitalize first letter, handle acronyms
        const formattedSkill = normalizedSkill
            .split(' ')
            .map(word => {
                // Handle common acronyms
                const acronyms = ['SQL', 'API', 'UI', 'UX', 'ML', 'AI', 'BI', 'CI', 'CD', 'AWS', 'GCP', 'REST', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS'];
                const upperWord = word.toUpperCase();
                if (acronyms.includes(upperWord)) {
                    return upperWord;
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');

        onSkillsChange([...selectedSkills, formattedSkill]);
        setSearchQuery('');
        setDuplicateError(null);
        inputRef.current?.focus();
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            inputRef.current?.focus();
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            }
        }
    }, [highlightedIndex]);

    return (
        <div ref={dropdownRef} className={cn('relative space-y-3', className)}>
            {/* Tags Display */}
            {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedSkills.map((skill) => (
                        <span
                            key={skill}
                            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[13px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                        >
                            {skill}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSkillRemove(skill);
                                }}
                                className="ml-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 focus:outline-none rounded transition-colors"
                                disabled={disabled}
                                aria-label={`Remove ${skill}`}
                                tabIndex={0}
                            >
                                <X size={12} weight="bold" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Input + Dropdown Container */}
            <div
                className={cn(
                    'flex items-center gap-2 p-2 px-3 rounded-md border shadow-sm transition-all',
                    'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800',
                    'focus-within:ring-2 focus-within:ring-zinc-900/10 dark:focus-within:ring-white/10 focus-within:border-zinc-500 dark:focus-within:border-zinc-500',
                    duplicateError && 'border-red-500 focus-within:border-red-500',
                    disabled && 'pointer-events-none opacity-70'
                )}
            >
                <input
                    id={inputId}
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="bg-transparent border-none outline-none text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 flex-1 focus:outline-none focus:ring-0 px-0 py-0"
                    aria-describedby={duplicateError ? errorId : undefined}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                />
                {searchQuery.trim() ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddSkill(searchQuery);
                        }}
                        className="px-2 py-0.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10 rounded-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                        disabled={disabled || !!duplicateError}
                        aria-label="Add skill"
                    >
                        Add
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown();
                        }}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none transition-colors p-0.5"
                        disabled={disabled}
                        aria-label={isOpen ? 'Close suggestions' : 'Show suggestions'}
                        aria-expanded={isOpen}
                    >
                        <CaretDownIcon size={14} className={cn('transition-transform', isOpen && 'rotate-180')} />
                    </button>
                )}
            </div>

            {/* Error Message */}
            {duplicateError && (
                <p
                    id={errorId}
                    className="mt-1.5 text-xs text-red-400"
                    role="alert"
                >
                    {duplicateError}
                </p>
            )}

            {/* Keyboard Hint */}
            {selectedSkills.length > 0 && (
                <p className="mt-1.5 text-xs text-zinc-500">
                    Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-[10px]">Enter</kbd> to add, <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-[10px]">Backspace</kbd> to remove last
                </p>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/5 bg-zinc-900 shadow-2xl"
                    role="listbox"
                    aria-label="Skill suggestions"
                >
                    {/* Header with Popular label */}
                    {!searchQuery.trim() && (
                        <div className="px-4 py-2 border-b border-white/5 bg-zinc-900/50">
                            <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                                {suggestionHeaderLabel}
                            </span>
                        </div>
                    )}

                    {/* Skills List */}
                    <div ref={listRef} className="max-h-60 overflow-y-auto bg-zinc-900">
                        {filteredSkills.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-zinc-500 text-center">
                                {searchQuery ? `No ${entityName} found` : `No ${entityName} available`}
                            </div>
                        ) : (
                            filteredSkills.map((skill, index) => (
                                <button
                                    key={skill}
                                    type="button"
                                    onClick={() => handleSkillSelect(skill)}
                                    role="option"
                                    aria-selected={selectedSkills.includes(skill)}
                                    className={cn(
                                        'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-zinc-300 transition-colors',
                                        'hover:bg-white/5 focus:bg-white/5 focus:outline-none',
                                        index === highlightedIndex && 'bg-white/5'
                                    )}
                                >
                                    <span>{skill}</span>
                                    {selectedSkills.includes(skill) && (
                                        <Check size={16} className="text-teal-400" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SkillsDropdown;
