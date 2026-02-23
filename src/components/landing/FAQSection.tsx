'use client';

import styles from './FAQSection.module.css';

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

export function FAQSection() {
    return (
        <section className={styles.section} id="faq">
            <div className={styles.sectionContent}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>FAQ</h2>
                    <p className={styles.sectionSubtitle}>Focused on the friction points users ask about most.</p>
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





