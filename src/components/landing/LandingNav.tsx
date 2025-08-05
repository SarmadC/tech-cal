'use client';

import Link from 'next/link';

export function LandingNav() {
    return (
        <nav className="nav">
            <div className="nav-container">
                <div className="logo">Kure-Cal</div>
                <ul className="nav-links">
                    <li><Link href="#features" className="nav-link">Features</Link></li>
                    <li><Link href="/blog" className="nav-link">Blog</Link></li>
                </ul>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="nav-link">Sign In</Link>
                    <Link href="/signup" className="nav-cta">Start Free Trial</Link>
                </div>
            </div>
        </nav>
    );
}