'use client';

import { ReactNode } from 'react';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import Navbar from '@/components/common/Navbar';
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
                className={`flex-1 flex flex-col overflow-hidden transition-all duration-200 ${open ? 'md:pl-[var(--sidebar-width)]' : 'md:pl-16'
                    }`}
            >
                <h1 className="sr-only">Community</h1>
                {/* Main Navbar - Hidden on mobile, sticky in main flow */}
                <div className="hidden md:block">
                    <Navbar className="sticky top-0 z-[100] w-full" />
                </div>
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
