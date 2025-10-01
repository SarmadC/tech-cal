// src/components/ClientLayout.tsx (Corrected)

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useAuth } from '@/contexts/AuthContext';
import { BehavioralAnalyticsService } from '@/services/behavioralAnalyticsService';
import Navbar from "@/components/common/Navbar";
import AnalyticsConsentBanner from '@/components/common/AnalyticsConsentBanner';

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { isMobile: _isMobile } = useDeviceDetection();
    const { user, loading } = useAuth();
    
    // Pages that should never show navbar (they have their own navigation)
    const excludedPaths = ['/calendar', '/', '/hackathons', '/dashboard'];
    
    // Marketing pages that should always show navbar (excluding landing page which has custom nav)
    const marketingPaths = ['/pricing', '/blog', '/contact', '/legal'];

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

    // Show navbar for:
    // 1. Marketing pages (always) - excluding landing page
    // 2. Unauthenticated users on non-excluded pages
    // 3. Note: Landing page uses its own custom resizable navbar
    const shouldShowNavbar = 
        marketingPaths.includes(pathname) || 
        (!user && !loading && !excludedPaths.includes(pathname));

    if (!shouldShowNavbar) {
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