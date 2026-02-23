'use client';

import Link from 'next/link';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { EnvelopeSimpleIcon, TwitterLogoIcon, LinkedinLogoIcon } from '@phosphor-icons/react';
import '@/app/styles/footer.css';
import { useSnackbar } from '@/contexts/SnackbarContext';

// Add simple type extension for window.posthog to avoid excessive errors
declare global {
    interface Window {
        posthog?: any;
    }
}

export function Footer() {
    const { isMobile } = useDeviceDetection();
    const { showSuccess } = useSnackbar();

    return (
        <footer className="footer-container">
            {/* Main Footer */}
            <section className="footer-main">
                <div className="footer-content">
                    <div className="footer-intro">
                        <h2 className="footer-intro-title">
                            Find the events that move your career forward
                        </h2>

                        {/* Prominent CTA Section */}
                        <div className="footer-cta-section">
                            <Link
                                href="/signup"
                                className={`cta-button animate-shimmer motion-reduce:animate-none ${isMobile ? 'mobile-optimized' : ''}`}
                                aria-label="Start your free account to access tech events calendar"
                            >
                                <span>Start Free Trial</span>
                            </Link>
                        </div>

                    </div>

                    <div className="footer-card">
                        <h3 className="footer-section-title">Quick Links</h3>
                        <nav className="footer-nav">
                            <Link href="/events" className="footer-link">Discover</Link>
                            <Link href="/calendar?view=month" className="footer-link">Calendar</Link>
                            <Link href="/dashboard" className="footer-link">Dashboard</Link>
                            <Link href="/pricing" className="footer-link">Pricing</Link>
                            <Link href="/blog" className="footer-link">Blog</Link>
                        </nav>
                    </div>

                    <div className="footer-card">
                        <h3 className="footer-section-title">Resources</h3>
                        <nav className="footer-nav">
                            <Link href="/resources/tech-events-calendar-2026" className="footer-link">Events Calendar 2026</Link>
                            <Link href="/resources/cfp-calendar" className="footer-link">CFP Calendar</Link>
                        </nav>
                    </div>

                    <div className="footer-card">
                        <h3 className="footer-section-title">Contact & Legal</h3>
                        <nav className="footer-nav">
                            <Link href="/contact" className="footer-link footer-email" aria-label="Contact Kure-Cal">
                                <EnvelopeSimpleIcon size={16} />
                                Contact Support
                            </Link>
                            <Link href="/legal/privacy" className="footer-link">Privacy Policy</Link>
                            <Link href="/legal/terms" className="footer-link">Terms & Conditions</Link>
                        </nav>
                    </div>

                    <div className="footer-card">
                        <h3 className="footer-section-title">Join the Community</h3>
                        <p className="footer-community-text">
                            Get weekly updates on the best upcoming tech events.
                        </p>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
                            if (email) {
                                // Mock submission
                                showSuccess("Thanks for subscribing! You'll get updates soon.", 3000);
                                if (window.posthog) {
                                    window.posthog.capture('newsletter_signup', { location: 'footer' });
                                }
                                (e.target as HTMLFormElement).reset();
                            }
                        }} className="mt-4 mb-6 flex gap-2">
                            <label htmlFor="footer-email" className="sr-only">Email address</label>
                            <input
                                id="footer-email"
                                type="email"
                                name="email"
                                placeholder="Enter your email"
                                required
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                            />
                            <button
                                type="submit"
                                className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                            >
                                Join
                            </button>
                        </form>

                        <div className="footer-social-icons">
                            <Link href="https://twitter.com/kurecal" className="footer-social-icon twitter" aria-label="Twitter">
                                <TwitterLogoIcon size={20} />
                            </Link>
                            <Link href="https://linkedin.com/company/kurecal" className="footer-social-icon linkedin" aria-label="LinkedIn">
                                <LinkedinLogoIcon size={20} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Large Background Logo */}
                <div className="footer-logo-bg">Kure-Cal</div>
            </section>

            {/* Footer Bottom */}
            <section className="footer-bottom">
                <div className="footer-copyright">
                    © {new Date().getFullYear()} Kure-Cal. All rights reserved.
                    <Link href="/legal/privacy" className="footer-bottom-link">Privacy Policy</Link> •
                    <Link href="/legal/terms" className="footer-bottom-link">Terms of Service</Link>
                </div>
            </section>

        </footer>
    );
}
