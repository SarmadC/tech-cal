'use client';

import React, { useState } from 'react';
import { CalendarBlank, Clock, MapPin, Users, CaretRight, Bookmark, ArrowSquareOut, Plus, Check } from '@phosphor-icons/react';
import styles from './FeatureShowcaseSection.module.css';

// Feature data
const features = [
    {
        id: 'agenda',
        title: 'Plan your day in minutes',
        items: [
            {
                label: 'Every session, time-stamped',
                detail: 'Scan the full agenda with clear start and end times so you can build a precise, conflict-free plan.',
            },
            {
                label: 'Tracks and topic tags',
                detail: 'Spot the sessions that match your focus with color-coded tracks and topic tags you can scan fast.',
            },
            {
                label: 'One-tap calendar adds',
                detail: 'Save the sessions you care about to your calendar in a click so you never miss a start time.',
            },
        ],
    },
    {
        id: 'timeline',
        title: 'See the whole day at a glance',
        description: 'A visual timeline shows every track and session so you can spot gaps, overlaps, and key moments instantly.',
        items: [], // Static blocks use description
    },
    {
        id: 'speakers',
        title: 'Meet the minds behind the sessions',
        description: 'See who\'s speaking, what they\'re covering, and where to catch them.',
    },
];

// Interactive Mockup Components

