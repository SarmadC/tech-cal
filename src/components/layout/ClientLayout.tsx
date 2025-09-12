// src/components/ClientLayout.tsx (Corrected)

'use client';

import { usePathname } from 'next/navigation';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import Navbar from "@/components/common/Navbar";

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { isMobile } = useDeviceDetection();
    const excludedPaths = ['/calendar', '/'];

    // Don't render navbar on excluded paths or on mobile devices
    // Mobile devices should use their own navigation components
    if (excludedPaths.includes(pathname) || isMobile) {
        return <>{children}</>;
    }

    return (
        <>
            <Navbar />
            {/* ✅ Wrap children in a main tag with top padding to offset the navbar */}
            <main className="pt-16">
                {children}
            </main>
        </>
    );
}