'use client';

import styles from './FAQSection.module.css';

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

export function FAQSection() {
    return (
        <section className={styles.section} id="faq">
            <div className={styles.sectionContent}>
                <div className={styles.sectionHeader}>
                    <p className={styles.sectionKicker}>Questions, answered</p>
                    <h2 className={styles.sectionTitle}>FAQ</h2>
                    <p className={styles.sectionSubtitle}>Focused on the friction points we hear most often.</p>
                </div>

                <div className={styles.faqGrid}>
                    {faqs.map((faq, index) => (
                        <details className={styles.faqItem} key={faq.question} open={index === 0}>
                            <summary className={styles.faqQuestion}>
                                {faq.question}
                                <span className={styles.faqIcon} aria-hidden>+</span>
                            </summary>
                            <div className={styles.faqAnswerWrapper}>
                                <p className={styles.faqAnswer}>{faq.answer}</p>
                            </div>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}


