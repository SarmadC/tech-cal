'use client';

import React from 'react';
import { Plus } from '@phosphor-icons/react';
import { DiscoveryGraphic, CalendarSyncGraphic, InsightsGraphic } from './UseCaseGraphics';
import styles from './UseCasesSection.module.css';

type UseCase = {
    title: string;
    graphic: React.ReactNode;
};

const useCases: UseCase[] = [
    {
        title: "Personalized discovery that matches your career goals",
        graphic: <DiscoveryGraphic />,
    },
    {
        title: "One-tap planning that syncs with Google calendar",
        graphic: <CalendarSyncGraphic />,
    },
    {
        title: "Career insights that track your growth",
        graphic: <InsightsGraphic />,
    },
];

export function UseCasesSection() {
    return (
        <section className={styles.section} id="use-cases">
            <div className={styles.sectionContent}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        Made for serious<br />engineering careers
                    </h2>
                    <p className={styles.sectionSubtitle}>
                        Kure Cal is shaped by the practices that distinguish focused professionals from the rest: 
                        personalized discovery, effortless planning, and a commitment to career growth.
                    </p>
                </div>

                <div className={styles.useCasesGrid}>
                    {useCases.map((useCase) => (
                        <article className={styles.useCaseCard} key={useCase.title}>
                            <div className={styles.useCaseGraphic}>
                                {useCase.graphic}
                            </div>
                            <div className={styles.useCaseFooter}>
                                <h3 className={styles.useCaseTitle}>{useCase.title}</h3>
                                <button 
                                    className={styles.useCasePlusIcon}
                                    aria-label={`Learn more about ${useCase.title}`}
                                >
                                    <Plus size={20} weight="light" />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
