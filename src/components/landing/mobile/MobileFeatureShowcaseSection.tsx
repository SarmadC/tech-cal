'use client';

import React from 'react';
import { SpeakersMockup, TimelineMockup } from '../FeatureShowcaseSection';
import styles from './MobileFeatureShowcaseSection.module.css';

const MobileFeatureShowcaseSection: React.FC = () => {
    const [agendaView, setAgendaView] = React.useState<'timeline' | 'tracks'>('timeline');
    const [trackFilter, setTrackFilter] = React.useState<'AI' | 'Product' | 'Infrastructure'>('AI');

    const agendaSessions = [
        { id: 's1', time: '09:00', title: 'The Future of AI Computing', type: 'Keynote', room: 'Hall A', speakers: 'Jensen Huang +2', track: 'AI', starred: false },
        { id: 's2', time: '10:30', title: 'Scaling ML Infrastructure', type: 'Workshop', room: 'Room 102', speakers: 'Maya Chen', track: 'AI', starred: true },
        { id: 's3', time: '11:30', title: 'Building with CUDA 13', type: 'Workshop', room: 'Room 204', speakers: 'Sarah Chen', track: 'Product', starred: false },
        { id: 's4', time: '14:00', title: 'Product Roadmap 2025', type: 'Panel', room: 'Main Stage', speakers: 'Lisa Park +3', track: 'Product', starred: false },
        { id: 's5', time: '13:00', title: 'AI Safety & Policy', type: 'Panel', room: 'Main Stage', speakers: 'Mike Johnson +4', track: 'Infrastructure', starred: true },
        { id: 's6', time: '15:30', title: 'Networking Break', type: 'Networking', room: 'Lobby', speakers: '', track: 'Infrastructure', starred: false },
    ];

    const featureCards = [
        {
            id: 'timeline',
            badge: 'Timeline',
            title: 'See your day at a glance',
            preview: (
                <div className={styles.timelinePanel}>
                    <div className={styles.timelineHeader}>
                        <div className={styles.headerLeft}>
                            <span className={styles.timelineTitle}>Today at GTC</span>
                        </div>
                        <span className={styles.timelineMeta}>4 tracks</span>
                    </div>
                    <div className={styles.timelineRows}>
                        <div className={styles.timelineRow}>
                            <span className={styles.timelineTime}>09:00</span>
                            <div className={styles.timelineContent}>
                                <span className={styles.timelineChip}>Keynote</span>
                                <span className={styles.timelineEventTitle}>Opening Keynote</span>
                            </div>
                        </div>
                        <div className={styles.timelineRow}>
                            <span className={styles.timelineTime}>11:00</span>
                            <div className={styles.timelineContent}>
                                <span className={styles.timelineChip}>AI/ML</span>
                                <span className={styles.timelineEventTitle}>LLM Training</span>
                            </div>
                        </div>
                        <div className={styles.timelineRow}>
                            <span className={styles.timelineTime}>13:00</span>
                            <div className={styles.timelineContent}>
                                <span className={styles.timelineChip}>Panel</span>
                                <span className={styles.timelineEventTitle}>Future of AI</span>
                            </div>
                        </div>
                        {/* Ghost row to show continuity */}
                        <div className={styles.timelineRow} style={{ opacity: 0.4 }}>
                            <span className={styles.timelineTime}>14:00</span>
                            <div className={styles.timelineContent}>
                                <span className={styles.timelineChip}>Networking</span>
                                <span className={styles.timelineEventTitle}>Coffee Break</span>
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'speakers',
            badge: 'Speakers',
            title: 'Meet the people you want to hear',
            preview: (
                <div className={styles.webMockup}>
                    <SpeakersMockup />
                </div>
            ),
        },
        {
            id: 'agenda',
            badge: 'Agenda',
            title: 'Filter by track, find your focus',
            preview: (
                <div className={styles.agendaPanel}>
                    {/* Sticky Utility Bar */}
                    <div className={styles.agendaUtilityBar}>
                        <div className={styles.agendaUtilityRow}>
                            <div className={styles.segmentedControl} role="tablist" aria-label="Agenda view">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={agendaView === 'timeline'}
                                    className={`${styles.segmentBtn} ${agendaView === 'timeline' ? styles.segmentBtnActive : ''}`}
                                    onClick={() => setAgendaView('timeline')}
                                >
                                    Timeline
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={agendaView === 'tracks'}
                                    className={`${styles.segmentBtn} ${agendaView === 'tracks' ? styles.segmentBtnActive : ''}`}
                                    onClick={() => setAgendaView('tracks')}
                                >
                                    Tracks
                                </button>
                            </div>
                            {agendaView === 'tracks' && (
                                <button
                                    type="button"
                                    className={styles.trackSelect}
                                    onClick={() => {
                                        const tracks = ['AI', 'Product', 'Infrastructure'] as const;
                                        const currentIndex = tracks.indexOf(trackFilter);
                                        const nextTrack = tracks[(currentIndex + 1) % tracks.length];
                                        setTrackFilter(nextTrack);
                                    }}
                                >
                                    <span className={`${styles.trackDot} ${styles[`trackDot${trackFilter}`]}`} />
                                    <span className={styles.trackSelectValue}>{trackFilter}</span>
                                    <svg
                                        className={styles.trackSelectChevron}
                                        width="10"
                                        height="10"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>
                            )}
                            {agendaView === 'timeline' && (
                                <span className={styles.agendaUtilityMeta}>3 tracks</span>
                            )}
                        </div>
                    </div>

                    {/* Scrolable Session List */}
                    <div
                        className={`${styles.agendaList} ${agendaView === 'timeline' ? styles.agendaListTimeline : styles.agendaListTracks
                            }`}
                        role="tabpanel"
                    >
                        {agendaView === 'timeline' ? (
                            <>
                                {agendaSessions.map((session) => (
                                    <div key={session.id} className={styles.agendaRow} role="button" tabIndex={0}>
                                        <div className={styles.agendaTimeColumn}>
                                            <span className={styles.agendaTime}>{session.time}</span>
                                        </div>
                                        <div className={styles.agendaContent}>
                                            <span className={styles.agendaTitle}>{session.title}</span>
                                            <div className={styles.agendaMetaRow}>
                                                <span className={styles.agendaRoom}>{session.room}</span>
                                                <span className={styles.metaSeparator}>·</span>
                                                <span className={styles.agendaSpeakers}>{session.speakers}</span>
                                            </div>
                                        </div>
                                        <div className={styles.agendaAside}>
                                            <button
                                                className={`${styles.starBtn} ${session.starred ? styles.starActive : ''}`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill={session.starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                {agendaSessions
                                    .filter((session) => session.track === trackFilter)
                                    .map((session) => (
                                        <div key={session.id} className={styles.agendaRow} role="button" tabIndex={0}>
                                            <div className={styles.agendaTimeColumn}>
                                                <span className={styles.agendaTime}>{session.time}</span>
                                            </div>
                                            <div className={styles.agendaContent}>
                                                <div className={styles.titleRow}>
                                                    <span className={`${styles.trackDot} ${styles[`trackDot${session.track}`]}`} />
                                                    <span className={styles.agendaTitle}>{session.title}</span>
                                                </div>
                                                <div className={styles.agendaMetaRow}>
                                                    <span className={styles.sessionType}>{session.type}</span>
                                                    <span className={styles.metaSeparator}>·</span>
                                                    <span className={styles.agendaRoom}>{session.room}</span>
                                                    {session.speakers && (
                                                        <>
                                                            <span className={styles.metaSeparator}>·</span>
                                                            <span className={styles.agendaSpeakers}>{session.speakers}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.agendaAside}>
                                                <button
                                                    className={`${styles.starBtn} ${session.starred ? styles.starActive : ''}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill={session.starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </>
                        )}
                    </div>
                </div>
            ),
        },
    ];

    return (
        <section className={styles.section} id="feature-showcase">
            <div className={styles.container}>
                <div className={styles.cardList}>
                    {featureCards.map(card => (
                        <article key={card.id} className={styles.card}>
                            {card.title && (
                                <div>
                                    <h3 className={styles.cardTitle}>{card.title}</h3>
                                </div>
                            )}
                            {card.preview}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MobileFeatureShowcaseSection;
