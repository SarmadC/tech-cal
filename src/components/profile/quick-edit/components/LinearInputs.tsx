import React from 'react';
import { CaretDown } from '@phosphor-icons/react';

// --- Linear-style Form Shared Components ---

// Custom Form Field with consistent spacing and labeling
interface LinearFormFieldProps {
    label: string;
    description?: string;
    error?: string;
    children: React.ReactNode;
    className?: string;
    required?: boolean;
}

export const LinearFormField: React.FC<LinearFormFieldProps> = ({
    label,
    description,
    error,
    children,
    className = '',
    required
}) => {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <div className="flex items-center justify-between">
                <label className="text-[14px] sm:text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                    {label}
                    {required && <span className="text-red-500/80 ml-0.5">*</span>}
                </label>
            </div>
            {children}
            {description && !error && (
                <p className="text-[13px] sm:text-[12px] text-zinc-500 dark:text-zinc-500 leading-normal">{description}</p>
            )}
            {error && (
                <p className="text-[13px] sm:text-[12px] text-red-500 font-medium flex items-center gap-1">
                    {error}
                </p>
            )}
        </div>
    );
};

interface LinearInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    hasError?: boolean;
}

export const LinearInput = React.forwardRef<HTMLInputElement, LinearInputProps>(({ className, hasError, ...props }, ref) => {
    return (
        <input
            ref={ref}
            className={`
                w-full px-3 py-2.5 sm:py-2 text-[15px] sm:text-[13px] rounded-lg sm:rounded-md transition-all duration-150 outline-none
                bg-zinc-50 dark:bg-white/[0.06]
                text-zinc-900 dark:text-zinc-100 
                placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                border border-zinc-200 dark:border-white/[0.08]
                shadow-sm
                ${hasError
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-500/50 focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500'
                    : 'hover:border-zinc-300 dark:hover:border-white/[0.15] hover:bg-zinc-100 dark:hover:bg-white/[0.08] focus:bg-white dark:focus:bg-[#2C2D30] focus-visible:border-zinc-500 dark:focus-visible:border-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-0'
                }
                ${className}
            `}
            {...props}
        />
    );
});
LinearInput.displayName = 'LinearInput';

// Custom Select
interface LinearSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    children: React.ReactNode;
    hasError?: boolean;
}

export const LinearSelect = React.forwardRef<HTMLSelectElement, LinearSelectProps>(({ children, className, hasError, ...props }, ref) => {
    return (
        <div className="relative">
            <select
                ref={ref}
                className={`
                    w-full appearance-none px-3 py-2.5 sm:py-2 text-[15px] sm:text-[13px] rounded-lg sm:rounded-md transition-all duration-150 outline-none
                    bg-zinc-50 dark:bg-white/[0.06]
                    text-zinc-900 dark:text-zinc-100
                    border border-zinc-200 dark:border-white/[0.08]
                    shadow-sm
                    ${hasError
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-500/50 focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500'
                        : 'hover:border-zinc-300 dark:hover:border-white/[0.15] hover:bg-zinc-100 dark:hover:bg-white/[0.08] focus:bg-white dark:focus:bg-[#2C2D30] focus-visible:border-zinc-500 dark:focus-visible:border-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-500 focus-visible:ring-offset-0'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${className}
                `}
                {...props}
            >
                {children}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500">
                <CaretDown size={14} />
            </div>
        </div>
    );
});
LinearSelect.displayName = 'LinearSelect';

interface LinearCheckboxGroupProps {
    label: string;
    description?: string;
    options: Array<{ value: string; label: string }>;
    selectedValues: string[];
    onChange: (values: string[]) => void;
    columns?: 1 | 2;
    className?: string;
}

export const LinearCheckboxGroup: React.FC<LinearCheckboxGroupProps> = ({
    label,
    description,
    options,
    selectedValues,
    onChange,
    columns = 2,
    className = ''
}) => {
    const handleToggle = (value: string) => {
        const newValues = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newValues);
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div>
                <label className="block text-[13px] font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    {label}
                </label>
                {description && (
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-500 mb-2 leading-normal">{description}</p>
                )}
                <div className={`grid gap-1.5 ${columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    {options.map((option) => (
                        <label
                            key={option.value}
                            className={`
                                flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150
                                ${selectedValues.includes(option.value)
                                    ? 'bg-zinc-100 dark:bg-[#1B1B1B]'
                                    : 'bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                }
                            `}
                        >
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(option.value)}
                                onChange={() => handleToggle(option.value)}
                                className="w-3.5 h-3.5 rounded border-zinc-300 text-zinc-800 focus:ring-1 focus:ring-zinc-500 focus:ring-offset-0 dark:border-zinc-600 dark:bg-zinc-800 dark:checked:bg-zinc-600"
                            />
                            <span className="text-[13px] text-zinc-700 dark:text-zinc-300">{option.label}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const LinearDivider = () => (
    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-6" />
);
