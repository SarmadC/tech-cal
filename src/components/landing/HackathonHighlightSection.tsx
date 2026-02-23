'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Users, ChartLineUp, Code, Lightning, GitMerge, Clock, ArrowRight, Brain, Globe, Leaf, GameController } from '@phosphor-icons/react';
import Link from 'next/link';
import styles from './HackathonHighlightSection.module.css';

// Feature data
const features = [
    {
        id: 'competition',
    },
    {
        id: 'squad',
    },
    {
        id: 'tracks',
    },
];

// --- Profile Data ---
type Profile = {
    id: string;
    initials: string;
    name: string;
    role: string;
    tags: string[];
    filterTags: string[];
    matchPercent: number;
    matchReasons: string[];
    availability: string;
    ctaLabel: string;
    icon: React.ReactNode;
    position: { top?: string; left?: string; right?: string; bottom?: string };
    lineEnd: { x: string; y: string };
};

const PROFILES: Profile[] = [
    {
        id: 'ac',
        initials: 'AC',
        name: 'Alex Chen',
        role: 'Developer',
        tags: ['React', 'Node.js'],
        filterTags: ['Developers', 'Frontend'],
        matchPercent: 95,
        matchReasons: ['Shared: React, TypeScript', 'Complementary: Frontend ↔ Backend', 'Timezone overlap: 6h'],
        availability: 'Available now',
        ctaLabel: 'Invite to Team',
        icon: <Code size={10} className={styles.profileIcon} />,
        position: { top: '4%', left: '2%' },
        lineEnd: { x: '22%', y: '25%' },
    },
    {
        id: 'sk',
        initials: 'SK',
        name: 'Sarah Kim',
        role: 'Designer',
        tags: ['UI/UX', 'Figma'],
        filterTags: ['Designers'],
        matchPercent: 92,
        matchReasons: ['Shared: Design systems', 'Complementary: Visual ↔ Code', 'Past collab: 2 projects'],
        availability: 'Free weekends',
        ctaLabel: 'Invite to Team',
        icon: <Trophy size={10} className={styles.profileIcon} />,
        position: { top: '4%', right: '2%' },
        lineEnd: { x: '78%', y: '25%' },
    },
    {
        id: 'jl',
        initials: 'JL',
        name: 'Jordan Lee',
        role: 'PM',
        tags: ['Strategy', 'Agile'],
        filterTags: ['PMs'],
        matchPercent: 88,
        matchReasons: ['Shared: Agile workflow', 'Complementary: Strategy ↔ Execution', 'Timezone overlap: 4h'],
        availability: 'Available now',
        ctaLabel: 'Message',
        icon: <Lightning size={10} className={styles.profileIcon} />,
        position: { bottom: '4%', left: '2%' },
        lineEnd: { x: '22%', y: '75%' },
    },
    {
        id: 'mp',
        initials: 'MP',
        name: 'Maya Patel',
        role: 'Developer',
        tags: ['AI/ML', 'TensorFlow'],
        filterTags: ['Developers', 'AI/ML', 'Backend'],
        matchPercent: 90,
        matchReasons: ['Shared: Python, ML pipelines', 'Complementary: AI ↔ Frontend', 'Hackathon wins: 3'],
        availability: 'Available next week',
        ctaLabel: 'View Profile',
        icon: <Code size={10} className={styles.profileIcon} />,
        position: { bottom: '4%', right: '2%' },
        lineEnd: { x: '78%', y: '75%' },
    },
];

const FILTER_PILLS = ['All Roles', 'Developers', 'Designers', 'Product Managers', 'AI/ML'];

const ROLE_GLOW: Record<string, string> = {
    Developer: 'rgba(139, 92, 246, 0.25)',
    Designer: 'rgba(236, 72, 153, 0.25)',
    PM: 'rgba(59, 130, 246, 0.25)',
};

// --- CountUp Component ---
function CountUp({ target, isInView, prefersReducedMotion }: { target: number; isInView: boolean; prefersReducedMotion: boolean }) {
    const [value, setValue] = useState(0);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (!isInView || hasAnimated.current || prefersReducedMotion) {
            if (prefersReducedMotion || (isInView && hasAnimated.current)) setValue(target);
            return;
        }
        hasAnimated.current = true;
        const duration = 1200;
        const start = performance.now();
        let rafId: number;

        const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) {
                rafId = requestAnimationFrame(step);
            }
        };
        rafId = requestAnimationFrame(step);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [isInView, target, prefersReducedMotion]);

    return <>{value}%</>;
}

