'use client';

import Link from 'next/link';
import { ArrowRight, Calendar, Globe, Mail, Twitter, Linkedin, Github } from 'lucide-react';
import { useState } from 'react';
import '@/app/styles/Footer.css';

export function Footer() {
    const [email, setEmail] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            // Handle newsletter subscription logic here
            setIsSubscribed(true);
            setEmail('');
            setTimeout(() => setIsSubscribed(false), 3000);
        }
    };

    return (
        <footer className="footer-container">
            {/* Hero Section */}
            <section className="footer-hero">
                <div className="footer-hero-content">
                    <div className="footer-hero-left">
                        <h2 className="footer-hero-title">Never Miss What Matters in Tech</h2>
                        <p className="footer-hero-description">
                            Stay ahead with Kure-Cal - your comprehensive source for tech conferences,
                            product launches, and industry events that shape the future.
                        </p>
                        <div className="footer-platform-links">
                            <span className="platform-label">Available on:</span>
                            <div className="platform-icons">
                                <Link href="/mobile" className="platform-icon" aria-label="Mobile App">
                                    <Calendar size={20} />
                                </Link>
                                <Link href="/calendar" className="platform-icon" aria-label="Web Calendar">
                                    <Globe size={20} />
                                </Link>
                                <Link href="/subscribe" className="platform-icon" aria-label="Email Updates">
                                    <Mail size={20} />
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="footer-hero-right">
                        <Link href="/calendar" className="footer-hero-cta">
                            <span>View Live Calendar</span>
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Main Footer */}
            <section className="footer-main">
                <div className="footer-columns">
                    <div className="footer-column">
                        <h3 className="footer-column-title">Quick Links</h3>
                        <nav className="footer-nav">
                            <Link href="/" className="footer-link">Home</Link>
                            <Link href="/calendar" className="footer-link">Calendar</Link>
                            <Link href="/dashboard" className="footer-link">Dashboard</Link>
                            <Link href="/pricing" className="footer-link">Pricing</Link>
                            <Link href="/blog" className="footer-link">Blog</Link>
                            <Link href="/contact" className="footer-link">Contact</Link>
                        </nav>
                    </div>

                    <div className="footer-column">
                        <h3 className="footer-column-title">Contact & Legal</h3>
                        <nav className="footer-nav">
                            <Link href="mailto:hello@kure-cal.com" className="footer-link">
                                hello@kure-cal.com
                            </Link>
                            <Link href="/legal/privacy" className="footer-link">Privacy Policy</Link>
                            <Link href="/legal/terms" className="footer-link">Terms & Conditions</Link>
                            <Link href="/support" className="footer-link">Support Center</Link>
                        </nav>
                    </div>

                    <div className="footer-column">
                        <h3 className="footer-column-title">Join the Community</h3>
                        <p className="footer-community-text">
                            Follow us for the latest tech event updates and industry insights.
                        </p>
                        <div className="footer-social-icons">
                            <Link href="https://twitter.com/kurecal" className="footer-social-icon" aria-label="Twitter">
                                <Twitter size={20} />
                            </Link>
                            <Link href="https://linkedin.com/company/kurecal" className="footer-social-icon" aria-label="LinkedIn">
                                <Linkedin size={20} />
                            </Link>
                            <Link href="https://github.com/kurecal" className="footer-social-icon" aria-label="GitHub">
                                <Github size={20} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Newsletter Section */}
            <section className="footer-newsletter">
                <div className="footer-newsletter-content">
                    <h3 className="footer-newsletter-title">Never Miss an Event</h3>
                    <p className="footer-newsletter-subtitle">Join our community!</p>
                </div>
                <form onSubmit={handleNewsletterSubmit} className="footer-newsletter-form">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="footer-newsletter-input"
                        required
                        aria-label="Email address"
                    />
                    <button
                        type="submit"
                        className="footer-newsletter-button"
                        disabled={isSubscribed}
                    >
                        {isSubscribed ? 'Subscribed!' : 'Subscribe Free'}
                    </button>
                </form>
            </section>

            {/* Footer Bottom */}
            <section className="footer-bottom">
                <p className="footer-copyright">
                    Copyright © 2024 Kure-Cal |
                    <Link href="/legal/privacy" className="footer-bottom-link"> Privacy Policy</Link>
                </p>
            </section>
        </footer>
    );
}   