export function AgendaMockup() {
    const [bookmarked, setBookmarked] = useState(false);
    const [starredSessions, setStarredSessions] = useState<number[]>([]);

    const toggleStar = (id: number) => {
        if (starredSessions.includes(id)) {
            setStarredSessions(starredSessions.filter(sid => sid !== id));
        } else {
            setStarredSessions([...starredSessions, id]);
        }
    };

    return (
        <div className={styles.mockupCard}>
            {/* Header: Event Info + Actions */}
            <div className={styles.agendaHeader}>
                <div className={styles.agendaInfo}>
                    <div className={styles.agendaTitle}>Nvidia GTC 2025</div>
                    <div className={styles.agendaMeta}>
                        <div className={styles.metaItem}>
                            <CalendarBlank size={14} weight="bold" />
                            <span>Mar 17–21, 2025</span>
                        </div>
                        <div className={styles.metaItem}>
                            <MapPin size={14} weight="bold" />
                            <span>San Jose, CA</span>
                        </div>
                    </div>
                </div>
                <div className={styles.agendaActions}>
                    <button
                        className={`${styles.iconButton} ${bookmarked ? styles.actionActive : ''}`}
                        onClick={() => setBookmarked(!bookmarked)}
                        aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark agenda'}
                    >
                        <Bookmark size={14} weight={bookmarked ? "fill" : "bold"} />
                    </button>
                    <button
                        className={styles.iconButton}
                        onClick={() => window.open('https://www.nvidia.com/gtc/', '_blank')}
                        aria-label="Open event website"
                    >
                        <ArrowSquareOut size={14} weight="bold" />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className={styles.filterBar}>
                <div className={styles.sessionCount}>
                    <Users size={14} weight="bold" />
                    <span>12 sessions • 3 tracks</span>
                </div>
                <div className={styles.viewToggle}>
                    <button className={`${styles.toggleButton} ${styles.active}`}>Timeline</button>
                    <button className={styles.toggleButton}>Tracks</button>
                </div>
            </div>

            {/* Session List (Linear Style) */}
            <div className={styles.sessionsList}>
                {/* Item 1 */}
                <div className={styles.sessionRow} onClick={() => toggleStar(1)}>
                    <div className={styles.sessionMain}>
                        <span className={`${styles.sessionTag} ${styles.tagKeynote}`}>Keynote</span>
                        <span className={styles.sessionTitle}>The Future of AI Computing</span>
                        <div className={styles.sessionDetails}>
                            <div className={styles.detailItem}>
                                <MapPin size={12} weight="fill" />
                                <span>Hall A</span>
                            </div>
                            <div className={styles.detailItem}>
                                <Users size={12} weight="fill" />
                                <span>3 speakers</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.sessionMeta}>
                        <span className={styles.sessionTimeBadge}>09:00</span>
                        <button
                            className={`${styles.addButton} ${starredSessions.includes(1) ? styles.actionActive : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleStar(1); }}
                            aria-label={starredSessions.includes(1) ? 'Remove from schedule' : 'Add to schedule'}
                        >
                            {starredSessions.includes(1) ? <Check size={12} weight="bold" /> : <Plus size={12} weight="bold" />}
                        </button>
                    </div>
                </div>

                {/* Item 2 */}
                <div className={styles.sessionRow} onClick={() => toggleStar(2)}>
                    <div className={styles.sessionMain}>
                        <span className={`${styles.sessionTag} ${styles.tagWorkshop}`}>Workshop</span>
                        <span className={styles.sessionTitle}>Building with CUDA 13</span>
                        <div className={styles.sessionDetails}>
                            <div className={styles.detailItem}>
                                <MapPin size={12} weight="fill" />
                                <span>Room 204</span>
                            </div>
                            <div className={styles.detailItem}>
                                <Users size={12} weight="fill" />
                                <span>1 speaker</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.sessionMeta}>
                        <span className={styles.sessionTimeBadge}>11:30</span>
                        <button
                            className={`${styles.addButton} ${starredSessions.includes(2) ? styles.actionActive : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleStar(2); }}
                            aria-label={starredSessions.includes(2) ? 'Remove from schedule' : 'Add to schedule'}
                        >
                            {starredSessions.includes(2) ? <Check size={12} weight="bold" /> : <Plus size={12} weight="bold" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TimelineMockup() {
    const [activeTrack, setActiveTrack] = useState<string | null>(null);
    const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

    return (
        <div className={styles.mockupCard}>
            {/* Track View Header */}
            <div className={styles.trackHeader}>
                <div className={styles.trackTimeColumn}></div>
                <div className={styles.trackColumn}>
                    <div
                        className={`${styles.trackCard} ${activeTrack === 'aiml' ? styles.trackCardActive : ''}`}
                        onClick={() => setActiveTrack(activeTrack === 'aiml' ? null : 'aiml')}
                    >
                        <span className={styles.trackName}>AI/ML Track</span>
                    </div>
                </div>
                <div className={styles.trackColumn}>
                    <div
                        className={`${styles.trackCard} ${activeTrack === 'dev' ? styles.trackCardActive : ''}`}
                        onClick={() => setActiveTrack(activeTrack === 'dev' ? null : 'dev')}
                    >
                        <span className={styles.trackName}>Developer</span>
                    </div>
                </div>
                <div className={styles.trackColumn}>
                    <div
                        className={`${styles.trackCard} ${activeTrack === 'design' ? styles.trackCardActive : ''}`}
                        onClick={() => setActiveTrack(activeTrack === 'design' ? null : 'design')}
                    >
                        <span className={styles.trackName}>Design</span>
                    </div>
                </div>
                <div className={styles.trackColumn}>
                    <div
                        className={`${styles.trackCard} ${activeTrack === 'product' ? styles.trackCardActive : ''}`}
                        onClick={() => setActiveTrack(activeTrack === 'product' ? null : 'product')}
                    >
                        <span className={styles.trackName}>Product</span>
                    </div>
                </div>
            </div>

            {/* Time Rows */}
            <div className={styles.trackGrid}>
                <div className={styles.trackRow}>
                    <div className={styles.trackTimeCell}>
                        <span className={styles.yellowTimeBadge}>09:00</span>
                    </div>
                    <div className={styles.trackEventCell}>
                        <div
                            className={`${styles.trackEvent} ${hoveredEvent === 'keynote' ? styles.trackEventHovered : ''}`}
                            onMouseEnter={() => setHoveredEvent('keynote')}
                            onMouseLeave={() => setHoveredEvent(null)}
                        >
                            <span className={styles.trackEventType}>KEYNOTE</span>
                            <span className={styles.trackEventTitle}>Opening Keynote</span>
                        </div>
                    </div>
                    <div className={styles.trackEventCell}></div>
                    <div className={styles.trackEventCell}></div>
                    <div className={styles.trackEventCell}></div>
                </div>

                <div className={styles.trackRow}>
                    <div className={styles.trackTimeCell}>
                        <span className={styles.yellowTimeBadge}>11:00</span>
                    </div>
                    <div className={styles.trackEventCell}>
                        <div
                            className={`${styles.trackEvent} ${hoveredEvent === 'llm' ? styles.trackEventHovered : ''}`}
                            onMouseEnter={() => setHoveredEvent('llm')}
                            onMouseLeave={() => setHoveredEvent(null)}
                        >
                            <span className={styles.trackEventType}>SESSION</span>
                            <span className={styles.trackEventTitle}>LLM Training</span>
                        </div>
                    </div>
                    <div className={styles.trackEventCell}>
                        <div
                            className={`${styles.trackEvent} ${hoveredEvent === 'cuda' ? styles.trackEventHovered : ''}`}
                            onMouseEnter={() => setHoveredEvent('cuda')}
                            onMouseLeave={() => setHoveredEvent(null)}
                        >
                            <span className={styles.trackEventType}>WORKSHOP</span>
                            <span className={styles.trackEventTitle}>CUDA Fund.</span>
                        </div>
                    </div>
                    <div className={styles.trackEventCell}>
                        <div
                            className={`${styles.trackEvent} ${hoveredEvent === 'ui' ? styles.trackEventHovered : ''}`}
                            onMouseEnter={() => setHoveredEvent('ui')}
                            onMouseLeave={() => setHoveredEvent(null)}
                        >
                            <span className={styles.trackEventType}>SESSION</span>
                            <span className={styles.trackEventTitle}>UI Patterns</span>
                        </div>
                    </div>
                    <div className={styles.trackEventCell}></div>
                </div>

                <div className={styles.trackRow}>
                    <div className={styles.trackTimeCell}>
                        <span className={styles.yellowTimeBadge}>13:00</span>
                    </div>
                    <div className={styles.trackEventCell}>
                        <div
                            className={`${styles.trackEvent} ${hoveredEvent === 'panel' ? styles.trackEventHovered : ''}`}
                            onMouseEnter={() => setHoveredEvent('panel')}
                            onMouseLeave={() => setHoveredEvent(null)}
                        >
                            <span className={styles.trackEventType}>PANEL</span>
                            <span className={styles.trackEventTitle}>Future of AI</span>
                        </div>
                    </div>
                    <div className={styles.trackEventCell}></div>
                    <div className={styles.trackEventCell}></div>
                    <div className={styles.trackEventCell}>
                        <div
                            className={`${styles.trackEvent} ${hoveredEvent === 'roadmap' ? styles.trackEventHovered : ''}`}
                            onMouseEnter={() => setHoveredEvent('roadmap')}
                            onMouseLeave={() => setHoveredEvent(null)}
                        >
                            <span className={styles.trackEventType}>SESSION</span>
                            <span className={styles.trackEventTitle}>Roadmap</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SpeakersMockup() {
    const [activeCard, setActiveCard] = useState<'back' | 'middle' | 'front' | null>(null);

    return (
        /* Stack Container - Removed outer mockupCard wrapper for floating look */
        <div
            className={styles.stackContainer}
            onMouseLeave={() => setActiveCard(null)}
        >
            {/* Back Card (Level 3) */}
            <div
                className={`${styles.stackCard} ${styles.stackCardBack} ${activeCard === 'back' ? styles.stackCardActive : ''}`}
                onMouseEnter={() => setActiveCard('back')}
            >
                <div className={styles.stackHeader}>
                    {/* Logo: TechCrunch */}
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/b/b9/TechCrunch_logo.svg"
                        alt="TechCrunch"
                        className={styles.techCrunchLogo}
                    />
                </div>
                <div className={styles.stackContent}>
                    <div className={styles.speakerRow}>
                        <div className={`${styles.speakerPhoto} ${styles.speakerGreen}`}>
                            <span>MJ</span>
                        </div>
                        <span className={styles.speakerName}>Mike Johnson</span>
                    </div>
                    <span className={styles.stackText}>AI Ethics Panel: Safety, Policy, and Real-World Impact</span>
                    <div className={styles.stackFooter}>
                        <span>02:00 PM</span>
                    </div>
                </div>
            </div>

            {/* Middle Card (Level 2) */}
            <div
                className={`${styles.stackCard} ${styles.stackCardMiddle} ${activeCard === 'middle' ? styles.stackCardActive : ''}`}
                onMouseEnter={() => setActiveCard('middle')}
            >
                <div className={styles.stackHeader}>
                    {/* Logo: OpenAI */}
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg"
                        alt="OpenAI"
                        className={`${styles.logoImage} ${styles.invertLogo}`}
                    />
                </div>
                <div className={styles.stackContent}>
                    <div className={styles.speakerRow}>
                        <div className={`${styles.speakerPhoto} ${styles.speakerPurple}`}>
                            <span>SC</span>
                        </div>
                        <span className={styles.speakerName}>Sarah Chen</span>
                    </div>
                    <span className={styles.stackText}>Scaling PyTorch from Prototype to Production</span>
                    <div className={styles.stackFooter}>
                        <span>11:00 AM</span>
                    </div>
                </div>
            </div>

            {/* Front Card (Level 1) */}
            <div
                className={`${styles.stackCard} ${styles.stackCardFront} ${activeCard === 'front' ? styles.stackCardActive : ''}`}
                onMouseEnter={() => setActiveCard('front')}
            >
                <div className={styles.stackHeader}>
                    {/* Logo: NVIDIA */}
                    <img
                        src="https://mddgtexrnnlctttbcpsy.supabase.co/storage/v1/object/public/logos/nvidia.svg"
                        alt="Nvidia"
                        className={styles.logoImage}
                    />
                </div>
                <div className={styles.stackContent}>
                    <div className={styles.speakerRow}>
                        <div className={`${styles.speakerPhoto} ${styles.speakerFront}`}>
                            <span>JH</span>
                        </div>
                        <span className={styles.speakerName}>Jensen Huang</span>
                    </div>
                    <span className={styles.stackText}>Opening Keynote: The Next Wave of AI Computing</span>
                    <div className={styles.stackFooter}>
                        <span>09:00 AM</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Map feature IDs to mockups
const mockupComponents: Record<string, React.ReactNode> = {
    agenda: <AgendaMockup />,
    timeline: <TimelineMockup />,
    speakers: <SpeakersMockup />,
};

// Static Feature Block (Top Row)
const StaticFeatureBlock = ({ feature }: { feature: any }) => {
    return (
        <div className={`${styles.featureCard} ${styles.staticBlock}`}>
            <div className={styles.staticContent}>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>
                    {feature.description}
                </p>
            </div>
            <div className={styles.staticMockup}>
                {mockupComponents[feature.id]}
            </div>
        </div>
    );
};

// Interactive Feature Block (Bottom Row)
const InteractiveFeatureBlock = ({ feature }: { feature: any }) => {
    const [activeItemIndex, setActiveItemIndex] = useState(0);

    return (
        <div className={`${styles.featureCard} ${styles.interactiveBlock}`}>
            <div className={styles.interactiveContent}>
                <div>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureDescription} style={{ marginTop: '12px' }}>
                        {feature.items[activeItemIndex].detail}
                    </p>
                </div>
                <div className={styles.featureList}>
                    {feature.items.map((item: any, itemIndex: number) => (
                        <div
                            key={itemIndex}
                            className={`${styles.featureItem} ${activeItemIndex === itemIndex ? styles.featureItemActive : ''}`}
                            onClick={() => setActiveItemIndex(itemIndex)}
                        >
                            <span
                                className={`${styles.accentBar} ${activeItemIndex !== itemIndex ? styles.accentBarSecondary : ''}`}
                            />
                            <div className={styles.featureItemContent}>
                                <span className={styles.featureItemLabel}>{item.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className={styles.interactiveMockup}>
                {mockupComponents[feature.id]}
            </div>
        </div>
    );
};

export function FeatureShowcaseSection() {
    const timelineFeature = features.find(f => f.id === 'timeline');
    const speakersFeature = features.find(f => f.id === 'speakers');
    const agendaFeature = features.find(f => f.id === 'agenda');

    return (
        <section className={styles.section} id="feature-showcase">
            <div className={styles.container}>
                <div className={styles.bentoGrid}>
                    {/* Top Row - 2 Static Columns */}
                    {timelineFeature && <StaticFeatureBlock feature={timelineFeature} />}
                    {speakersFeature && <StaticFeatureBlock feature={speakersFeature} />}

                    {/* Bottom Row - 1 Interactive Column */}
                    {agendaFeature && <InteractiveFeatureBlock feature={agendaFeature} />}
                </div>
            </div>
        </section>
    );
}
