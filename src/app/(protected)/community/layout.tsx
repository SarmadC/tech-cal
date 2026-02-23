'use client';

import { ReactNode } from 'react';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import TopBarUtilities from '@/components/common/TopBarUtilities';
import MobileBottomNav from '@/components/common/MobileBottomNav';

export default function CommunityLayout({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider>
            <SidebarProviderBody>{children}</SidebarProviderBody>
        </SidebarProvider>
    );
}

function SidebarProviderBody({ children }: { children: ReactNode }) {
    const { open } = useSidebar();

    return (
        <div className="flex h-screen w-full bg-[var(--background-primary)]">
            {/* Mobile Navigation - Only visible on mobile */}
            <MobileBottomNav />
            <AppSidebar />
            <main
                className={`flex-1 flex flex-col overflow-hidden transition-all duration-200 relative ${open ? 'md:pl-[var(--sidebar-width)]' : 'md:pl-16'
                    }`}
            >
                <h1 className="sr-only">Community</h1>
                {/* Top-right utilities (ThemeToggle + UserMenu) */}
                <TopBarUtilities />
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
