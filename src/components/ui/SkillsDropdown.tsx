'use client';

import React, { useId, useMemo, useState } from 'react';
import { X } from '@phosphor-icons/react';

import { POPULAR_SKILLS } from '@/data/skillsData';
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
    placeholder = 'Select an option...',
    maxSkills = 50,
    className,
    disabled = false,
    suggestions,
    suggestionHeaderLabel = 'Suggested Options',
    entityName = 'skills',
}) => {
    const [duplicateError, setDuplicateError] = useState<string | null>(null);
    const [selectValue, setSelectValue] = useState('');
    const inputId = useId();
    const errorId = `${inputId}-error`;

    const normalizedSuggestions = useMemo(
        () => (suggestions && suggestions.length > 0
            ? Array.from(new Set(suggestions.map((item) => item.trim()).filter(Boolean)))
            : POPULAR_SKILLS),
        [suggestions]
    );

    const availableOptions = useMemo(() => {
        const normalizedSelected = new Set(selectedSkills.map((skill) => skill.toLowerCase()));

        return normalizedSuggestions.filter((skill) => !normalizedSelected.has(skill.toLowerCase()));
    }, [normalizedSuggestions, selectedSkills]);

    const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const nextSkill = event.target.value;
        setSelectValue(nextSkill);

        if (!nextSkill) {
            setDuplicateError(null);
            return;
        }

        const normalizedSelected = new Set(selectedSkills.map((skill) => skill.toLowerCase()));
        if (normalizedSelected.has(nextSkill.toLowerCase())) {
            setDuplicateError('Already added');
            setSelectValue('');
            return;
        }

        if (selectedSkills.length >= maxSkills) {
            setDuplicateError(`Maximum ${maxSkills} ${entityName} allowed`);
            setSelectValue('');
            return;
        }

        onSkillsChange([...selectedSkills, nextSkill]);
        setDuplicateError(null);
        setSelectValue('');
    };

    const handleRemove = (skill: string) => {
        onSkillsChange(selectedSkills.filter((selectedSkill) => selectedSkill !== skill));
        setDuplicateError(null);
    };

    const describedBy = duplicateError ? errorId : undefined;

    return (
        <div className={cn('relative space-y-2', className)}>
            {selectedSkills.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                        Selected {entityName}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {selectedSkills.map((skill) => (
                            <span
                                key={skill}
                                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 text-[12px] font-medium text-zinc-700 transition-colors dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-200"
                            >
                                {skill}
                                <button
                                    type="button"
                                    onClick={() => handleRemove(skill)}
                                    disabled={disabled}
                                    aria-label={`Remove ${skill}`}
                                    className="rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-700 focus:outline-none dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
                                >
                                    <X size={11} weight="bold" />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 shadow-sm transition-colors dark:border-white/[0.08] dark:bg-white/[0.04]">
                <select
                    id={inputId}
                    value={selectValue}
                    onChange={handleSelect}
                    disabled={disabled || availableOptions.length === 0}
                    aria-describedby={describedBy}
                    className="w-full appearance-auto border-0 bg-transparent px-0 py-0 text-[13px] font-medium text-zinc-900 outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-zinc-100 dark:disabled:text-zinc-500"
                >
                    <option value="">
                        {availableOptions.length > 0 ? placeholder : `No ${entityName} available`}
                    </option>
                    <optgroup label={suggestionHeaderLabel}>
                        {availableOptions.map((skill) => (
                            <option key={skill} value={skill}>
                                {skill}
                            </option>
                        ))}
                    </optgroup>
                </select>
            </div>

            <p className="text-[12px] text-zinc-500 dark:text-zinc-500">
                {selectedSkills.length} of {maxSkills} {entityName} selected
            </p>

            {duplicateError && (
                <p id={errorId} className="text-[12px] font-medium text-red-500" role="alert">
                    {duplicateError}
                </p>
            )}
        </div>
    );
};

export default SkillsDropdown;
