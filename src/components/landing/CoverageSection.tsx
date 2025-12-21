'use client';

import styles from './CoverageSection.module.css';

const metrics = [
    { label: "vetted events / year", value: "3k+", detail: "Curated and de-duplicated before they hit your feed." },
    { label: "cities covered", value: "75+", detail: "Weighted by audience density and travel likelihood." },
    { label: "filters & tags", value: "120+", detail: "Stack, topic, format, seniority, and accessibility ready." },
];

const trustNotes = [
    "Refresh cadence: weekly, with priority on new and changed events.",
    "Latency: tuned for fast server-side filtering; handles multi-filter queries.",
    "Privacy: no inbox scraping; all adds are opt-in from the event card.",
];

export function CoverageSection() {
    return (
        <section className={styles.section} id="coverage">
            <div className={styles.sectionContent}>
                <div className={styles.sectionHeader}>
                    <p className={styles.sectionKicker}>Coverage & quality</p>
                    <h2 className={styles.sectionTitle}>Built for reliability at scale</h2>
                    <p className={styles.sectionSubtitle}>
                        Data stays fresh, filters stay fast, and your calendar stays clean.
                    </p>
                </div>

                <div className={styles.metricsGrid}>
                    {metrics.map((metric) => (
                        <div className={styles.metricCard} key={metric.label}>
                            <div className={styles.metricValue}>{metric.value}</div>
                            <div className={styles.metricLabel}>{metric.label}</div>
                            <p className={styles.metricDetail}>{metric.detail}</p>
                        </div>
                    ))}
                </div>

                <div className={styles.trustNotes}>
                    {trustNotes.map((note) => (
                        <div className={styles.trustNote} key={note}>
                            {note}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}




