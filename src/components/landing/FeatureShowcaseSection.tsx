'use client';

import React, { useState } from 'react';
import { CalendarBlank, Clock, MapPin, Users, CaretRight, Bookmark, ArrowSquareOut, Plus, Check } from '@phosphor-icons/react';
import styles from './FeatureShowcaseSection.module.css';

// Feature data
const features = [
    {
        id: 'agenda',
        title: 'Browse complete session breakdowns',
        items: [
            {
                label: 'Session cards with time slots',
                detail: 'Dive deep into event agendas with rich session details. Session cards clearly display start and end times, helping you plan your day with precision.',
            },
            {
                label: 'Topic tags and tracks',
                detail: 'Filter and find sessions that match your interests using color-coded topic tags and track categorization. Quickly identify relevant content at a glance.',
            },
            {
                label: 'Quick-add to calendar',
                detail: 'Seamlessly integrate sessions into your personal schedule. With a single click, add events to your calendar so you never miss a moment.',
            },
        ],
    },
    {
        id: 'timeline',
        title: 'See your schedule at a glance',
        description: 'Visualize event timelines with an intuitive view showing all sessions across days. Easily switch between days to see how your event unfolds.',
        items: [], // Static blocks use description
    },
    {
        id: 'speakers',
        title: 'Discover who\'s presenting',
        description: 'Get to know the experts. Browse speaker profiles with high-quality photos and detailed biographies to learn about their background and expertise.',
        items: [], // Static blocks use description
    },
];

// Interactive Mockup Components

function AgendaMockup() {
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
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>Mar 17–21, 2025</span>
                        </div>
                        <div className={styles.metaItem}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>San Jose, CA</span>
                        </div>
                    </div>
                </div>
                <div className={styles.agendaActions}>
                    <button
                        className={styles.iconButton}
                        onClick={() => setBookmarked(!bookmarked)}
                        style={{ color: bookmarked ? '#FFD700' : undefined }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                    </button>
                    <button
                        className={styles.iconButton}
                        onClick={() => window.open('https://www.nvidia.com/gtc/', '_blank')}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className={styles.filterBar}>
                <div className={styles.sessionCount}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
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
                        <span className={styles.sessionTag} style={{ color: '#46A758' }}>Keynote</span>
                        <span className={styles.sessionTitle}>The Future of AI Computing</span>
                        <div className={styles.sessionDetails}>
                            <div className={styles.detailItem}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span>Hall A</span>
                            </div>
                            <div className={styles.detailItem}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                                <span>3 speakers</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.sessionMeta}>
                        <span className={styles.sessionTimeBadge}>09:00</span>
                        <button
                            className={styles.addButton}
                            onClick={(e) => { e.stopPropagation(); toggleStar(1); }}
                            style={{ color: starredSessions.includes(1) ? '#FFD700' : undefined }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={starredSessions.includes(1) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Item 2 */}
                <div className={styles.sessionRow} onClick={() => toggleStar(2)}>
                    <div className={styles.sessionMain}>
                        <span className={styles.sessionTag} style={{ color: '#3ECF8E' }}>Workshop</span>
                        <span className={styles.sessionTitle}>Building with CUDA 13</span>
                        <div className={styles.sessionDetails}>
                            <div className={styles.detailItem}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span>Room 204</span>
                            </div>
                            <div className={styles.detailItem}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                </svg>
                                <span>1 speaker</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.sessionMeta}>
                        <span className={styles.sessionTimeBadge}>11:30</span>
                        <button
                            className={styles.addButton}
                            onClick={(e) => { e.stopPropagation(); toggleStar(2); }}
                            style={{ color: starredSessions.includes(2) ? '#FFD700' : undefined }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={starredSessions.includes(2) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TimelineMockup() {
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

function SpeakersMockup() {
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
                        style={{ height: '16px', width: 'auto', display: 'block' }}
                    />
                </div>
                <div className={styles.stackContent}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div className={styles.speakerPhoto} style={{ background: '#27AE60', color: '#fff' }}>
                            <span>MJ</span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>Mike Johnson</span>
                    </div>
                    <span className={styles.stackText}>AI Ethics Panel: Navigating the New Frontier</span>
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
                        style={{ height: '20px', width: 'auto', display: 'block', filter: 'invert(1)' }}
                    />
                </div>
                <div className={styles.stackContent}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div className={styles.speakerPhoto} style={{ background: '#8E44AD', color: '#fff' }}>
                            <span>SC</span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>Sarah Chen</span>
                    </div>
                    <span className={styles.stackText}>Building Large Scale Systems with PyTorch</span>
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
                        style={{ height: '18px', width: 'auto', display: 'block' }}
                    />
                </div>
                <div className={styles.stackContent}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div className={styles.speakerPhoto} style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                            <span>JH</span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>Jensen Huang</span>
                    </div>
                    <span className={styles.stackText}>Opening Keynote: The Future of AI Computing</span>
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
