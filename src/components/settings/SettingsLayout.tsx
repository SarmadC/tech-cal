'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MaterialIcon } from '@/components/ui/Icon';

export interface NavigationItem {
    label: string;
    href: string;
    icon?: string;
    aliases?: string[]; // Other paths that should activate this item
}

interface SettingsLayoutProps {
    children: React.ReactNode;
    navigationItems: NavigationItem[];
    title?: string;
    description?: string;
}

export function SettingsLayout({
    children,
    navigationItems,
    title = 'Settings',
    description = 'Manage your account settings and preferences.',
}: SettingsLayoutProps) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] lg:flex-row lg:gap-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Sidebar Navigation */}
            <aside className="w-full lg:w-64 flex-shrink-0 mb-8 lg:mb-0">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[var(--foreground-primary)] tracking-tight">{title}</h1>
                    <p className="text-sm text-[var(--foreground-secondary)] mt-1">{description}</p>
                </div>

                <nav className="space-y-1">
                    {navigationItems.map((item) => {
                        const searchParams = useSearchParams();
                        const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

                        // Check for exact match or alias match
                        // If href has query params, check exact match on full path
                        // If href has no query params, check pathname match
                        let isActive = false;
                        if (item.href.includes('?')) {
                            isActive = currentPath === item.href || currentPath.startsWith(item.href + '&');
                        } else {
                            isActive = pathname === item.href || (item.aliases?.some(alias => pathname.startsWith(alias)) ?? false);
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                                    isActive
                                        ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                                        : "text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] hover:bg-[var(--background-secondary)]"
                                )}
                            >

                                {item.icon && (
                                    <MaterialIcon
                                        name={item.icon}
                                        size={18}
                                        className={cn(
                                            "transition-colors",
                                            isActive ? "text-[var(--accent-primary)]" : "text-[var(--foreground-tertiary)] group-hover:text-[var(--foreground-secondary)]"
                                        )}
                                    />
                                )}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
                <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
}
