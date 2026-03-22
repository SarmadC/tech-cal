"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { usePostHog } from "posthog-js/react";
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
import { cn } from "@/lib/utils";

const resourceItems = [
    {
        label: "Events Dashboard",
        description: "Observe the state of tech events",
        href: "/resources/tech-events-calendar-2026",
    },
    {
        label: "CFP Deadlines",
        description: "Find calls for papers still open",
        href: "/resources/cfp-calendar",
    },
    {
        label: "City Directory",
        description: "Browse event activity by city",
        href: "/events/cities",
    },
] as const;

function ResourceFlyout({
    open,
    onClose,
    onOpen,
    anchorRef,
    flyoutRef,
    className,
}: {
    open: boolean;
    onClose: () => void;
    onOpen?: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    flyoutRef?: React.RefObject<HTMLDivElement | null>;
    className?: string;
}) {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
        if (!open || typeof window === "undefined") {
            return;
        }

        const updatePosition = () => {
            const anchor = anchorRef.current;
            if (!anchor) {
                return;
            }

            const rect = anchor.getBoundingClientRect();
            const flyoutWidth = 352;
            const viewportPadding = 16;
            const nextLeft = Math.min(
                Math.max(viewportPadding, rect.right - flyoutWidth),
                window.innerWidth - flyoutWidth - viewportPadding,
            );

            setPosition({
                top: rect.bottom + 8,
                left: nextLeft,
            });
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [anchorRef, open]);

    if (!open || !position || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            ref={flyoutRef}
            className={cn(
                "fixed z-[1000] w-[22rem] overflow-hidden rounded-[24px] border border-zinc-200/70 bg-white/96 text-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-2xl",
                "dark:border-white/10 dark:bg-black/92 dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
                className,
            )}
            style={{
                top: position.top,
                left: position.left,
            }}
            onMouseEnter={onOpen}
            onMouseLeave={onClose}
        >
            <div className="divide-y divide-zinc-200/80 px-4 dark:divide-white/10">
                {resourceItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className="group flex items-start justify-between gap-4 py-4 transition-colors hover:text-black dark:hover:text-white"
                    >
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold text-inherit">
                                {item.label}
                            </span>
                            <span className="mt-1 block text-sm text-zinc-600 dark:text-white/65">
                                {item.description}
                            </span>
                        </span>
                        <svg
                            className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:text-white/45 dark:group-hover:text-white/80"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </Link>
                ))}
            </div>
        </div>,
        document.body,
    );
}

function ResourceTrigger({
    open,
    onToggle,
    onOpen,
    onClose,
    triggerRef,
    flyoutRef,
}: {
    open: boolean;
    onToggle: () => void;
    onOpen: () => void;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLDivElement | null>;
    flyoutRef?: React.RefObject<HTMLDivElement | null>;
}) {
    return (
        <div
            ref={triggerRef}
            className="relative"
            onMouseEnter={onOpen}
            onMouseLeave={onClose}
        >
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Open resources menu"
                onClick={onToggle}
                className="navbar-button navbar-button-secondary flex items-center gap-2"
                style={{
                    position: "relative",
                    padding: "6px 12px",
                    borderRadius: "9999px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    margin: 0,
                    textDecoration: "none",
                    border: "none",
                    background: "transparent",
                }}
            >
                <span>Resources</span>
                <svg
                    className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M6 9l6 6 6-6"
                    />
                </svg>
            </button>
            <ResourceFlyout
                open={open}
                onClose={onClose}
                onOpen={onOpen}
                anchorRef={triggerRef}
                flyoutRef={flyoutRef}
            />
        </div>
    );
}

