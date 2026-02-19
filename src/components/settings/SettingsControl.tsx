import React from 'react';
import { cn } from '@/lib/utils';

interface SettingsControlProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
    layout?: 'row' | 'column'; // Default is 'row'
    children?: React.ReactNode;
}

export function SettingsControl({
    label,
    description,
    action,
    layout = 'row',
    children,
    className,
    ...props
}: SettingsControlProps) {
    return (
        <div
            className={cn(
                "bg-[var(--background-main)] p-4 sm:p-5 transition-colors group hover:bg-[var(--background-secondary)]/30",
                layout === 'row' ? "sm:flex sm:items-start sm:justify-between sm:gap-4" : "block",
                className
            )}
            {...props}
        >
            <div className={cn("flex-1 min-w-0 space-y-1", layout === 'row' ? "mb-4 sm:mb-0" : "mb-4")}>
                {label && (
                    <label className="block text-sm font-medium text-[var(--foreground-primary)]">
                        {label}
                    </label>
                )}
                {description && (
                    <div className="text-sm text-[var(--foreground-secondary)] leading-relaxed">
                        {description}
                    </div>
                )}
            </div>

            <div className={cn("flex-shrink-0", layout === 'row' ? "sm:ml-4 self-center" : "")}>
                {children || action}
            </div>
        </div>
    );
}
