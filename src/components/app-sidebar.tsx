'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import { MaterialIcon } from '@/components/ui/Icon';

const items = [
  { title: 'Dashboard', url: '/dashboard', icon: () => <MaterialIcon name="bar-chart" size={18} /> },
  { title: 'Calendar', url: '/calendar', icon: () => <MaterialIcon name="calendar" size={18} /> },
  { title: 'Hackathons', url: '/hackathons', icon: () => <MaterialIcon name="code" size={18} /> },
  { title: 'Settings', url: '/dashboard/settings', icon: () => <MaterialIcon name="settings" size={18} /> },
] as const;

export function AppSidebar() {
  const { open, toggle } = useSidebar();
  return (
    <Sidebar>
      {open ? (
        <>
          <SidebarHeader>
            <div className="flex items-center justify-between">
              <Image 
                src="/logo.svg" 
                alt="Tech-Cal" 
                width={32} 
                height={32}
                className="w-8 h-8"
              />
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
                        <Link href={item.url} title={item.title} className="flex items-center gap-3 justify-start">
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
            <div className="text-xs text-foreground-tertiary">v1.0</div>
          </SidebarFooter>
        </>
      ) : (
        <>
          {/* Collapsed: top-aligned icon rail */}
          <SidebarContent className="flex h-full items-start justify-start">
            <div className="flex flex-col items-center justify-start gap-6 w-full pt-5">
              <Image 
                src="/logo.svg" 
                alt="Tech-Cal" 
                width={28} 
                height={28}
                className="w-7 h-7"
              />
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
                      <Link href={item.url} title={item.title} className="flex items-center justify-center">
                        {item.icon()}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          </SidebarContent>
        </>
      )}
    </Sidebar>
  );
}

export default AppSidebar;


