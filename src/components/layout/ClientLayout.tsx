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
    const excludedPaths = ['/calendar', '/', '/hackathons', '/dashboard', '/discover', '/events', '/embed'];
    const authPagesWithCustomNav = ['/login', '/signup', '/forgot-password'];

    // Marketing pages that should always show navbar (excluding landing page which has custom nav)
    const marketingPaths = ['/pricing', '/contact'];
    const marketingPathPrefixes = ['/blog', '/legal', '/resources', '/events'];

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



    const hasCustomPageNavigation =
        authPagesWithCustomNav.includes(pathname) || pathname.startsWith('/auth/');
    const isMarketingPage =
        marketingPaths.includes(pathname) ||
        marketingPathPrefixes.some((prefix) => pathname.startsWith(prefix));

    // Show navbar for:
    // 1. Marketing pages (always) - excluding landing page
    // 2. Unauthenticated users on non-excluded pages that do not manage their own nav
    // 3. Note: Landing page uses its own custom resizable navbar
    const isEmbedPage = pathname.startsWith('/embed');
    const shouldShowNavbar =
        !isEmbedPage && (
            isMarketingPage ||
            (!user && !loading && !excludedPaths.includes(pathname) && !hasCustomPageNavigation)
        );

    const shouldShowLegalFooter =
        pathname !== '/' && !pathname.startsWith('/calendar') && !pathname.startsWith('/embed');
    const usesSelfManagedTopSpacing =
        pathname.startsWith('/blog');

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

    // Navigation items for UnifiedMobileNavbar (marketing only)
    const mobileNavItems = [
        { name: 'Features', href: '/#features' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Blog', href: '/blog' },
        { name: 'Contact', href: '/contact' },
    ];

    // Add sign-in link for unauthenticated users
    if (!user) {
        mobileNavItems.push(
            { name: 'Sign In', href: '/login' }
        );
    }

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
            <div className={usesSelfManagedTopSpacing ? '' : 'pt-16'}>
                {children}
            </div>
            {shouldShowLegalFooter && <LegalFooter />}
            <AnalyticsConsentBanner />
        </>
    );
}
