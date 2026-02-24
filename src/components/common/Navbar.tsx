// src/components/Navbar.tsx — Marketing / unauthenticated navigation only.
// Authenticated pages use AppSidebar + TopBarUtilities instead.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollListener } from '@/hooks/useEventListener';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Navbar({ className = '' }: { className?: string }) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const { user, loading } = useAuth();

    useScrollListener(() => {
        if (typeof window !== 'undefined') {
            setIsScrolled(window.scrollY > 10);
        }
    });

    const navLinks = [
        { href: '/#features', label: 'Features' },
        { href: '/pricing', label: 'Pricing' },
        { href: '/blog', label: 'Blog' },
    ];

    const shouldShowBackground = isScrolled;

    return (
        <nav
            className={`${className || 'fixed top-0 left-0 right-0 z-[100]'} transition-all duration-300 border-0 border-none ${shouldShowBackground ? 'bg-white/80 dark:bg-black/80 backdrop-blur-md' : 'bg-transparent'
                }`}
            style={{ border: 'none', borderWidth: 0, borderColor: 'transparent' }}
        >
            <div className="max-w-[1600px] mx-auto px-6">
                <div className="relative flex items-center h-16">
                    {/* Logo - Left */}
                    <div className="flex-shrink-0">
                        <Link href="/" className="flex items-center space-x-2">
                            <Image src="/logo.svg" alt="KureCal" width={32} height={32} />
                            <span className="text-xl font-semibold text-foreground-primary">KureCal</span>
                        </Link>
                    </div>

                    {/* Desktop Navigation - Center */}
                    <div className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
                        {navLinks.map((link) => {
                            // Compare only the pathname portion (strip query string from href)
                            const linkPath = link.href.split('?')[0];
                            const isActive = pathname != null && (
                                pathname === linkPath ||
                                pathname.startsWith(linkPath + '/')
                            );
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`text-sm font-medium transition-colors hover:text-accent-primary ${isActive ? 'text-accent-primary' : 'text-foreground-secondary'}`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Desktop User Menu / Auth Buttons - Right */}
                    <div className="hidden md:flex items-center space-x-4 ml-auto">
                        <ThemeToggle />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden ml-auto p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
                    <div className="px-4 py-4 space-y-3">
                        {/* Navigation Links */}
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block text-sm font-medium text-foreground-secondary hover:text-accent-primary transition-colors py-2"
                            >
                                {link.label}
                            </Link>
                        ))}

                        {/* Divider */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            {!loading && (
                                <>
                                    {user ? (
                                        /* Authenticated mobile — just show UserMenu */
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between py-2">
                                                <span className="text-sm font-medium text-foreground-secondary">Theme</span>
                                                <ThemeToggle />
                                            </div>
                                        </div>
                                    ) : (
                                        /* Unauthenticated Mobile Menu */
                                        <div className="space-y-3">
                                            <Link
                                                href="/login"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block text-sm font-medium text-foreground-secondary hover:text-accent-primary transition-colors py-2"
                                            >
                                                Sign In
                                            </Link>
                                            <Link
                                                href="/signup"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block w-full bg-accent-primary hover:bg-accent-primary-hover !text-accent-primary-foreground font-medium py-2 px-4 rounded-lg transition-all text-sm text-center"
                                            >
                                                Sign Up
                                            </Link>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}