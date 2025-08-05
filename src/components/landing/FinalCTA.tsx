'use client';

import Link from 'next/link';

export function FinalCTA() {
    return (
        <section className="final-cta">
            <div className="final-cta-content">
                <h2 className="fade-in">Ready to cure your tech FOMO?</h2>
                <p className="fade-in">Join 50,000+ professionals who have found the antidote to information overload.</p>
                <Link href="/signup" className="final-cta-button fade-in">
                    Start Your Free Trial
                </Link>
            </div>
        </section>
    );
}