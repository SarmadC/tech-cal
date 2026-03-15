'use client';

import type { ReactNode } from 'react';
import AppSidebar from '@/components/app-sidebar';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';

interface CommunityAppShellProps {
  children: ReactNode;
}

export default function CommunityAppShell({
  children,
}: CommunityAppShellProps) {
  return (
    <SidebarProvider>
      <CommunityAppShellBody>{children}</CommunityAppShellBody>
    </SidebarProvider>
  );
}

function CommunityAppShellBody({ children }: CommunityAppShellProps) {
  const { open } = useSidebar();

  return (
    <div className="flex min-h-screen w-full bg-[var(--background-main)]">
      <MobileBottomNav />
      <AppSidebar />
      <div
        className={`relative flex min-h-screen flex-1 flex-col transition-all duration-200 ${
          open ? 'md:pl-[var(--sidebar-width)]' : 'md:pl-16'
        }`}
      >
        <h1 className="sr-only">Community</h1>
        <div className="flex-1 pb-[72px] md:pb-0">{children}</div>
      </div>
    </div>
  );
}
