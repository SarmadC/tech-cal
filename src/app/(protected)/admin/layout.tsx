'use client';

import React from 'react';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { SidebarProvider } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { AdminToolbarProvider } from '@/contexts/AdminToolbarContext';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <ProtectedRoute>
            <SidebarProvider
                className="flex min-h-screen bg-background text-foreground"
                defaultOpen
            >
                <AdminToolbarProvider>
                    <AdminSidebar />
                    <div className="flex flex-1 flex-col md:ml-[var(--sidebar-width)]">
                        <AdminTopbar />
                        <div className="flex-1 overflow-auto bg-muted/10">
                            <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
                                {children}
                            </div>
                        </div>
                    </div>
                </AdminToolbarProvider>
            </SidebarProvider>
        </ProtectedRoute>
    );
}



