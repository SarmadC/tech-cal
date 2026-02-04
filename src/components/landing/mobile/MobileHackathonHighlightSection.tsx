'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Trophy, Code, ArrowRight, PenNib, ClipboardText, Brain, Globe, Leaf, GameController, ChartLineUp } from '@phosphor-icons/react';
import styles from './MobileHackathonHighlightSection.module.css';

// --- Avatar Data ---
const SQUAD_MEMBERS = [
    {
        id: 1,
        initials: 'AC',
        name: 'Alex Chen',
        role: 'Developer',
        roleType: 'code',
        tags: ['React', 'Node'],
        status: 'Online',
    },
    {
        id: 2,
        initials: 'SK',
        name: 'Sarah Kim',
        role: 'Designer',
        roleType: 'design',
        tags: ['Figma', 'UI/UX'],
        status: 'In a team',
    },
    {
        id: 3,
        initials: 'JL',
        name: 'Jordan Lee',
        role: 'Product',
        roleType: 'pm',
        tags: ['Strategy'],
        status: 'Online',
    },
];

export default function MobileHackathonHighlightSection() {
    const [activeRole, setActiveRole] = useState('All');
    const [activeMemberId, setActiveMemberId] = useState<number | null>(null);
    const roles = ['All', 'Dev', 'Design', 'PM'];
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const tracks = [
        { icon: <Brain size={16} weight="duotone" />, title: 'Generative AI', prize: '$15k', color: 'violet' },
        { icon: <Globe size={16} weight="duotone" />, title: 'Web3 & DeFi', prize: '$10k', color: 'blue' },
        { icon: <Leaf size={16} weight="duotone" />, title: 'Sustainability', prize: '$5k', color: 'emerald' },
        { icon: <GameController size={16} weight="duotone" />, title: 'Mobile & Gaming', prize: '$8k', color: 'orange' },
    ];

    useEffect(() => {
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    const handleMemberClick = (id: number) => {
        setActiveMemberId(id);
    };

    return (
        <section className={styles.section} id="hackathons">
            <div className={styles.container}>
                <div className={styles.header}>
                    <span className={styles.label}>Hackathons</span>
                    <h2 className={styles.title}>Build the future. Win big.</h2>
                    <p className={styles.description}>
                        Join a global community of builders. Compete, collaborate, and ship real products.
                    </p>
                </div>
                <div className={styles.contextBlock}>
                    <h3 className={styles.contextTitle}>Specialized Tracks</h3>
                    <p className={styles.contextDescription}>
                        Compete in focused categories with dedicated prize pools.
                    </p>
                </div>

                <div className={styles.stack}>
                    {/* Card 1: Main Feature - Redesigned */}
                    <div className={`${styles.card} ${styles.competitionCard}`}>
                        {/* Header: Organizer & Status */}
                        <div className={styles.cardHeader}>
                            <div className={styles.organizerRow}>
                                <span className={styles.organizerName}>Nvidia AI Hackathon</span>
                            </div>
                            <img
                                src="https://mddgtexrnnlctttbcpsy.supabase.co/storage/v1/object/public/logos/nvidia.svg"
                                alt="Nvidia"
                                className={styles.organizerLogo}
                            />

                        </div>

                        {/* Main Body: Value & Context */}
                        <div className={styles.cardBody}>
                            <div className={styles.heroBlock}>
                                <div className={styles.heroPrice}>$50,000</div>
                                <div className={styles.priceLabel}>Total prize pool</div>
                            </div>
                            <div className={styles.contextLine}>5 prizes • Judged • Global</div>

                            <div className={styles.metaRow}>
                                <span className={styles.metaTag}>AI</span>
                                <span className={styles.metaTag}>Web3</span>
                                <span className={styles.metaTag}>Online</span>
                            </div>
                        </div>

                        {/* Footer: Progress & CTA */}
                        <div className={styles.cardFooter}>
                            <div className={styles.progressBlock}>
                                <div className={styles.progressHeader}>
                                    <span className={styles.progressLabel}>Submission window</span>
                                    <span className={styles.progressTime}>Ends Feb 3</span>
                                </div>
                                <div className={styles.progressBarTrack}>
                                    <div className={styles.progressBarFill} style={{ width: '85%' }}></div>
                                </div>
                            </div>
                            <Link href="/hackathons" className={styles.ctaButtonPrimary}>
                                <span>Join</span>
                            </Link>
                        </div>
                    </div>

                    {/* Card 2: Tracks */}
                    <div className={`${styles.card} ${styles.tracksCard}`}>
                        <div className={styles.cardContent}>

                            <h3 className={styles.cardTitle}>Track Prizes</h3>
                            <p className={styles.cardDescription}>
                                Pick a track and compete for focused prize pools.
                            </p>
                        </div>
                        <div className={styles.tracksList}>
                            {tracks.map((track) => (
                                <div key={track.title} className={styles.trackRow}>
                                    <div className={styles.trackLeft}>
                                        <div className={styles.trackBadge} data-color={track.color}>
                                            <span className={styles.trackIcon} data-color={track.color}>
                                                {track.icon}
                                            </span>
                                        </div>
                                        <div className={styles.trackInfo}>
                                            <span className={styles.trackTitle}>{track.title}</span>
                                        </div>
                                    </div>
                                    <div className={styles.trackRight}>
                                        <span className={styles.trackPrize}>{track.prize}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Card 3: Find Your Squad */}
                    <div className={`${styles.card} ${styles.squadCard}`}>
                        <div className={styles.cardContent}>

                            <h3 className={styles.cardTitle}>Find Your Squad</h3>
                            <p className={styles.cardDescription}>
                                Match with complementary skills and ship together.
                            </p>

                            {/* Segmented Control */}
                            <div className={styles.segmentedControl}>
                                {roles.map((role) => (
                                    <button
                                        key={role}
                                        className={`${styles.segmentBtn} ${activeRole === role ? styles.segmentBtnActive : ''}`}
                                        onClick={() => setActiveRole(role)}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* People List */}
                        <div className={styles.squadList}>
                            {SQUAD_MEMBERS.filter(member => {
                                if (activeRole === 'All') return true;
                                if (activeRole === 'Dev') return member.role === 'Developer';
                                if (activeRole === 'Design') return member.role === 'Designer';
                                if (activeRole === 'PM') return member.role === 'Product';
                                return true;
                            }).map((member) => {
                                const isSelected = activeMemberId === member.id;
                                return (
                                    <div
                                        key={member.id}
                                        className={`${styles.memberRow} ${isSelected ? styles.memberRowSelected : ''}`}
                                        onClick={() => handleMemberClick(member.id)}
                                        tabIndex={0}
                                        role="button"
                                    >
                                        <div className={styles.memberLeft}>
                                            <div className={styles.memberAvatar} data-role={member.roleType}>
                                                {member.initials}
                                            </div>
                                            <div className={styles.memberInfo}>
                                                <div className={styles.memberNameRow}>
                                                    <span className={styles.memberName}>{member.name}</span>
                                                </div>
                                                <div className={styles.memberMetaRow}>
                                                    <span className={styles.memberRole}>{member.role}</span>
                                                    {member.tags.length > 0 && (
                                                        <>
                                                            <span className={styles.metaDivider}>·</span>
                                                            <div className={styles.memberTags}>
                                                                {member.tags.slice(0, 2).map((tag, i) => (
                                                                    <React.Fragment key={tag}>
                                                                        <span className={styles.memberTag}>{tag}</span>
                                                                        {i < Math.min(member.tags.length, 2) - 1 && <span className={styles.tagSeparator}>·</span>}
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.memberAction}>
                                            <button
                                                className={styles.inviteButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Handle invite logic here
                                                }}
                                            >
                                                Invite
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
