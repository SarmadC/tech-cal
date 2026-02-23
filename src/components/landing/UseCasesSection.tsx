'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { DiscoveryGraphic, CalendarSyncGraphic, InsightsGraphic } from './UseCaseGraphics';
import styles from './UseCasesSection.module.css';

type UseCase = {
    id: string;
    title: string;
    description: string;
    features: string[];
    graphic: React.ReactNode;
};

const useCases: UseCase[] = [
    {
        id: 'discovery',
        title: "Find the right events without the noise",
        description: "Events matched to your skills, interests, and career goals so you spend less time searching and more time learning.",
        features: [
            "Recommendations based on your profile and interests",
            "Filter by stack, skill level, and career stage",
            "Relevance score for every event",
            "Save events into custom collections"
        ],
        graphic: <DiscoveryGraphic />,
    },
    {
        id: 'calendar-sync',
        title: "Add to Google Calendar in one tap",
        description: "One tap to block time, set reminders, and sync with Google Calendar. No more double-booking or missed sessions.",
        features: [
            "Instant Google Calendar sync",
            "Automatic conflict detection",
            "Timezone adjustments built in",
            "Custom reminders before every event"
        ],
        graphic: <CalendarSyncGraphic />,
    },
    {
        id: 'insights',
        title: "See how your career is growing",
        description: "Track the events you attend, the skills you build, and the connections you make, all in one dashboard.",
        features: [
            "Attendance history at a glance",
            "Skill progression over time",
            "Networking impact tracking",
            "Personalized growth tips"
        ],
        graphic: <InsightsGraphic />,
    },
];

export function UseCasesSection() {
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    const expandedCard = useCases.find(uc => uc.id === expandedCardId);

    const openCard = useCallback((id: string) => {
        setExpandedCardId(id);
        setIsClosing(false);
        document.body.style.overflow = 'hidden';
    }, []);

    const closeCard = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setExpandedCardId(null);
            setIsClosing(false);
            document.body.style.overflow = '';
        }, 250);
    }, []);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && expandedCardId) {
                closeCard();
            }
        };

        if (expandedCardId) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [expandedCardId, closeCard]);

    // Cleanup body overflow on unmount
    useEffect(() => {
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <section className={styles.section} id="use-cases">
            <div className={styles.sectionContent}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        Built for how you actually grow
                    </h2>
                    <p className={styles.sectionSubtitle}>
                        Three ways Kure Cal helps you invest in your career without the overhead.
                    </p>
                </div>

                <div className={styles.useCasesCarousel}>
                    {useCases.map((useCase) => (
                        <article
                            className={styles.useCaseCard}
                            key={useCase.id}
                            onClick={() => openCard(useCase.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openCard(useCase.id);
                                }
                            }}
                        >
                            <div className={styles.cardContent}>
                                <div className={styles.useCaseGraphic}>
                                    {useCase.graphic}
                                </div>
                                <div className={styles.useCaseFooter}>
                                    <h3 className={styles.useCaseTitle}>{useCase.title}</h3>
                                    <span
                                        className={styles.useCasePlusIcon}
                                        aria-hidden="true"
                                    >
                                        <Plus size={16} weight="regular" />
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Popover Modal */}
                {expandedCardId && expandedCard && (
                    <div
                        className={`${styles.popoverBackdrop} ${isClosing ? styles.popoverClosing : ''}`}
                        onClick={closeCard}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="popover-title"
                    >
                        <div
                            className={`${styles.popoverModal} ${isClosing ? styles.popoverClosing : ''}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className={styles.popoverCloseButton}
                                onClick={closeCard}
                                aria-label="Close details"
                            >
                                <X size={20} weight="regular" />
                            </button>

                            <div className={styles.popoverContent}>
                                <div className={styles.popoverGraphic}>
                                    {expandedCard.graphic}
                                </div>

                                <div className={styles.popoverDetails}>
                                    <h3 id="popover-title" className={styles.popoverTitle}>
                                        {expandedCard.title}
                                    </h3>
                                    <p className={styles.popoverDescription}>
                                        {expandedCard.description}
                                    </p>
                                    <ul className={styles.popoverFeatures}>
                                        {expandedCard.features.map((feature, index) => (
                                            <li key={index} className={styles.popoverFeatureItem}>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}



