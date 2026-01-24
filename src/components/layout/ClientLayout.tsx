// src/components/ClientLayout.tsx (Corrected)

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthNotifications } from '@/hooks/useAuthNotifications';
import { BehavioralAnalyticsService } from '@/services/behavioralAnalyticsService';
import Navbar from "@/components/common/Navbar";
import UnifiedMobileNavbar from "@/components/common/UnifiedMobileNavbar";
import AnalyticsConsentBanner from '@/components/common/AnalyticsConsentBanner';
import MarketingNavbar from "@/components/common/MarketingNavbar";
import { RouteTracker } from './RouteTracker';
import LegalFooter from '@/components/common/LegalFooter';

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { isMobile } = useDeviceDetection();
    const { user, loading } = useAuth();

    // Handle auth notifications using snackbar
    useAuthNotifications();

    // Pages that should never show navbar (they have their own navigation)
    const excludedPaths = ['/calendar', '/', '/hackathons', '/dashboard', '/discover', '/events'];

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

    const shouldShowLegalFooter =
        pathname !== '/' && !pathname.startsWith('/calendar');

    if (!shouldShowNavbar) {
        return (
            <>
                <Suspense fallback={null}>
                    <RouteTracker />
                </Suspense>
                {children}
                {shouldShowLegalFooter && <LegalFooter />}
                <AnalyticsConsentBanner />
            </>
        );
    }

    // Navigation items for UnifiedMobileNavbar
    const mobileNavItems = [
        { name: 'Features', href: '/#features' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Blog', href: '/blog' },
        { name: 'Contact', href: '/contact' },
    ];

    // Add authenticated links for mobile
    if (user) {
        mobileNavItems.push(
            { name: 'Discover', href: '/discover' },
            { name: 'Calendar', href: '/calendar?view=month' },
            { name: 'Dashboard', href: '/dashboard' }
        );
    } else {
        mobileNavItems.push(
            { name: 'Sign In', href: '/login' }
        );
    }

    const isMarketingPage = marketingPaths.includes(pathname);

    return (
        <>
            <Suspense fallback={null}>
                <RouteTracker />
            </Suspense>
            {isMarketingPage ? (
                <MarketingNavbar />
            ) : (
                /* Use UnifiedMobileNavbar on mobile, desktop Navbar otherwise for app pages */
                isMobile ? (
                    <UnifiedMobileNavbar
                        navItems={mobileNavItems}
                        showThemeToggle={true}
                        showLogo={true}
                        ctaButton={!user ? {
                            label: 'Sign Up',
                            href: '/signup',
                            variant: 'primary'
                        } : undefined}
                    />
                ) : (
                    <Navbar />
                )
            )}
            {/* ✅ Offset content for the navbar height */}
            <div className="pt-16">
                {children}
            </div>
            {shouldShowLegalFooter && <LegalFooter />}
            <AnalyticsConsentBanner />
        </>
    );
}
