import React from 'react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    description?: string;
    children: React.ReactNode;
}

export function SettingsSection({
    title,
    description,
    children,
    className,
    ...props
}: SettingsSectionProps) {
    return (
        <section className={cn("space-y-4", className)} {...props}>
            {(title || description) && (
                <div className="mb-4">
                    {title && (
                        <h3 className="text-lg font-medium text-[var(--foreground-primary)] tracking-tight mb-1">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
            )}
            <div className="space-y-px bg-[var(--border-default)] rounded-lg overflow-hidden border border-[var(--border-default)]">
                {children}
            </div>
        </section>
    );
}
