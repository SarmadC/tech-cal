'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MaterialIcon, type IconName } from '@/components/ui/Icon';

export interface NavigationLinkItem {
    type?: 'item';
    key?: string;
    label: string;
    href: string;
    icon?: IconName;
    aliases?: string[]; // Other paths that should activate this item
}

export interface NavigationHeaderItem {
    type: 'header';
    key?: string;
    label: string;
}

export type NavigationItem = NavigationLinkItem | NavigationHeaderItem;

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
    const searchParams = useSearchParams();
    const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] lg:flex-row lg:gap-12">
            {/* Sidebar Navigation */}
            <aside className="w-full lg:w-64 flex-shrink-0 mb-8 lg:mb-0">
                <nav className="space-y-1 -ml-3">
                    {navigationItems.map((item) => {
                        if (item.type === 'header') {
                            return (
                                <p
                                    key={item.key || `header-${item.label}`}
                                    className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-tertiary)]"
                                >
                                    {item.label}
                                </p>
                            );
                        }

                        // Check for exact match or alias match
                        // If href has query params, check exact match on full path
                        // If href has no query params, check pathname match
                        const href = item.href;
                        let isActive = false;
                        if (href.includes('?')) {
                            isActive = currentPath === href || currentPath.startsWith(href + '&');
                        } else {
                            isActive = pathname === href || (item.aliases?.some(alias => pathname.startsWith(alias)) ?? false);
                        }

                        return (
                            <Link
                                key={item.key || href}
                                href={href}
                                className={cn(
                                    "group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200",
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
