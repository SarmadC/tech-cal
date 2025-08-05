'use client';

export function SocialProof() {
    return (
        <section className="social-proof fade-in">
            <h3 className="social-proof-title">Trusted by teams at</h3>
            <div className="company-logos">
                <div className="company-logo">Stripe</div>
                <div className="company-logo">Vercel</div>
                <div className="company-logo">Linear</div>
                <div className="company-logo">Notion</div>
                <div className="company-logo">Figma</div>
            </div>
            <p className="user-count">Join 50,000+ developers who never miss important tech events</p>
        </section>
    );
}