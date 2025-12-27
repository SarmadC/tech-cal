'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SignOut } from '@phosphor-icons/react';
import {
    Navbar,
    MobileNav,
    MobileNavHeader,
    MobileNavMenu,
    MobileNavToggle,
    NavbarLogo,
    NavbarButton,
    NavbarThemeToggle,
} from "@/components/ui/resizable-navbar";
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
    name: string;
    href: string;
}

interface UnifiedMobileNavbarProps {
    navItems: NavItem[];
    ctaButton?: {
        label: string;
        href: string;
        variant?: 'primary' | 'secondary';
    };
    showLogo?: boolean;
    showThemeToggle?: boolean;
    className?: string;
    fixed?: boolean; // If true, use fixed positioning instead of absolute (for protected pages)
}

export default function UnifiedMobileNavbar({
    navItems,
    ctaButton,
    showLogo = true,
    showThemeToggle = true,
    className,
    fixed = false,
}: UnifiedMobileNavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, signOut } = useAuth();

    // Close menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    const handleSignOut = async () => {
        setIsMobileMenuOpen(false);
        await signOut();
    };

    const handleNavClick = (href: string) => {
        setIsMobileMenuOpen(false);
        if (href.startsWith('#')) {
            // Handle anchor links - let browser handle navigation
            return;
        }
        router.push(href);
    };

    const handleCtaClick = () => {
        if (ctaButton) {
            setIsMobileMenuOpen(false);
            router.push(ctaButton.href);
        }
    };

    const navbarContent = (
        <Navbar className={cn(fixed && "!absolute !top-0", !fixed && className)}>
            <MobileNav>
                <MobileNavHeader>
                    {showLogo && <NavbarLogo />}
                    <div className="flex items-center gap-3">
                        {showThemeToggle && <NavbarThemeToggle />}
                        <MobileNavToggle
                            isOpen={isMobileMenuOpen}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        />
                    </div>
                </MobileNavHeader>

                <MobileNavMenu
                    isOpen={isMobileMenuOpen}
                    className="mobile-menu-custom-padding"
                >
                    {/* Main Navigation Links */}
                    <div className="flex flex-col gap-8 mb-12">
                        {navItems.map((item, idx) => (
                            <a
                                key={`mobile-link-${idx}`}
                                href={item.href}
                                onClick={(e) => {
                                    if (!item.href.startsWith('#')) {
                                        e.preventDefault();
                                    }
                                    handleNavClick(item.href);
                                }}
                                className="flex items-center justify-between text-zinc-900 dark:text-zinc-100 text-xl font-medium hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors group"
                            >
                                <span className="block">{item.name}</span>
                                <svg
                                    className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </a>
                        ))}
                    </div>

                    {/* Primary CTA Button */}
                    {ctaButton && (
                        <div>
                            <NavbarButton
                                onClick={handleCtaClick}
                                variant={ctaButton.variant || 'primary'}
                                className="w-full py-4 text-lg font-semibold rounded-lg"
                            >
                                {ctaButton.label}
                            </NavbarButton>
                        </div>
                    )}

                    {/* Sign Out Button - Only shown when logged in */}
                    {user && (
                        <div className={ctaButton ? "mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700" : ""}>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center justify-between w-full text-red-600 dark:text-red-400 text-xl font-medium hover:text-red-700 dark:hover:text-red-300 transition-colors group"
                            >
                                <span className="flex items-center gap-3">
                                    <SignOut size={24} weight="bold" />
                                    Sign Out
                                </span>
                                <svg
                                    className="w-4 h-4 text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300 transition-colors"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </MobileNavMenu>
            </MobileNav>
        </Navbar>
    );

    if (fixed) {
        return (
            <div className={cn("fixed top-0 left-0 right-0 z-50 pointer-events-none", className)}>
                <div className="pointer-events-auto">
                    {navbarContent}
                </div>
            </div>
        );
    }

    return navbarContent;
}
