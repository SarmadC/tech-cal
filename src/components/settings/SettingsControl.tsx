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
                "group py-2.5 grid gap-4 border-b border-[var(--border-default)]/40 last:border-0 items-start",
                layout === 'column' ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-[200px_1fr]",
                className
            )}
            {...props}
        >
            <div className={cn("min-w-0 space-y-0.5", layout === 'row' ? "pt-1.5" : "mb-2")}>
                {label && (
                    <label className="block text-[13px] font-medium text-[var(--foreground-primary)]">
                        {label}
                    </label>
                )}
                {description && (
                    <div className="text-[13px] text-[var(--foreground-tertiary)] bg-transparent leading-relaxed">
                        {description}
                    </div>
                )}
            </div>

            <div className="min-w-0">
                {children || action}
            </div>
        </div>
    );
}