export default function MarketingNavbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDesktopResourcesOpen, setIsDesktopResourcesOpen] = useState(false);
    const [isMobileResourcesOpen, setIsMobileResourcesOpen] = useState(false);
    const { isMobile } = useDeviceDetection();
    const posthog = usePostHog();
    const desktopResourcesRef = useRef<HTMLDivElement>(null);
    const desktopResourcesFlyoutRef = useRef<HTMLDivElement>(null);
    const mobileResourcesRef = useRef<HTMLButtonElement>(null);
    const mobileResourcesFlyoutRef = useRef<HTMLDivElement>(null);
    const desktopResourcesCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const navItems = [
        {
            name: "Features",
            link: "/#features",
        },
        {
            name: "Pricing",
            link: "/pricing",
        },
        {
            name: "Blog",
            link: "/blog",
        },
        {
            name: "Contact",
            link: "/contact",
        },
    ];

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;

            if (
                desktopResourcesRef.current &&
                !desktopResourcesRef.current.contains(target) &&
                !desktopResourcesFlyoutRef.current?.contains(target)
            ) {
                setIsDesktopResourcesOpen(false);
            }

            if (
                mobileResourcesRef.current &&
                !mobileResourcesRef.current.contains(target) &&
                !mobileResourcesFlyoutRef.current?.contains(target)
            ) {
                setIsMobileResourcesOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsDesktopResourcesOpen(false);
                setIsMobileResourcesOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
            if (desktopResourcesCloseTimeoutRef.current) {
                clearTimeout(desktopResourcesCloseTimeoutRef.current);
            }
        };
    }, []);

    const clearDesktopResourcesCloseTimer = () => {
        if (desktopResourcesCloseTimeoutRef.current) {
            clearTimeout(desktopResourcesCloseTimeoutRef.current);
            desktopResourcesCloseTimeoutRef.current = null;
        }
    };

    const openDesktopResources = () => {
        clearDesktopResourcesCloseTimer();
        setIsDesktopResourcesOpen(true);
    };

    const closeDesktopResources = () => {
        clearDesktopResourcesCloseTimer();
        desktopResourcesCloseTimeoutRef.current = setTimeout(() => {
            setIsDesktopResourcesOpen(false);
        }, 160);
    };

    return (
        <div className="relative w-full z-50">
            <Navbar>
                {/* Desktop Navigation - Only show on desktop */}
                {!isMobile && (
                        <NavBody>
                            <NavbarLogo />
                            <NavItems items={navItems} />
                            <div className="flex items-center gap-4">
                                <ResourceTrigger
                                    open={isDesktopResourcesOpen}
                                    onOpen={openDesktopResources}
                                    onClose={closeDesktopResources}
                                    triggerRef={desktopResourcesRef}
                                    flyoutRef={desktopResourcesFlyoutRef}
                                    onToggle={() => {
                                        clearDesktopResourcesCloseTimer();
                                        setIsDesktopResourcesOpen((current) => !current);
                                    }}
                                />
                                <NavbarButton
                                    variant="secondary"
                                    href="/login"
                                    onClick={() => posthog?.capture('landing_cta_clicked', { cta_text: 'Login', cta_location: 'navbar', destination: '/login' })}
                                >
                                Login
                            </NavbarButton>
                            <NavbarButton
                                variant="primary"
                                href="/signup"
                                onClick={() => posthog?.capture('landing_cta_clicked', { cta_text: 'Get Started Free', cta_location: 'navbar', destination: '/signup' })}
                            >
                                Get Started Free
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
                                <div className="relative">
                                    <button
                                        ref={mobileResourcesRef}
                                        type="button"
                                        aria-haspopup="menu"
                                        aria-expanded={isMobileResourcesOpen}
                                        onClick={() => setIsMobileResourcesOpen((current) => !current)}
                                        className="navbar-button navbar-button-secondary flex items-center gap-2"
                                        style={{
                                            position: "relative",
                                            padding: "6px 12px",
                                            borderRadius: "9999px",
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            textAlign: "center",
                                            whiteSpace: "nowrap",
                                            margin: 0,
                                            textDecoration: "none",
                                            border: "none",
                                            background: "transparent",
                                        }}
                                    >
                                        <span>Resources</span>
                                        <svg
                                            className={cn("h-3.5 w-3.5 transition-transform", isMobileResourcesOpen && "rotate-180")}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.8}
                                                d="M6 9l6 6 6-6"
                                            />
                                        </svg>
                                    </button>
                                    <ResourceFlyout
                                        open={isMobileResourcesOpen}
                                        onClose={() => setIsMobileResourcesOpen(false)}
                                        onOpen={() => setIsMobileResourcesOpen(true)}
                                        anchorRef={mobileResourcesRef}
                                        flyoutRef={mobileResourcesFlyoutRef}
                                        className="w-[min(22rem,calc(100vw-2rem))]"
                                    />
                                </div>
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
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </a>
                                ))}
                                <a
                                    href="/login"
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        posthog?.capture('landing_cta_clicked', { cta_text: 'Login', cta_location: 'navbar_mobile', destination: '/login' });
                                    }}
                                    className="flex items-center justify-between text-zinc-900 dark:text-zinc-100 text-xl font-medium hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                >
                                    <span className="block">Login</span>
                                </a>
                            </div>

                            {/* Primary CTA Button */}
                            <div>
                                <NavbarButton
                                    href="/signup"
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        posthog?.capture('landing_cta_clicked', { cta_text: 'Get Started Free', cta_location: 'navbar_mobile', destination: '/signup' });
                                    }}
                                    variant="primary"
                                    className="w-full py-4 text-lg font-semibold rounded-lg"
                                >
                                    Get Started Free
                                </NavbarButton>
                            </div>
                        </MobileNavMenu>
                    </MobileNav>
                )}
            </Navbar>
        </div>
    );
}
