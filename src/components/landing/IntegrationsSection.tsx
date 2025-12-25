'use client';

import styles from './IntegrationsSection.module.css';

export function IntegrationsSection() {
    return (
        <section className={styles.section} id="integrations">
            <div className={styles.sectionHeader}>
                <p className={styles.sectionKicker}>Calendar integration</p>
                <h2 className={styles.sectionTitle}>Sync with Google Calendar</h2>
                <p className={styles.sectionSubtitle}>
                    Connect your Google Calendar to seamlessly add events with one tap. Your events sync automatically and respect your existing calendar settings.
                </p>
            </div>

            <div className={styles.integrationsGrid}>
                <div className={styles.integrationBadge}>
                    Google Calendar
                </div>
            </div>
        </section>
    );
}





