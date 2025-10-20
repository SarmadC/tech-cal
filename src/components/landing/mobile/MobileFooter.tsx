'use client';

import React from 'react';
import Link from 'next/link';
import { EnvelopeSimpleIcon, TwitterLogoIcon, LinkedinLogoIcon } from '@phosphor-icons/react';

export interface MobileFooterProps {
  className?: string;
}

const MobileFooter: React.FC<MobileFooterProps> = ({ className = '' }) => {
  return (
    <footer className={`mobile-footer ${className}`}>
      <div className="mobile-footer-main">
        {/* Slim CTA strip */}
        <div className="mobile-footer-cta-strip">
          <p className="cta-strip-text">Events tailored to you</p>
          <Link
            href="/signup"
            className="cta-strip-action"
            aria-label="Start your free account"
          >
            <span>Start free</span>
          </Link>
        </div>

        {/* Essential links */}
        <nav className="mobile-footer-compact" aria-label="Footer">
          <ul className="mobile-footer-links-grid" role="list">
            <li><Link href="/pricing" className="grid-link">Pricing</Link></li>
            <li><Link href="/blog" className="grid-link">Blog</Link></li>
          </ul>
        </nav>

        {/* Meta row */}
        <div className="mobile-footer-meta">
          <Link href="mailto:hello@kure-cal.com" className="meta-link email">
            <EnvelopeSimpleIcon size={14} />
            <span>hello@kure-cal.com</span>
          </Link>
          <span className="meta-sep" aria-hidden="true">·</span>
          <Link href="/legal/privacy" className="meta-link">Privacy</Link>
          <span className="meta-sep" aria-hidden="true">·</span>
          <Link href="/legal/terms" className="meta-link">Terms</Link>
        </div>

        {/* Social row */}
        <div className="mobile-footer-social-row">
          <Link href="https://twitter.com/kurecal" className="social-icon" aria-label="Twitter">
            <TwitterLogoIcon size={18} />
          </Link>
          <Link href="https://linkedin.com/company/kurecal" className="social-icon" aria-label="LinkedIn">
            <LinkedinLogoIcon size={18} />
          </Link>
        </div>

        {/* Bottom tiny meta removed per request */}
      </div>
    </footer>
  );
};

export default MobileFooter;