// --- Mockup Components ---

export function CompetitionMockup() {
    return (
        <div className={styles.mockupCard} style={{ overflow: 'visible', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <div className={`relative w-full h-[320px] rounded-xl p-6 flex flex-col justify-between overflow-hidden group hover:scale-[1.01] transition-all duration-300 font-sans ${styles.competitionCard}`}>
                <div className="flex justify-between items-start z-10">
                    <div className="space-y-1">
                        <h4 className={`text-sm font-medium leading-none ${styles.competitionTitle}`}>Nvidia AI Hackathon</h4>
                        <div className={`pt-3 text-4xl font-bold tracking-tight ${styles.competitionPrize}`}>$50,000</div>
                        <div className={`text-sm ${styles.competitionMeta}`}>Total Prize Pool</div>
                    </div>
                    <div className="opacity-80 hover:opacity-100 transition-opacity">
                        <img
                            src="https://mddgtexrnnlctttbcpsy.supabase.co/storage/v1/object/public/logos/nvidia.svg"
                            alt="Nvidia"
                            className="w-8 h-8 object-contain"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-8 z-10 mt-6">
                    <div className="flex flex-col gap-0.5">
                        <div className={`flex items-center gap-1.5 ${styles.competitionStatLabel}`}>
                            <Users size={14} weight="duotone" />
                            <span className="text-[11px] font-medium uppercase tracking-wider">Participants</span>
                        </div>
                        <div className={`text-lg font-bold leading-tight ${styles.competitionStatValue}`}>12,847</div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className={`flex items-center gap-1.5 ${styles.competitionStatLabel}`}>
                            <Users size={14} weight="duotone" />
                            <span className="text-[11px] font-medium uppercase tracking-wider">Teams</span>
                        </div>
                        <div className={`text-lg font-bold leading-tight ${styles.competitionStatValue}`}>1,842</div>
                    </div>
                </div>
                <div className={`mt-auto space-y-3 z-10 pt-4 ${styles.competitionFooter}`}>
                    <div className="flex items-center justify-between text-xs font-medium">
                        <div className={`flex items-center gap-1.5 ${styles.competitionRemaining}`}>
                            <Clock size={12} weight="bold" />
                            <span>23h 14m remaining</span>
                        </div>
                        <span className={`font-mono ${styles.competitionPercent}`}>68%</span>
                    </div>
                    <div className={`h-1 w-full rounded-full overflow-hidden ${styles.competitionTrack}`}>
                        <div className="h-full bg-emerald-500 w-[68%] shadow-[0_0_8px_rgba(16,185,129,0.2)]" />
                    </div>
                </div>
                <div className={`absolute inset-0 pointer-events-none ${styles.competitionSheen}`} />
                <div className={`absolute inset-0 pointer-events-none ${styles.competitionGrid}`} />
            </div>
        </div>
    );
}

const AUTOPLAY_FILTERS = ['All Roles', 'Developers', 'Designers', 'PMs'];
const AUTOPLAY_INTERVAL = 3500;
const IDLE_RESUME_DELAY = 8000;

export function SquadNetworkMockup() {
    const [activeFilter, setActiveFilter] = useState('All Roles');
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [isInView, setIsInView] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);
    const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const filterIndexRef = useRef(0);

    // Reduced motion detection
    useEffect(() => {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mql.matches);
        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    // IntersectionObserver for viewport entry
    useEffect(() => {
        if (!sectionRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsInView(true); },
            { threshold: 0.2 }
        );
        observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    // Mark interaction and schedule idle resume
    const markInteraction = useCallback(() => {
        setUserInteracted(true);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            setUserInteracted(false);
        }, IDLE_RESUME_DELAY);
    }, []);

    // Autoplay loop
    const autoplayPaused = userInteracted || expandedCard !== null;

    useEffect(() => {
        if (!isInView || prefersReducedMotion || autoplayPaused) {
            if (autoplayRef.current) {
                clearInterval(autoplayRef.current);
                autoplayRef.current = null;
            }
            return;
        }

        // Start after 1.5s delay on first view
        const startDelay = setTimeout(() => {
            autoplayRef.current = setInterval(() => {
                filterIndexRef.current = (filterIndexRef.current + 1) % AUTOPLAY_FILTERS.length;
                setActiveFilter(AUTOPLAY_FILTERS[filterIndexRef.current]);
            }, AUTOPLAY_INTERVAL);
        }, autoplayRef.current === null && !userInteracted ? 1500 : 0);

        return () => {
            clearTimeout(startDelay);
            if (autoplayRef.current) {
                clearInterval(autoplayRef.current);
                autoplayRef.current = null;
            }
        };
    }, [isInView, prefersReducedMotion, autoplayPaused, userInteracted]);

    // Cleanup idle timer on unmount
    useEffect(() => {
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, []);

    const isCardVisible = useCallback((profile: Profile) => {
        if (activeFilter === 'All Roles') return true;
        return profile.filterTags.includes(activeFilter);
    }, [activeFilter]);

    const getBestMatchId = useCallback(() => {
        let best: Profile | null = null;
        for (const p of PROFILES) {
            if (!isCardVisible(p)) continue;
            if (!best || p.matchPercent > best.matchPercent) best = p;
        }
        return best?.id ?? null;
    }, [isCardVisible]);

    const handleCardClick = useCallback((id: string) => {
        markInteraction();
        setExpandedCard(prev => prev === id ? null : id);
    }, [markInteraction]);

    const handlePillClick = useCallback((role: string) => {
        markInteraction();
        filterIndexRef.current = AUTOPLAY_FILTERS.indexOf(role);
        if (filterIndexRef.current === -1) filterIndexRef.current = 0;
        setActiveFilter(role);
    }, [markInteraction]);

    const handleCardHover = useCallback((id: string | null) => {
        if (id) markInteraction();
        setHoveredCard(id);
    }, [markInteraction]);

    const getCardStyle = (profile: Profile): React.CSSProperties => {
        const visible = isCardVisible(profile);
        const isHovered = hoveredCard === profile.id;
        const isExpanded = expandedCard === profile.id;
        const isAnyExpanded = expandedCard !== null;

        if (!visible) {
            return { opacity: 0.1, transform: 'scale(0.95)', pointerEvents: 'none', transition: 'all 300ms ease' };
        }
        if (isExpanded) {
            return {
                transform: 'translateY(-6px) scale(1.04)',
                transition: 'all 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
                zIndex: 20,
                opacity: 1,
            };
        }
        if (isHovered) {
            return {
                transform: 'translateY(-4px) scale(1.02)',
                transition: 'all 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
                zIndex: 15,
                opacity: 1,
            };
        }
        // Dim other cards if one is selected/hovered to create focus
        return {
            transition: 'all 300ms ease',
            opacity: isAnyExpanded ? 0.35 : 0.6,
            transform: 'scale(0.98)',
        };
    };

    const getCardBorderStyle = (profile: Profile): React.CSSProperties => {
        const isHovered = hoveredCard === profile.id;
        const isExpanded = expandedCard === profile.id;
        const glow = ROLE_GLOW[profile.role] || 'rgba(139, 92, 246, 0.25)';

        if (isExpanded) {
            return { boxShadow: `var(--hackathon-squad-card-shadow-active), 0 0 16px ${glow}`, borderColor: 'var(--hackathon-squad-card-border-strong)' };
        }
        if (isHovered) {
            return { boxShadow: `var(--hackathon-squad-card-shadow-hover), 0 0 10px ${glow}`, borderColor: 'var(--hackathon-squad-card-border-strong)' };
        }
        return {};
    };

    const getLineProps = (profile: Profile) => {
        const visible = isCardVisible(profile);
        const isExpanded = expandedCard === profile.id;
        const isHovered = hoveredCard === profile.id;
        const isFiltered = activeFilter !== 'All Roles' && visible;

        if (!visible) return { opacity: 0, strokeWidth: 0 };

        // Active state (hovered, expanded, or actively filtered)
        if (isHovered || isExpanded || isFiltered) {
            return { opacity: 0.8, strokeWidth: 2 };
        }

        return { opacity: 0.08, strokeWidth: 1 };
    };

    return (
        <div ref={sectionRef} className={styles.squadLayout}>
            {/* Left Column — Text + Filters */}
            <div className={styles.squadLeft}>
                <h3 className={`text-xl md:text-2xl font-medium leading-relaxed ${styles.squadHeading}`}>
                    Don&apos;t hack alone.
                </h3>
                <p className={`text-sm mt-3 leading-relaxed max-w-sm ${styles.squadBody}`}>
                    Finding the right team is half the battle. Kure Cal matches you by skill, timezone, and past experience so you can start building, not searching.
                </p>
                {/* Filter Pills */}
                <div className="mt-6">
                    <div className={styles.pillScrollTrack} style={{ justifyContent: 'flex-start' }}>
                        {FILTER_PILLS.map((role) => (
                            <button
                                key={role}
                                onClick={() => handlePillClick(role)}
                                className={`${styles.filterPill} ${activeFilter === role ? styles.filterPillActive : ''}`}
                            >
                                {role}
                            </button>
                        ))}
                        <button className={`${styles.filterPill} ${styles.pillMore}`}>+ More</button>
                    </div>
                </div>
            </div>

            {/* Right Column — Network Visual */}
            <div className={styles.squadRight}>
                <div className="relative w-full h-[380px] md:h-[400px] flex items-center justify-center">
                    {/* Connection Lines (SVG) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                        {PROFILES.map((profile, i) => {
                            const lineProps = getLineProps(profile);
                            const isActive = hoveredCard === profile.id || expandedCard === profile.id || (activeFilter !== 'All Roles' && isCardVisible(profile));
                            return (
                                <line
                                    key={profile.id}
                                    x1="50%"
                                    y1="50%"
                                    x2={profile.lineEnd.x}
                                    y2={profile.lineEnd.y}
                                    stroke="currentColor"
                                    className={styles.squadLine}
                                    strokeWidth={lineProps.strokeWidth}
                                    strokeDasharray="4 4"
                                    style={{
                                        opacity: lineProps.opacity,
                                        strokeDashoffset: isInView && !prefersReducedMotion ? 0 : 500,
                                        transition: 'opacity 300ms ease, stroke-width 300ms ease',
                                        animation: isInView && !prefersReducedMotion
                                            ? `${isActive ? 'dashMove 1s linear infinite' : 'none'}`
                                            : 'none',
                                    }}
                                />
                            );
                        })}
                    </svg>

                    {/* Center Node */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 group/center">
                        <div className="relative">
                            {!prefersReducedMotion && isInView && (
                                <>
                                    <div className={styles.centerPulseRing} style={{ animationDelay: '0s' }} />
                                    <div className={styles.centerPulseRing} style={{ animationDelay: '1.5s' }} />
                                </>
                            )}
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full pointer-events-none ${styles.squadCenterRing}`} />
                            <div
                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-300 group-hover/center:scale-105 relative z-10 ${styles.squadCenterNode}`}
                            >
                                <Users size={22} weight="duotone" />
                            </div>
                        </div>
                    </div>

                    {/* Profile Cards */}
                    {PROFILES.map((profile, i) => {
                        const posStyle: React.CSSProperties = {
                            position: 'absolute',
                            zIndex: 10,
                            width: '13rem',
                            ...profile.position,
                        };

                        const isExpanded = expandedCard === profile.id;
                        const isActive = hoveredCard === profile.id || isExpanded;

                        return (
                            <div
                                key={profile.id}
                                style={{
                                    ...posStyle,
                                    ...getCardStyle(profile),
                                    ...(isInView && !prefersReducedMotion ? {
                                        animation: `fadeIn 0.7s ease-out ${(i + 1) * 0.1}s both`,
                                    } : {}),
                                }}
                                onMouseEnter={() => handleCardHover(profile.id)}
                                onMouseLeave={() => handleCardHover(null)}
                                onClick={() => handleCardClick(profile.id)}
                                tabIndex={0}
                                role="button"
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(profile.id); } }}
                            >
                                <div
                                    className={`rounded-lg p-3.5 cursor-pointer ${styles.profileCard}`}
                                    style={{
                                        ...getCardBorderStyle(profile),
                                        transition: 'box-shadow 300ms ease, border-color 300ms ease',
                                    }}
                                >
                                    <div className="flex flex-col items-start text-left space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium ${styles.profileAvatar}`}>
                                                    {profile.initials}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${styles.profileIconBadge}`}>
                                                    {profile.icon}
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className={`font-medium text-[13px] leading-tight ${styles.profileName}`}>{profile.name}</div>
                                                <div className={`text-[11px] ${styles.profileRole}`}>{profile.role}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 justify-start">
                                            {profile.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className={`px-1.5 py-px rounded text-[10px] font-mono ${styles.profileTag}`}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>

                                    </div>

                                    {/* Expanded Drawer */}
                                    <div
                                        className={`${styles.expandedDrawer} ${isExpanded ? styles.expandedDrawerOpen : ''}`}
                                        style={prefersReducedMotion ? { display: isExpanded ? 'block' : 'none', maxHeight: isExpanded ? '200px' : '0', opacity: isExpanded ? 1 : 0 } : undefined}
                                    >
                                        <div className={`mt-2.5 pt-2.5 ${styles.profileDrawer}`}>
                                            <div className={`text-[9px] uppercase tracking-wider font-medium mb-1.5 ${styles.profileDrawerLabel}`}>Why you match</div>
                                            <div className="space-y-1 mb-2.5">
                                                {profile.matchReasons.map((reason, ri) => (
                                                    <div key={ri} className={`flex items-start gap-1.5 text-[10px] leading-tight ${styles.profileReason}`}>
                                                        <span className={`w-0.5 h-0.5 rounded-full mt-1.5 shrink-0 ${styles.profileReasonDot}`} />
                                                        <span>{reason}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                className={`w-full px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors flex items-center justify-center gap-1 ${styles.profileCta}`}
                                                onClick={(e) => { e.stopPropagation(); }}
                                            >
                                                {profile.ctaLabel}
                                                <ArrowRight size={9} weight="bold" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export function TracksMockup() {
    const tracks = [
        { icon: <Brain size={20} weight="duotone" className="text-violet-400" />, title: 'Generative AI', prize: '$15k', color: 'violet' },
        { icon: <Globe size={20} weight="duotone" className="text-blue-400" />, title: 'Web3 & DeFi', prize: '$10k', color: 'blue' },
        { icon: <Leaf size={20} weight="duotone" className="text-emerald-400" />, title: 'Sustainability', prize: '$5k', color: 'emerald' },
        { icon: <GameController size={20} weight="duotone" className="text-orange-400" />, title: 'Mobile & Gaming', prize: '$8k', color: 'orange' },
    ];

    return (
        <div className={styles.mockupCard} style={{ background: 'transparent', border: 'none', boxShadow: 'none', height: '100%', minHeight: '320px', display: 'flex', flexDirection: 'column', padding: '12px 0' }}>
            <h4 className={`text-xs font-medium tracking-wider mb-2 px-2 ${styles.tracksHeader}`}>Track Prizes</h4>
            <div className="flex-1">
                {tracks.map((track, i) => (
                    <div key={i} className={`group flex items-center justify-between py-4 px-2 transition-colors cursor-pointer ${styles.trackRow}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-md bg-${track.color}-500/10 flex items-center justify-center border border-${track.color}-500/20`}>
                                {track.icon}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-sm font-medium transition-colors ${styles.trackTitle}`}>{track.title}</span>
                            </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${styles.trackPrize}`}>
                            {track.prize}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


// --- Layout Components ---

const StaticFeatureBlock = ({ feature, fullWidth }: { feature: any, fullWidth?: boolean }) => {
    return (
        <div className={`${styles.featureCard} ${styles.staticBlock} ${fullWidth ? styles.spanFull : ''}`}>
            {(feature.title || feature.description) && (
                <div className={styles.staticContent}>
                    {feature.title && <h3 className={styles.featureTitle}>{feature.title}</h3>}
                    {feature.description && (
                        <p className={styles.featureDescription}>
                            {feature.description}
                        </p>
                    )}
                </div>
            )}
            <div className={styles.staticMockup} style={feature.id === 'squad' ? { padding: 0 } : {}}>
                {feature.id === 'competition' && <CompetitionMockup />}
                {feature.id === 'tracks' && <TracksMockup />}
                {feature.id === 'squad' && <SquadNetworkMockup />}
            </div>
        </div>
    );
};

export default function HackathonHighlightSection() {
    const competitionFeat = features.find(f => f.id === 'competition');
    const squadFeat = features.find(f => f.id === 'squad');
    const tracksFeat = features.find(f => f.id === 'tracks');

    return (
        <section className={styles.section} id="hackathons">
            <div className={styles.container}>
                {/* 2-Column Header Layout */}
                <div className={styles.headerGrid}>
                    <div className={styles.headerMainContent}>
                        <span className={styles.label}>Hackathons</span>
                        <h2 className={styles.title} style={{ fontSize: '36px', marginBottom: '16px' }}>Hackathons with real prizes and real teams</h2>
                        <p className={styles.description}>
                            Browse high-stakes hackathons, find teammates with matching skills, and compete across dedicated tracks, all from one place.
                        </p>
                    </div>
                </div>

                <div className={styles.bentoGrid}>
                    {competitionFeat && <StaticFeatureBlock feature={competitionFeat} />}
                    {tracksFeat && <StaticFeatureBlock feature={tracksFeat} />}
                    {squadFeat && <StaticFeatureBlock feature={squadFeat} fullWidth={true} />}
                </div>
            </div>
        </section>
    );
}
