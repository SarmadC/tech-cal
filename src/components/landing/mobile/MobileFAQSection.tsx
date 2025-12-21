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
    answer: "We refresh event metadata weekly and prioritize recency signals so stale or cancelled events are filtered down.",
  },
  {
    question: "Will one-tap add overwrite my calendar colors?",
    answer: "No. We respect your existing Google Calendar settings and only add the event with the metadata shown in the card.",
  },
  {
    question: "Do I need to install an app?",
    answer: "No installs required. Connect your Google Calendar account and add events directly with one tap.",
  },
  {
    question: "How do you handle spammy events?",
    answer: "Location scoring, source reputation, and manual curation reduce low-quality events before they reach your feed.",
  },
  {
    question: "What calendar integrations are available?",
    answer: "Currently, we support Google Calendar integration. Connect your account in settings to sync events automatically.",
  },
];

const MobileFAQSection: React.FC<MobileFAQSectionProps> = ({ className = '' }) => {
  return (
    <section className={`mobile-faq ${className}`} id="faq">
      <div className="mobile-faq-content">
        <div className="mobile-faq-header">
          <p className="mobile-faq-kicker">Questions, answered</p>
          <h2 className="mobile-faq-title">FAQ</h2>
          <p className="mobile-faq-subtitle">
            Focused on the friction points we hear most often.
          </p>
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



