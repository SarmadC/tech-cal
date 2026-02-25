'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useAdminQueueCounts } from '@/hooks/useAdminQueueCounts';

type NavItem = {
    title: string;
    description?: string;
    href: string;
    icon: ReactNode;
    badge?: number | null;
    hotkey?: string;
    exact?: boolean;
};

type NavSection = {
    label: string;
    items: NavItem[];
};

const BASE_PATH = '/admin';

export default function AdminSidebar() {
    const pathname = usePathname();
    const { open, toggle } = useSidebar();
    const { counts } = useAdminQueueCounts();

    const sections: NavSection[] = useMemo(
        () => [
            {
                label: 'Overview',
                items: [
                    {
                        title: 'Command Center',
                        href: BASE_PATH,
                        icon: <MaterialIcon name="dashboard" size={16} />,
                        exact: true,
                    },
                ],
            },
            {
                label: 'Events',
                items: [
                    {
                        title: 'All Events',
                        href: `${BASE_PATH}/events`,
                        icon: <MaterialIcon name="calendar" size={16} />,
                        hotkey: 'G A',
                    },
                    {
                        title: 'Hackathons',
                        href: `${BASE_PATH}/hackathons`,
                        icon: <MaterialIcon name="code" size={16} />,
                        hotkey: 'G H',
                    },
                ],
            },
            {
                label: 'Ingestion',
                items: [
                    {
                        title: 'Update Queue',
                        href: `${BASE_PATH}/ingestion/update-queue`,
                        icon: <MaterialIcon name="menu" size={16} />,
                        badge: counts?.updateQueue ?? null,
                        hotkey: 'G U',
                    },
                    {
                        title: 'Moderation',
                        href: `${BASE_PATH}/ingestion/moderation`,
                        icon: <MaterialIcon name="warning" size={16} />,
                        badge: counts?.moderation ?? null,
                        hotkey: 'G M',
                    },
                    {
                        title: 'Enrichment',
                        href: `${BASE_PATH}/ingestion/enrichment`,
                        icon: <MaterialIcon name="star" size={16} />,
                        badge: counts?.enrichment ?? null,
                        hotkey: 'G E',
                    },
                    {
                        title: 'Field Protection',
                        href: `${BASE_PATH}/ingestion/field-protection`,
                        icon: <MaterialIcon name="warning" size={16} />,
                        badge: counts?.fieldProtection ?? null,
                        hotkey: 'G F',
                    },
                ],
            },
            {
                label: 'Content',
                items: [
                    {
                        title: 'Blog',
                        href: `${BASE_PATH}/blog`,
                        icon: <MaterialIcon name="edit" size={16} />,
                    },
                ],
            },
            {
                label: 'System',
                items: [
                    {
                        title: 'API Activity',
                        href: `${BASE_PATH}/utilities/activity`,
                        icon: <MaterialIcon name="code" size={16} />,
                    },
                    {
                        title: 'Reports',
                        href: `${BASE_PATH}/utilities/reports`,
                        icon: <MaterialIcon name="bar-chart" size={16} />,
                    },
                ],
            },
        ],
        [counts]
    );

    const isActive = (item: NavItem) => {
        if (item.exact) {
            return pathname === item.href;
        }
        return pathname.startsWith(item.href);
    };

    return (
        <Sidebar className="bg-background-main border-r border-default text-foreground-primary">
            {open ? (
                <>
                    <SidebarHeader className="h-12 flex items-center justify-between px-4 border-b border-default">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-sm bg-accent-primary-light border border-accent-primary/50 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-accent-primary" />
                            </div>
                            <span className="text-sm font-medium text-foreground-secondary">Tech-Cal Admin</span>
                        </div>
                        <button
                            onClick={() => toggle()}
                            className="text-foreground-muted hover:text-foreground-tertiary transition-colors"
                        >
                            <MaterialIcon name="chevron_left" size={16} />
                        </button>
                    </SidebarHeader>
                    <SidebarContent className="px-2 py-4 space-y-6">
                        {sections.map((section) => (
                            <div key={section.label}>
                                <div className="px-2 mb-1 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
                                    {section.label}
                                </div>
                                <div className="space-y-0.5">
                                    {section.items.map((item) => {
                                        const active = isActive(item);
                                        return (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                className={cn(
                                                    'group flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] transition-colors',
                                                    active
                                                        ? 'bg-accent-primary-light text-foreground-primary font-medium'
                                                        : 'text-foreground-tertiary hover:bg-accent-primary-light hover:text-foreground-secondary'
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className={cn("transition-colors", active ? "text-accent-primary" : "text-foreground-muted group-hover:text-foreground-tertiary")}>
                                                        {item.icon}
                                                    </span>
                                                    <span>{item.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {item.badge ? (
                                                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[10px] font-medium bg-accent-primary-light text-accent-primary">
                                                            {item.badge}
                                                        </span>
                                                    ) : null}
                                                    {item.hotkey && (
                                                        <span className="hidden group-hover:inline-block text-[10px] text-foreground-muted font-mono">
                                                            {item.hotkey}
                                                        </span>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </SidebarContent>
                    <SidebarFooter className="p-4 border-t border-default">
                        <div className="flex items-center gap-2 text-xs text-foreground-muted">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-accent-primary to-accent-primary/80 flex items-center justify-center text-accent-primary-foreground text-[10px] font-bold">
                                A
                            </div>
                            <div className="flex-1">
                                <div className="text-foreground-tertiary">Admin User</div>
                                <div className="text-[10px]">admin [at] tech-cal [dot] com</div>
                            </div>
                        </div>
                    </SidebarFooter>
                </>
            ) : (
                <SidebarContent className="flex flex-col items-center py-4 gap-4">
                    <button
                        onClick={() => toggle()}
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent-primary-light text-foreground-tertiary"
                    >
                        <MaterialIcon name="menu" size={16} />
                    </button>
                    {sections.flatMap(s => s.items).map((item) => {
                        const active = isActive(item);
                        return (
                            <Link
                                key={item.title}
                                href={item.href}
                                title={item.title}
                                className={cn(
                                    'h-8 w-8 flex items-center justify-center rounded-md transition-colors',
                                    active ? 'bg-accent-primary-light text-accent-primary' : 'text-foreground-muted hover:bg-accent-primary-light hover:text-foreground-tertiary'
                                )}
                            >
                                {item.icon}
                            </Link>
                        );
                    })}
                </SidebarContent>
            )}
        </Sidebar>
    );
}

