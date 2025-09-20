// src/components/ClientLayout.tsx (Corrected)

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { BehavioralAnalyticsService } from '@/services/behavioralAnalyticsService';
import Navbar from "@/components/common/Navbar";
import AnalyticsConsentBanner from '@/components/common/AnalyticsConsentBanner';

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { isMobile } = useDeviceDetection();
    const excludedPaths = ['/calendar', '/'];

    // Cleanup analytics buffers on page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            BehavioralAnalyticsService.forceFlushAll();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Don't render navbar on excluded paths or on mobile devices
    // Mobile devices should use their own navigation components
    if (excludedPaths.includes(pathname) || isMobile) {
        return (
            <>
                {children}
                <AnalyticsConsentBanner />
            </>
        );
    }

    return (
        <>
            <Navbar />
            {/* ✅ Wrap children in a main tag with top padding to offset the navbar */}
            <main className="pt-16">
                {children}
            </main>
            <AnalyticsConsentBanner />
        </>
    );
}