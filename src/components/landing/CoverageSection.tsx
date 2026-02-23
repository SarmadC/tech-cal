'use client';

import styles from './CoverageSection.module.css';

const metrics = [
    { label: "cities covered", value: "75+", detail: "The cities where tech professionals actually travel and attend." },
    { label: "filters & tags", value: "120+", detail: "Stack, topic, format, seniority, accessibility, and more." },
    { label: "events tracked", value: "500+", detail: "Conferences, workshops, hackathons, and meetups updated weekly." },
];


export function CoverageSection() {
    return (
        <section className={styles.section} id="coverage">
            <div className={styles.sectionContent}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Reliable data you can trust</h2>
                    <p className={styles.sectionSubtitle}>
                        Fresh events, fast filters, and a clean calendar. Every week.
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

            </div>
        </section>
    );
}





