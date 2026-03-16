'use client';

import React from 'react';
import { ROLE_TAXONOMY } from '@/types/career';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface RoleAutocompleteProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    ariaDescribedBy?: string;
    className?: string;
    placeholder?: string;
    showSuccess?: boolean;
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
    placeholder = 'Select your role...',
    showSuccess = false,
    hideLabel = false,
    hideHint = false
}: RoleAutocompleteProps) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId, _ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    return (
        <div className={twMerge('space-y-1.5', className)}>
            {!hideLabel && (
                <div className="flex items-center justify-between">
                    <label htmlFor={id} className="text-[14px] font-medium text-zinc-700 dark:text-zinc-300 sm:text-[13px]">
                        {label}
                        {required && <span className="ml-0.5 text-red-500/80">*</span>}
                    </label>
                </div>
            )}

            {!hideHint && hint && (
                <p id={hintId} className="text-[13px] text-zinc-500 dark:text-zinc-500 sm:text-[12px]">
                    {hint}
                </p>
            )}

            <div className="relative">
                <select
                    id={id}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    aria-label={hideLabel ? label : undefined}
                    aria-describedby={describedBy}
                    className={clsx(
                        'w-full rounded-md border px-3 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition-all duration-150 focus:ring-1 sm:min-h-[38px] sm:py-2 sm:text-[13px]',
                        'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100 focus:border-zinc-500 focus:ring-zinc-500 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-zinc-100 dark:hover:border-white/[0.15] dark:hover:bg-white/[0.08] dark:focus:border-zinc-500 dark:focus:ring-zinc-500',
                        error ? 'border-red-500/50 bg-red-50 focus:border-red-500 focus:ring-red-500 dark:bg-red-900/10' : '',
                        showSuccess && !error ? 'border-emerald-500/50 bg-emerald-500/5' : ''
                    )}
                >
                    <option value="">{placeholder}</option>
                    {Object.entries(ROLE_TAXONOMY).map(([category, roles]) => (
                        <optgroup key={category} label={category}>
                            {roles.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {error && (
                <p id={errorId} className="mt-1 text-sm text-red-400" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
