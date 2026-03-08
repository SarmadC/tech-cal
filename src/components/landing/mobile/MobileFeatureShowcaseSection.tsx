'use client';

import React from 'react';
import { SpeakersMockup } from '../FeatureShowcaseSection';
import styles from './MobileFeatureShowcaseSection.module.css';

type AgendaView = 'timeline' | 'tracks';
type AgendaTrack = 'AI' | 'Product' | 'Infrastructure';
type AgendaType = 'Keynote' | 'Workshop' | 'Panel' | 'Networking';

const AGENDA_SESSIONS: Array<{
    id: string;
    time: string;
    title: string;
    type: AgendaType;
    room: string;
    speakers: string;
    track: AgendaTrack;
    starred: boolean;
}> = [
        { id: 's1', time: '09:00', title: 'The Future of AI Computing', type: 'Keynote', room: 'Hall A', speakers: 'Jensen Huang +2', track: 'AI', starred: false },
        { id: 's2', time: '10:30', title: 'Scaling ML Infrastructure', type: 'Workshop', room: 'Room 102', speakers: 'Maya Chen', track: 'AI', starred: true },
        { id: 's3', time: '11:30', title: 'Building with CUDA 13', type: 'Workshop', room: 'Room 204', speakers: 'Sarah Chen', track: 'Product', starred: false },
        { id: 's5', time: '13:00', title: 'AI Safety & Policy', type: 'Panel', room: 'Main Stage', speakers: 'Mike Johnson +4', track: 'Infrastructure', starred: true },
        { id: 's4', time: '14:00', title: 'Product Roadmap 2025', type: 'Panel', room: 'Main Stage', speakers: 'Lisa Park +3', track: 'Product', starred: false },
        { id: 's6', time: '15:30', title: 'Networking Break', type: 'Networking', room: 'Lobby', speakers: '', track: 'Infrastructure', starred: false },
    ];

const TRACK_FILTERS: Array<{ value: AgendaTrack; label: string }> = [
    { value: 'AI', label: 'AI' },
    { value: 'Product', label: 'Product' },
    { value: 'Infrastructure', label: 'Infra' },
];

function parseTimeToMinutes(time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes;
}

