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
} from "@/components/ui/resizable-navbar";

const ChaosToOrderSection = dynamic(
    () => import('./ChaosToOrderSection').then((mod) => ({ default: mod.ChaosToOrderSection })),
    {
        ssr: false,
        loading: () => <div style={{ height: '250vh', background: '#0f0f23' }}>Loading animation...</div>
    }
);

import {
    HeroSection,
    FeaturesGrid,
    Footer
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
            link: "#pricing",
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
                                <NavbarButton 
                                    variant="secondary"
                                    onClick={() => router.push("/login")}
                                >
                                    Login
                                </NavbarButton>
                                <NavbarButton 
                                    variant="primary"
                                    onClick={() => router.push("/signup")}
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
                                <MobileNavToggle
                                    isOpen={isMobileMenuOpen}
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                />
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
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            router.push("/signup");
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
                <ChaosToOrderSection />
                <FeaturesGrid />
            </main>
            <Footer />
        </div>
    );
}