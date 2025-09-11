'use client';

import Link from 'next/link';
import { ArrowRightIcon, CalendarIcon, EnvelopeSimpleIcon, TwitterLogoIcon, LinkedinLogoIcon } from '@phosphor-icons/react';
import { Highlight } from '../ui/hero-highlight';
import '@/app/styles/footer.css';

export function Footer() {
    return (
        <footer className="footer-container">
            {/* Main Footer */}
            <section className="footer-main">
                <div className="footer-content">
                    <div className="footer-intro">
                        <h2 className="footer-intro-title">
                            <Highlight className="text-black dark:text-white">
                                Tech Events
                            </Highlight> that matter to your career and interests
                        </h2>

                        {/* Prominent CTA Section */}
                        <div className="footer-cta-section">
                            <h3 className="cta-title">Get personalized event recommendations</h3>
                            <p className="cta-subtitle">Get personalized event recommendations based on what you want to learn</p>
                            <Link href="/signup" className="cta-button">
                                <CalendarIcon size={20} />
                                <span>Start Free Account</span>
                                <ArrowRightIcon size={20} />
                            </Link>
                        </div>

                    </div>

                    <div className="footer-card">
                        <h3 className="footer-section-title">Quick Links</h3>
                        <nav className="footer-nav">
                            <Link href="/calendar" className="footer-link">Calendar</Link>
                            <Link href="/dashboard" className="footer-link">Dashboard</Link>
                            <Link href="/pricing" className="footer-link">Pricing</Link>
                            <Link href="/blog" className="footer-link">Blog</Link>
                            <Link href="/contact" className="footer-link">Contact</Link>
                        </nav>
                    </div>

                    <div className="footer-card">
                        <h3 className="footer-section-title">Contact & Legal</h3>
                        <nav className="footer-nav">
                            <Link href="mailto:hello@kure-cal.com" className="footer-link footer-email">
                                <EnvelopeSimpleIcon size={16} />
                                hello@kure-cal.com
                            </Link>
                            <Link href="/legal/privacy" className="footer-link">Privacy Policy</Link>
                            <Link href="/legal/terms" className="footer-link">Terms & Conditions</Link>
                        </nav>
                    </div>

                    <div className="footer-card">
                        <h3 className="footer-section-title">Join the Community</h3>
                        <p className="footer-community-text">
                            Follow us for the latest tech event updates and industry insights.
                        </p>
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

        </footer>
    );
}