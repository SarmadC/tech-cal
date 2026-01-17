'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import {
    Navbar,
    NavBody,
    NavItems,
    MobileNav,
    NavbarLogo,
    NavbarButton,
    MobileNavHeader,
    MobileNavToggle,
    MobileNavMenu,
    NavbarThemeToggle,
} from "@/components/ui/resizable-navbar";

const ProductDemoSection = dynamic(
    () => import('./ProductDemoSection').then((mod) => ({ default: mod.default })),
    {
        ssr: false,
        loading: () => <div className="h-[800px] w-full bg-background/5 animate-pulse rounded-3xl" />
    }
);

import {
    HeroSection,
    FeaturesGrid,
    Footer,
    UseCasesSection,
    FAQSection,
    CoverageSection
} from './';

export default function LandingPage() {
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isMobile } = useDeviceDetection();

    const navItems = [
        {
            name: "Features",
            link: "#features",
        },
        {
            name: "Pricing",
            link: "/pricing",
        },
        {
            name: "Contact",
            link: "#contact",
        },
    ];

    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        const elements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
        elements.forEach(el => observer.observe(el));

        return () => elements.forEach(el => observer.unobserve(el));
    }, []);

    return (
        <div className={`landing-container ${isMobileMenuOpen ? 'blur-background' : ''}`}>
            {/* Navbar - Direct Aceternity UI Implementation */}
            <div className="relative w-full">
                <Navbar>
                    {/* Desktop Navigation - Only show on desktop */}
                    {!isMobile && (
                        <NavBody>
                            <NavbarLogo />
                            <NavItems items={navItems} />
                            <div className="flex items-center gap-4">
                                <NavbarThemeToggle />
                                <NavbarButton
                                    variant="secondary"
                                    onClick={() => router.push("/login")}
                                >
                                    Login
                                </NavbarButton>
                                <NavbarButton
                                    variant="primary"
                                    href="/pricing?checkout=monthly"
                                >
                                    Start Free Trial
                                </NavbarButton>
                            </div>
                        </NavBody>
                    )}

                    {/* Mobile Navigation - Only show on mobile */}
                    {isMobile && (
                        <MobileNav>
                            <MobileNavHeader>
                                <NavbarLogo />
                                <div className="flex items-center gap-3">
                                    <NavbarThemeToggle />
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
                                            href={item.link}
                                            onClick={() => setIsMobileMenuOpen(false)}
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
                                    <a
                                        href="/login"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center justify-between text-zinc-900 dark:text-zinc-100 text-xl font-medium hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        <span className="block">Login</span>
                                    </a>
                                </div>

                                {/* Primary CTA Button */}
                                <div>
                                    <NavbarButton
                                        href="/pricing?checkout=monthly"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                        }}
                                        variant="primary"
                                        className="w-full py-4 text-lg font-semibold rounded-lg"
                                    >
                                        Start Free Trial
                                    </NavbarButton>
                                </div>
                            </MobileNavMenu>
                        </MobileNav>
                    )}
                </Navbar>
            </div>

            <main>
                <HeroSection />
                {/* This now renders the dynamically loaded component */}
                <ProductDemoSection />
                <FeaturesGrid />
                <UseCasesSection />
                <CoverageSection />
                <FAQSection />
            </main>
            <Footer />
        </div>
    );
}
