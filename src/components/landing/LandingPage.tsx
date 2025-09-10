'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
        <div className="landing-container">
            {/* Navbar - Direct Aceternity UI Implementation */}
            <div className="relative w-full">
                <Navbar>
                    {/* Desktop Navigation */}
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

                    {/* Mobile Navigation */}
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
                        >
                            {navItems.map((item, idx) => (
                                <a
                                    key={`mobile-link-${idx}`}
                                    href={item.link}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="relative text-zinc-600 dark:text-zinc-300"
                                >
                                    <span className="block">{item.name}</span>
                                </a>
                            ))}
                            <div className="flex w-full flex-col gap-4">
                                <NavbarButton
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        router.push("/login");
                                    }}
                                    variant="primary"
                                    className="w-full"
                                >
                                    Login
                                </NavbarButton>
                                <NavbarButton
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        router.push("/signup");
                                    }}
                                    variant="primary"
                                    className="w-full"
                                >
                                    Start Free Trial
                                </NavbarButton>
                            </div>
                        </MobileNavMenu>
                    </MobileNav>
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