const MobileFeatureShowcaseSection: React.FC = () => {
    const [agendaView, setAgendaView] = React.useState<AgendaView>('tracks');
    const [agendaFilter, setAgendaFilter] = React.useState<AgendaTrack>('AI');
    const [starredIds, setStarredIds] = React.useState(
        () => new Set(AGENDA_SESSIONS.filter((session) => session.starred).map((session) => session.id)),
    );

    const sortedAgendaSessions = [...AGENDA_SESSIONS].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
    const filteredTrackSessions = sortedAgendaSessions.filter((session) => session.track === agendaFilter);

    const toggleStar = (sessionId: string) => {
        setStarredIds((current) => {
            const next = new Set(current);
            if (next.has(sessionId)) {
                next.delete(sessionId);
            } else {
                next.add(sessionId);
            }
            return next;
        });
    };

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
                        <div className={`${styles.timelineRow} ${styles.timelineRowPast}`}>
                            <span className={styles.timelineTime}>09:00</span>
                            <span className={`${styles.timelineNode} ${styles.timelineNodeMuted}`} aria-hidden="true" />
                            <div className={styles.timelineContent}>
                                <span className={styles.timelineEventTitle}>Opening Keynote</span>
                                <div className={styles.timelineMetaRow}>
                                    <span className={styles.timelineChip}>Keynote</span>
                                    <span className={styles.timelineMetaText}>Hall A</span>
                                </div>
                            </div>
                        </div>
                        <div className={`${styles.timelineRow} ${styles.timelineRowCurrent}`}>
                            <span className={styles.timelineTime}>11:00</span>
                            <span className={`${styles.timelineNode} ${styles.timelineNodeActive}`} aria-hidden="true" />
                            <div className={styles.timelineContent}>
                                <span className={styles.timelineEventTitle}>LLM Training</span>
                                <div className={styles.timelineMetaRow}>
                                    <span className={styles.timelineChip}>AI/ML</span>
                                    <span className={styles.timelineMetaText}>Room 102</span>
                                </div>
                            </div>
                        </div>
                        <div className={`${styles.timelineRow} ${styles.timelineRowUpcoming}`}>
                            <span className={styles.timelineTime}>13:00</span>
                            <span className={`${styles.timelineNode} ${styles.timelineNodeRing}`} aria-hidden="true" />
                            <div className={styles.timelineContent}>
                                <span className={styles.timelineEventTitle}>Future of AI</span>
                                <div className={styles.timelineMetaRow}>
                                    <span className={styles.timelineChip}>Panel</span>
                                    <span className={styles.timelineMetaText}>Main Stage</span>
                                </div>
                            </div>
                        </div>
                        <div className={`${styles.timelineRow} ${styles.timelineRowMuted}`}>
                            <span className={styles.timelineTime}>14:00</span>
                            <span className={`${styles.timelineNode} ${styles.timelineNodeMuted}`} aria-hidden="true" />
                            <div className={styles.timelineContent}>
                                <span className={styles.timelineEventTitle}>Coffee Break</span>
                                <div className={styles.timelineMetaRow}>
                                    <span className={styles.timelineChip}>Networking</span>
                                    <span className={styles.timelineMetaText}>Lounge</span>
                                </div>
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
                <div className={`${styles.webMockup} ${styles.webMockupDecorative}`}>
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
                                <div className={styles.trackChipRow} role="tablist" aria-label="Track filters">
                                    {TRACK_FILTERS.map((filter) => (
                                        <button
                                            key={filter.value}
                                            type="button"
                                            role="tab"
                                            aria-selected={agendaFilter === filter.value}
                                            className={`${styles.trackChipBtn} ${agendaFilter === filter.value ? styles.trackChipBtnActive : ''}`}
                                            onClick={() => setAgendaFilter(filter.value)}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        className={`${styles.agendaList} ${agendaView === 'timeline' ? styles.agendaListTimeline : styles.agendaListTracks}`}
                        role="tabpanel"
                    >
                        {agendaView === 'timeline' ? (
                            <>
                                {sortedAgendaSessions.map((session) => (
                                    <div key={session.id} className={`${styles.agendaRow} ${styles.agendaRowTimeline}`} role="button" tabIndex={0}>
                                        <div className={styles.agendaTimeColumn}>
                                            <span className={styles.agendaTime}>{session.time}</span>
                                        </div>
                                        <div className={styles.agendaRail} aria-hidden="true">
                                            <span className={styles.agendaRailDot} />
                                        </div>
                                        <div className={styles.agendaContent}>
                                            <div className={styles.titleRow}>
                                                <span className={styles.agendaTitle}>{session.title}</span>
                                            </div>
                                            <div className={styles.agendaMetaRow}>
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
                                                type="button"
                                                aria-pressed={starredIds.has(session.id)}
                                                aria-label={`${starredIds.has(session.id) ? 'Remove' : 'Save'} ${session.title}`}
                                                className={`${styles.starBtn} ${starredIds.has(session.id) ? styles.starActive : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleStar(session.id);
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill={starredIds.has(session.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className={styles.agendaTrackList}>
                                {filteredTrackSessions.map((session) => (
                                    <div key={session.id} className={`${styles.agendaRow} ${styles.agendaTrackRow}`} role="button" tabIndex={0}>
                                        <div className={styles.agendaTrackMain}>
                                            <div className={styles.titleRow}>
                                                <span className={styles.agendaTitle}>{session.title}</span>
                                            </div>
                                            <div className={styles.agendaMetaRow}>
                                                <span className={styles.agendaTimeInline}>{session.time}</span>
                                                <span className={styles.metaSeparator}>·</span>
                                                <span className={styles.agendaTypeInline}>{session.type}</span>
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
                                                type="button"
                                                aria-pressed={starredIds.has(session.id)}
                                                aria-label={`${starredIds.has(session.id) ? 'Remove' : 'Save'} ${session.title}`}
                                                className={`${styles.starBtn} ${starredIds.has(session.id) ? styles.starActive : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleStar(session.id);
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill={starredIds.has(session.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                    {featureCards.map((card) => (
                        <article key={card.id} className={styles.card}>
                            {card.title && (
                                <div className={styles.cardHeader}>
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
