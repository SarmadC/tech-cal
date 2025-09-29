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
    const { isMobile } = useDeviceDetection();
    const { user, loading } = useAuth();
    
    // Pages that should never show navbar (they have their own navigation)
    const excludedPaths = ['/calendar', '/', '/hackathons', '/dashboard'];
    
    // Marketing pages that should always show navbar
    const marketingPaths = ['/', '/pricing', '/blog', '/contact', '/legal'];

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
    // 1. Marketing pages (always)
    // 2. Unauthenticated users on any page
    // 3. Excluded paths on mobile (they have their own nav)
    const shouldShowNavbar = 
        marketingPaths.includes(pathname) || 
        (!user && !loading) || 
        (excludedPaths.includes(pathname) && isMobile);

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