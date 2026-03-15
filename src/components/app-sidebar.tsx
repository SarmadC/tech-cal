'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarFooter,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MaterialIcon } from '@/components/ui/Icon';
import { ListBullets, UsersThree } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';

const items = [
    { title: 'Discover', url: '/discover', icon: () => <MaterialIcon name="compass" size={18} /> },
    { title: 'Calendar', url: '/calendar?view=month', icon: () => <MaterialIcon name="calendar" size={18} /> },
    { title: 'Events List', url: '/events', icon: () => <ListBullets size={18} /> },
    { title: 'Community', url: '/community', icon: () => <UsersThree size={18} /> },
    { title: 'Dashboard', url: '/dashboard', icon: () => <MaterialIcon name="bar-chart" size={18} /> },
    { title: 'Hackathons', url: '/hackathons', icon: () => <MaterialIcon name="code" size={18} /> },
    { title: 'Settings', url: '/dashboard/settings', icon: () => <MaterialIcon name="settings" size={18} /> },
] as const;

function getAccountInitials(label: string): string {
    const parts = label
        .split(/[\s@._-]+/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return 'A';
    }

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

type SidebarAccountMenuProps = {
    compact: boolean;
    displayName: string;
    email: string | null;
    avatarUrl: string | null;
    onSignOut: () => Promise<void>;
};

function SidebarAccountMenu({
    compact,
    displayName,
    email,
    avatarUrl,
    onSignOut,
}: SidebarAccountMenuProps) {
    const initials = getAccountInitials(displayName);
    const menuLabel = `Open account menu for ${displayName}`;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {compact ? (
                    <button
                        type="button"
                        title={menuLabel}
                        aria-label={menuLabel}
                        className="inline-flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-[oklch(var(--sidebar-accent,0.269_0_0))]"
                    >
                        <Avatar className="h-9 w-9 border border-[color:oklch(var(--sidebar-border,1_0_0_/10%))]">
                            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                            <AvatarFallback className="bg-background-tertiary text-xs font-semibold text-foreground-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                ) : (
                    <button
                        type="button"
                        title={menuLabel}
                        aria-label={menuLabel}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-[oklch(var(--sidebar-accent,0.269_0_0))]"
                    >
                        <Avatar className="h-9 w-9 border border-[color:oklch(var(--sidebar-border,1_0_0_/10%))]">
                            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                            <AvatarFallback className="bg-background-tertiary text-xs font-semibold text-foreground-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-foreground-primary">{displayName}</div>
                            <div className="truncate text-xs text-foreground-tertiary">Account</div>
                        </div>
                        <MaterialIcon name="expand-more" size={16} className="shrink-0 text-foreground-tertiary" />
                    </button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={12}
                className="w-56 border-[color:oklch(var(--sidebar-border,1_0_0_/10%))] bg-[oklch(var(--sidebar,0.205_0_0))] text-[oklch(var(--sidebar-foreground,0.985_0_0))]"
            >
                <DropdownMenuLabel className="flex items-center gap-3 py-2">
                    <Avatar className="h-9 w-9">
                        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                        <AvatarFallback className="bg-background-tertiary text-xs font-semibold text-foreground-primary">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate">{displayName}</div>
                        {email && email !== displayName ? (
                            <div className="truncate text-xs font-normal text-foreground-tertiary">{email}</div>
                        ) : null}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[color:oklch(var(--sidebar-border,1_0_0_/10%))]" />
                <DropdownMenuItem
                    onSelect={async () => {
                        await onSignOut();
                    }}
                    className="text-red-600 focus:bg-red-500/10 focus:text-red-700 dark:text-red-300 dark:focus:text-red-200"
                >
                    <MaterialIcon name="logout" size={16} />
                    <span>Sign out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function AppSidebar() {
    const { open, toggle } = useSidebar();
    const pathname = usePathname();
    const { user, profile, signOut } = useAuth();

    const displayName = profile?.fullName?.trim() || user?.email?.trim() || 'Account';
    const email = user?.email?.trim() || null;
    const avatarUrl = profile?.avatarUrl || null;

    const isActive = (url: string) => {
        if (url === '/' && pathname === '/') return true;
        if (url !== '/' && pathname?.startsWith(url.split('?')[0])) return true;
        return false;
    };

    return (
        <Sidebar>
            {/* Expanded state */}
            <div
                aria-hidden={!open}
                className={`flex flex-col h-full absolute inset-0 transition-opacity duration-200 ease-in-out ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                <SidebarHeader>
                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            title="Collapse sidebar"
                            aria-label="Collapse sidebar"
                            onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); toggle(); }}
                            className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-background-tertiary"
                        >
                            <MaterialIcon name="chevron_double_left" size={16} />
                        </button>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild>
                                            <Link
                                                href={item.url}
                                                title={item.title}
                                                className={`flex items-center gap-3 justify-start ${isActive(item.url) ? 'text-[var(--brand-primary)]' : ''}`}
                                            >
                                                {item.icon()}
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    {user ? (
                        <SidebarAccountMenu
                            compact={false}
                            displayName={displayName}
                            email={email}
                            avatarUrl={avatarUrl}
                            onSignOut={signOut}
                        />
                    ) : null}
                </SidebarFooter>
            </div>

            {/* Collapsed state */}
            <div
                aria-hidden={open}
                className={`flex flex-col h-full absolute inset-0 transition-opacity duration-200 ease-in-out ${!open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                <SidebarContent className="flex h-full items-start justify-start">
                    <div className="flex flex-col items-center justify-start gap-6 w-full pt-5">
                        <button
                            type="button"
                            title="Expand sidebar"
                            aria-label="Expand sidebar"
                            onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); toggle(); }}
                            className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-background-tertiary"
                        >
                            <MaterialIcon name="menu" size={16} />
                        </button>
                        <SidebarMenu className="items-center gap-6">
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link
                                            href={item.url}
                                            title={item.title}
                                            className={`flex items-center justify-center ${isActive(item.url) ? 'text-[var(--brand-primary)]' : ''}`}
                                        >
                                            {item.icon()}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </div>
                </SidebarContent>
                <SidebarFooter className="flex items-center justify-center px-2">
                    {user ? (
                        <SidebarAccountMenu
                            compact
                            displayName={displayName}
                            email={email}
                            avatarUrl={avatarUrl}
                            onSignOut={signOut}
                        />
                    ) : null}
                </SidebarFooter>
            </div>
        </Sidebar>
    );
}

export default AppSidebar;
