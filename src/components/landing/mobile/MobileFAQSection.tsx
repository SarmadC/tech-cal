'use client';

import React from 'react';

export interface MobileFAQSectionProps {
    className?: string;
}

type FAQ = {
    question: string;
    answer: string;
};

const faqs: FAQ[] = [
    {
        question: "How fresh is the event data?",
        answer: "Events are refreshed weekly. Stale or cancelled events are automatically filtered out so your feed stays current.",
    },
    {
        question: "Will adding events change my calendar settings?",
        answer: "No. Your existing Google Calendar colors and settings stay untouched. Only the event details shown on the card are added.",
    },
    {
        question: "Do I need to install anything?",
        answer: "No. Kure Cal works entirely in your browser. Just connect your Google account and start adding events.",
    },
    {
        question: "How do you keep out low-quality events?",
        answer: "Every event goes through source checks and manual curation. Spammy or low-quality events are removed before they reach your feed.",
    },
    {
        question: "Which calendars do you support?",
        answer: "Google Calendar right now. Connect your account in settings and events sync automatically.",
    },
];

const MobileFAQSection: React.FC<MobileFAQSectionProps> = ({ className = '' }) => {
    return (
        <section className={`mobile-faq ${className}`} id="faq">
            <div className="mobile-faq-content">
                <div className="mobile-faq-header">
                    <h2 className="mobile-faq-title">FAQ</h2>
                </div>

                <div className="mobile-faq-grid">
                    {faqs.map((faq, index) => (
                        <details className="mobile-faq-item" key={faq.question} open={index === 0}>
                            <summary className="mobile-faq-question">
                                {faq.question}
                                <span className="mobile-faq-icon" aria-hidden>+</span>
                            </summary>
                            <p className="mobile-faq-answer">{faq.answer}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MobileFAQSection;




