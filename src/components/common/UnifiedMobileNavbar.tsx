'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SignOut, Sun, Moon, List, X } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { MobileNavMenu } from "@/components/ui/resizable-navbar";
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
    fixed?: boolean;
    variant?: 'brand' | 'app';
}

export default function UnifiedMobileNavbar({
    navItems,
    ctaButton,
    showLogo = true,
    showThemeToggle = true,
    className,
    fixed = false,
    variant = 'brand',
}: UnifiedMobileNavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileMenuRoute, setMobileMenuRoute] = useState<string | null>(null);
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const effectiveNavItems = variant === 'app'
        ? [
            ...navItems,
            {
                name: 'Submit Event',
                href: user ? '/submit-event' : '/login?redirect=%2Fsubmit-event',
            },
        ]
        : navItems;
    const currentPath = pathname ?? '';
    const isMobileMenuOpen = mobileMenuRoute === currentPath;

    const handleSignOut = async () => {
        setMobileMenuRoute(null);
        await signOut();
    };

    const handleNavClick = (href: string) => {
        setMobileMenuRoute(null);
        if (href.startsWith('#')) {
            return;
        }
        router.push(href);
    };

    const handleCtaClick = () => {
        if (ctaButton) {
            setMobileMenuRoute(null);
            router.push(ctaButton.href);
        }
    };

    const navbarContent = (
        <div className={cn('pointer-events-auto', !fixed && className)}>
            <div className="mobile-unified-nav lg:hidden" data-variant={variant}>
                <div className="mobile-unified-nav__frame">
                    {/* Logo */}
                    {showLogo && (
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                router.push('/');
                            }}
                            className="mobile-unified-nav__brand relative z-20"
                        >
                            <svg width="24" height="24" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="object-contain">
                                <rect width="120" height="120" fill="#000000"></rect>
                                <polygon points="60,60 52,56 28,68 36,72" fill="#FFFFFF" opacity="0.3"></polygon>
                                <polygon points="36,72 28,68 28,76 36,80" fill="#FFFFFF" opacity="0.3"></polygon>
                                <polygon points="60,60 36,72 36,80 60,68" fill="#FFFFFF" opacity="0.5"></polygon>
                                <polygon points="60,60 68,56 92,68 84,72" fill="#FFFFFF" opacity="0.7"></polygon>
                                <polygon points="84,72 92,68 92,76 84,80" fill="#FFFFFF" opacity="0.5"></polygon>
                                <polygon points="60,60 84,72 84,80 60,68" fill="#FFFFFF" opacity="0.7"></polygon>
                                <polygon points="52,64 60,68 60,100 52,96" fill="#FFFFFF" opacity="0.5"></polygon>
                                <polygon points="68,64 60,68 60,100 68,96" fill="#FFFFFF" opacity="0.3"></polygon>
                                <polygon points="52,96 60,100 68,96 60,92" fill="#FFFFFF" opacity="0.3"></polygon>
                                <polygon points="60,60 52,64 28,52 36,48" fill="#FFFFFF" opacity="0.85"></polygon>
                                <polygon points="36,48 28,52 28,44 36,40" fill="#FFFFFF" opacity="0.7"></polygon>
                                <polygon points="60,60 36,48 36,40 60,52" fill="#FFFFFF" opacity="0.85"></polygon>
                                <polygon points="60,60 68,64 92,52 84,48" fill="#FFFFFF" opacity="1"></polygon>
                                <polygon points="84,48 92,52 92,44 84,40" fill="#FFFFFF" opacity="0.85"></polygon>
                                <polygon points="60,60 84,48 84,40 60,52" fill="#FFFFFF" opacity="1"></polygon>
                                <polygon points="52,56 60,52 60,20 52,24" fill="#FFFFFF" opacity="1"></polygon>
                                <polygon points="68,56 60,52 60,20 68,24" fill="#FFFFFF" opacity="1"></polygon>
                                <polygon points="52,24 60,20 68,24 60,28" fill="#FFFFFF" opacity="1"></polygon>
                                <polygon points="52,56 60,52 68,56 60,60" fill="#FFFFFF" opacity="1"></polygon>
                            </svg>
                            <span className="mobile-unified-nav__brandText">Kure-Cal</span>
                        </a>
                    )}

                    {/* Controls */}
                    <div className="mobile-unified-nav__controls">
                        {showThemeToggle && mounted && (
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="mobile-unified-nav__control"
                                aria-label="Switch theme"
                            >
                                {theme === 'dark' ? (
                                    <Sun size={19} weight="thin" />
                                ) : (
                                    <Moon size={19} weight="thin" />
                                )}
                                <span className="sr-only">Toggle theme</span>
                            </button>
                        )}

                        {/* Hamburger Menu Toggle */}
                        <button
                            onClick={() => setMobileMenuRoute(isMobileMenuOpen ? null : currentPath)}
                            className="mobile-unified-nav__control"
                            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                            aria-expanded={isMobileMenuOpen}
                        >
                            {isMobileMenuOpen ? (
                                <X size={20} weight="thin" />
                            ) : (
                                <List size={20} weight="thin" />
                            )}
                        </button>
                    </div>
                </div>

                <MobileNavMenu
                    isOpen={isMobileMenuOpen}
                    className="mobile-menu-custom-padding"
                >
                    {/* Main Navigation Links */}
                    <div className="flex flex-col gap-8 mb-12">
                        {effectiveNavItems.map((item, idx) => (
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
                            <button
                                onClick={handleCtaClick}
                                className={cn(
                                    "w-full py-4 text-lg font-semibold rounded-lg transition-all",
                                    ctaButton.variant === 'secondary'
                                        ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100"
                                        : "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black"
                                )}
                            >
                                {ctaButton.label}
                            </button>
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
            </div>
        </div>
    );

    if (fixed) {
        return (
            <div className={cn('fixed top-0 left-0 right-0 z-50 pointer-events-none', className)}>
                {navbarContent}
            </div>
        );
    }

    return navbarContent;
}
