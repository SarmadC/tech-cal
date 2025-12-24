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
                        description: "Today's pipeline health",
                        href: BASE_PATH,
                        icon: <MaterialIcon name="dashboard" size={18} />,
                        exact: true,
                    },
                ],
            },
            {
                label: 'Ingestion Pipeline',
                items: [
                    {
                        title: 'Update Queue',
                        description: 'Review pending event merges',
                        href: `${BASE_PATH}/ingestion/update-queue`,
                        icon: <MaterialIcon name="refresh" size={18} />,
                        badge: counts?.updateQueue ?? null,
                        hotkey: 'g u',
                    },
                    {
                        title: 'Moderation',
                        description: 'Flagged items & human review',
                        href: `${BASE_PATH}/ingestion/moderation`,
                        icon: <MaterialIcon name="warning" size={18} />,
                        badge: counts?.moderation ?? null,
                        hotkey: 'g m',
                    },
                    {
                        title: 'Enrichment',
                        description: 'Metadata and AI enhancements',
                        href: `${BASE_PATH}/ingestion/enrichment`,
                        icon: <MaterialIcon name="trending-up" size={18} />,
                        badge: counts?.enrichment ?? null,
                        hotkey: 'g e',
                    },
                    {
                        title: 'Field Protection',
                        description: 'Lock critical fields from overrides',
                        href: `${BASE_PATH}/ingestion/field-protection`,
                        icon: <MaterialIcon name="settings" size={18} />,
                        badge: counts?.fieldProtection ?? null,
                        hotkey: 'g f',
                    },
                ],
            },
            {
                label: 'Utilities',
                items: [
                    {
                        title: 'API Activity',
                        description: 'Audit recent ingestion jobs',
                        href: `${BASE_PATH}/utilities/activity`,
                        icon: <MaterialIcon name="compass" size={18} />,
                    },
                    {
                        title: 'Reports',
                        description: 'Scheduled digests & exports',
                        href: `${BASE_PATH}/utilities/reports`,
                        icon: <MaterialIcon name="bar-chart" size={18} />,
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
        <Sidebar className="bg-slate-950 text-slate-100">
            {open ? (
                <>
                    <SidebarHeader className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-slate-400">Tech-Cal</p>
                            <h2 className="text-base font-semibold">Admin Console</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                (document.activeElement as HTMLElement | null)?.blur?.();
                                toggle();
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/10"
                            aria-label="Collapse admin navigation"
                            title="Collapse admin navigation"
                        >
                            <MaterialIcon name="chevron_double_left" size={16} />
                        </button>
                    </SidebarHeader>
                    <SidebarContent className="space-y-6">
                        {sections.map((section) => (
                            <SidebarGroup key={section.label}>
                                <SidebarGroupLabel className="px-2 text-[11px] text-slate-400">
                                    {section.label}
                                </SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {section.items.map((item) => {
                                            const active = isActive(item);
                                            return (
                                                <SidebarMenuItem key={item.title}>
                                                    <SidebarMenuButton asChild>
                                                        <Link
                                                            href={item.href}
                                                            className={cn(
                                                                'group relative flex items-start gap-3 rounded-md px-3 py-2 text-left transition-colors',
                                                                active
                                                                    ? 'bg-white/10 text-white shadow-inner'
                                                                    : 'text-slate-200 hover:bg-white/5'
                                                            )}
                                                        >
                                                            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-slate-100 transition group-hover:bg-white/20">
                                                                {item.icon}
                                                            </span>
                                                            <span className="flex-1">
                                                                <span className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium leading-none">
                                                                        {item.title}
                                                                    </span>
                                                                    {typeof item.badge === 'number' && (
                                                                        <Badge variant="secondary" className="bg-slate-800 text-xs">
                                                                            {item.badge}
                                                                        </Badge>
                                                                    )}
                                                                </span>
                                                                {item.description && (
                                                                    <span className="mt-1 block text-xs leading-snug text-slate-400">
                                                                        {item.description}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {item.hotkey && (
                                                                <kbd className="rounded border border-white/20 bg-white/5 px-2 py-1 text-[10px] uppercase text-slate-300">
                                                                    {item.hotkey}
                                                                </kbd>
                                                            )}
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            );
                                        })}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        ))}
                    </SidebarContent>
                    <SidebarFooter className="px-3 py-4 text-xs text-slate-500">
                        <p>Keyboard shortcuts: press `?`</p>
                    </SidebarFooter>
                </>
            ) : (
                <>
                    <SidebarContent className="flex h-full flex-col items-center gap-6 py-5">
                        <button
                            type="button"
                            onClick={() => {
                                (document.activeElement as HTMLElement | null)?.blur?.();
                                toggle();
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-200 transition hover:bg-white/10"
                            aria-label="Expand admin navigation"
                            title="Expand admin navigation"
                        >
                            <MaterialIcon name="menu" size={16} />
                        </button>
                        <SidebarMenu className="items-center gap-4">
                            {sections.flatMap((section) => section.items).map((item) => {
                                const active = isActive(item);
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild>
                                            <Link
                                                href={item.href}
                                                title={item.title}
                                                className={cn(
                                                    'flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-slate-200 transition',
                                                    active ? 'border-white/30 bg-white/10 text-white' : 'hover:bg-white/10'
                                                )}
                                            >
                                                {item.icon}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarContent>
                </>
            )}
        </Sidebar>
    );
}


