'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRightIcon, CalendarIcon, EnvelopeSimpleIcon, TwitterLogoIcon, LinkedinLogoIcon } from '@phosphor-icons/react';
import { Highlight } from '../../ui/hero-highlight';

export interface MobileFooterProps {
  className?: string;
}

const MobileFooter: React.FC<MobileFooterProps> = ({ className = '' }) => {
  return (
    <footer className={`mobile-footer ${className}`}>
      {/* Main Footer Content */}
      <div className="mobile-footer-main">
        <div className="mobile-footer-content">
          {/* Intro Section */}
          <div className="mobile-footer-intro">
            <h2 className="mobile-footer-title">
              <Highlight className="text-black dark:text-white">
                Tech Events
              </Highlight> that matter to your career and interests
            </h2>

            {/* Mobile CTA Section */}
            <div className="mobile-footer-cta">
              <h3 className="mobile-cta-title">Get personalized event recommendations</h3>
              <p className="mobile-cta-subtitle">
                Get personalized event recommendations based on what you want to learn
              </p>
              <Link 
                href="/signup" 
                className="mobile-cta-button"
                aria-label="Start your free account to access tech events calendar"
              >
                <CalendarIcon size={18} />
                <span>Start Free Account</span>
                <ArrowRightIcon size={18} />
              </Link>
            </div>
          </div>

          {/* Mobile Footer Links */}
          <div className="mobile-footer-links">
            <div className="mobile-footer-section">
              <h3 className="mobile-footer-section-title">Quick Links</h3>
              <nav className="mobile-footer-nav">
                <Link href="/calendar" className="mobile-footer-link">Calendar</Link>
                <Link href="/dashboard" className="mobile-footer-link">Dashboard</Link>
                <Link href="/pricing" className="mobile-footer-link">Pricing</Link>
                <Link href="/blog" className="mobile-footer-link">Blog</Link>
                <Link href="/contact" className="mobile-footer-link">Contact</Link>
              </nav>
            </div>

            <div className="mobile-footer-section">
              <h3 className="mobile-footer-section-title">Contact & Legal</h3>
              <nav className="mobile-footer-nav">
                <Link href="mailto:hello@kure-cal.com" className="mobile-footer-link mobile-footer-email">
                  <EnvelopeSimpleIcon size={16} />
                  hello@kure-cal.com
                </Link>
                <Link href="/legal/privacy" className="mobile-footer-link">Privacy Policy</Link>
                <Link href="/legal/terms" className="mobile-footer-link">Terms & Conditions</Link>
              </nav>
            </div>

            <div className="mobile-footer-section">
              <h3 className="mobile-footer-section-title">Join the Community</h3>
              <p className="mobile-footer-community-text">
                Follow us for the latest tech event updates and industry insights.
              </p>
              <div className="mobile-footer-social">
                <Link href="https://twitter.com/kurecal" className="mobile-footer-social-icon twitter" aria-label="Twitter">
                  <TwitterLogoIcon size={20} />
                </Link>
                <Link href="https://linkedin.com/company/kurecal" className="mobile-footer-social-icon linkedin" aria-label="LinkedIn">
                  <LinkedinLogoIcon size={20} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Footer Bottom */}
        <div className="mobile-footer-bottom">
          <div className="mobile-footer-logo">Kure-Cal</div>
          <p className="mobile-footer-copyright">
            © 2024 Kure-Cal. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default MobileFooter;
