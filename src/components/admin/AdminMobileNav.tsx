'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, type ReactNode, useEffect } from 'react';

import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useAdminQueueCounts } from '@/hooks/useAdminQueueCounts';

type NavItem = {
    title: string;
    href: string;
    icon: ReactNode;
    badge?: number | null;
};

type NavSection = {
    label: string;
    items: NavItem[];
};

const BASE_PATH = '/admin';

interface AdminMobileNavProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminMobileNav({ isOpen, onClose }: AdminMobileNavProps) {
    const pathname = usePathname();
    const { counts } = useAdminQueueCounts();

    // Close nav when route changes
    useEffect(() => {
        onClose();
    }, [pathname, onClose]);

    // Prevent body scroll when nav is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const sections: NavSection[] = useMemo(
        () => [
            {
                label: 'Overview',
                items: [
                    {
                        title: 'Command Center',
                        href: BASE_PATH,
                        icon: <MaterialIcon name="dashboard" size={20} />,
                    },
                ],
            },
            {
                label: 'Ingestion',
                items: [
                    {
                        title: 'Update Queue',
                        href: `${BASE_PATH}/ingestion/update-queue`,
                        icon: <MaterialIcon name="menu" size={20} />,
                        badge: counts?.updateQueue ?? null,
                    },
                    {
                        title: 'Moderation',
                        href: `${BASE_PATH}/ingestion/moderation`,
                        icon: <MaterialIcon name="warning" size={20} />,
                        badge: counts?.moderation ?? null,
                    },
                    {
                        title: 'Enrichment',
                        href: `${BASE_PATH}/ingestion/enrichment`,
                        icon: <MaterialIcon name="star" size={20} />,
                        badge: counts?.enrichment ?? null,
                    },
                    {
                        title: 'Field Protection',
                        href: `${BASE_PATH}/ingestion/field-protection`,
                        icon: <MaterialIcon name="warning" size={20} />,
                        badge: counts?.fieldProtection ?? null,
                    },
                ],
            },
            {
                label: 'System',
                items: [
                    {
                        title: 'API Activity',
                        href: `${BASE_PATH}/utilities/activity`,
                        icon: <MaterialIcon name="code" size={20} />,
                    },
                    {
                        title: 'Reports',
                        href: `${BASE_PATH}/utilities/reports`,
                        icon: <MaterialIcon name="bar-chart" size={20} />,
                    },
                ],
            },
        ],
        [counts]
    );

    const isActive = (href: string, exact?: boolean) => {
        if (exact || href === BASE_PATH) {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-out nav drawer */}
            <nav
                className={cn(
                    'fixed left-0 top-0 z-[80] h-full w-[280px] bg-background-main shadow-2xl transition-transform duration-300 ease-out md:hidden',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                aria-label="Mobile admin navigation"
            >
                {/* Header */}
                <div className="flex h-14 items-center justify-between border-b border-default px-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-sm border border-accent-primary/50 bg-accent-primary-light">
                            <div className="h-2.5 w-2.5 rounded-full bg-accent-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground-secondary">Tech-Cal Admin</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-tertiary transition-colors hover:bg-accent-primary-light hover:text-foreground-secondary"
                        aria-label="Close navigation"
                    >
                        <MaterialIcon name="close" size={20} />
                    </button>
                </div>

                {/* Navigation content */}
                <div className="flex-1 overflow-y-auto px-3 py-4">
                    {sections.map((section) => (
                        <div key={section.label} className="mb-6">
                            <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
                                {section.label}
                            </div>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const active = isActive(item.href, item.href === BASE_PATH);
                                    return (
                                        <Link
                                            key={item.title}
                                            href={item.href}
                                            className={cn(
                                                'group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors',
                                                active
                                                    ? 'bg-accent-primary-light font-medium text-foreground-primary'
                                                    : 'text-foreground-tertiary hover:bg-accent-primary-light hover:text-foreground-secondary'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={cn(
                                                        'transition-colors',
                                                        active
                                                            ? 'text-accent-primary'
                                                            : 'text-foreground-muted group-hover:text-foreground-tertiary'
                                                    )}
                                                >
                                                    {item.icon}
                                                </span>
                                                <span>{item.title}</span>
                                            </div>
                                            {item.badge ? (
                                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-primary-light px-1.5 text-[11px] font-medium text-accent-primary">
                                                    {item.badge}
                                                </span>
                                            ) : null}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="border-t border-default p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-primary/80 text-xs font-bold text-accent-primary-foreground">
                            A
                        </div>
                        <div className="flex-1">
                            <div className="text-sm text-foreground-tertiary">Admin User</div>
                            <div className="text-xs text-foreground-muted">admin [at] tech-cal [dot] com</div>
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
}
