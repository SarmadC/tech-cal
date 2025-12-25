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
        <Sidebar className="bg-[#1C1C1C] border-r border-[#2C2C2C] text-[#EEEEEE]">
            {open ? (
                <>
                    <SidebarHeader className="h-12 flex items-center justify-between px-4 border-b border-[#2C2C2C]">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-sm bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-200">Tech-Cal Admin</span>
                        </div>
                        <button
                            onClick={() => toggle()}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <MaterialIcon name="chevron_left" size={16} />
                        </button>
                    </SidebarHeader>
                    <SidebarContent className="px-2 py-4 space-y-6">
                        {sections.map((section) => (
                            <div key={section.label}>
                                <div className="px-2 mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
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
                                                        ? 'bg-white/5 text-slate-100 font-medium'
                                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className={cn("transition-colors", active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400")}>
                                                        {item.icon}
                                                    </span>
                                                    <span>{item.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {item.badge ? (
                                                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[10px] font-medium bg-indigo-500/20 text-indigo-300">
                                                            {item.badge}
                                                        </span>
                                                    ) : null}
                                                    {item.hotkey && (
                                                        <span className="hidden group-hover:inline-block text-[10px] text-slate-600 font-mono">
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
                    <SidebarFooter className="p-4 border-t border-[#2C2C2C]">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                                A
                            </div>
                            <div className="flex-1">
                                <div className="text-slate-300">Admin User</div>
                                <div className="text-[10px]">admin@tech-cal.com</div>
                            </div>
                        </div>
                    </SidebarFooter>
                </>
            ) : (
                <SidebarContent className="flex flex-col items-center py-4 gap-4">
                    <button
                        onClick={() => toggle()}
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/5 text-slate-400"
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
                                    active ? 'bg-white/10 text-indigo-400' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
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


