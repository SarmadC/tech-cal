'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import {
    Filter,
    SatelliteDish,
    Link as LinkIcon,
    BarChart3,
    Users,
    ArrowRight,
} from 'lucide-react';

// --- Type Definitions ---
interface PositionState {
    x: number;
    y: number;
    scale: number;
    rot: number;
}
interface AnimationPosition {
    chaos: PositionState;
    organized: PositionState;
}

// --- Data Constants ---
const heroStats = [
    { number: '500+', label: 'Event Sources' },
    { number: '50K+', label: 'Developers' },
    { number: '10h', label: 'Saved/Week' },
];

const features = [
    {
        icon: <Filter />,
        title: 'Smart Filtering',
        description: "AI learns your interests and filters out noise. See ML breakthroughs, skip crypto hype. Your feed, your rules.",
    },
    {
        icon: <SatelliteDish />,
        title: 'Real-time Updates',
        description: "Schedule changes, surprise announcements, livestream links. We monitor 500+ sources so you don't have to.",
    },
    {
        icon: <LinkIcon />,
        title: 'Calendar Integration',
        description: "Syncs with Google Calendar, Outlook, and Apple Calendar. One-click to add events with all the details you need.",
    },
    {
        icon: <BarChart3 />,
        title: 'Event Analytics',
        description: "Track which events matter most to your industry. See trending topics and attendance insights.",
    },
    {
        icon: <Users />,
        title: 'Team Collaboration',
        description: "Share calendars with your team. Coordinate attendance and never double-book important events.",
    },
];

const eventsData = [
    { title: "Google I/O 2025", company: "Google", date: "May 14", type: "Conference" },
    { title: "WWDC 2025", company: "Apple", date: "Jun 10", type: "Developer Conference" },
    { title: "Microsoft Build", company: "Microsoft", date: "May 21", type: "Developer Conference" },
    { title: "OpenAI DevDay", company: "OpenAI", date: "Mar 15", type: "AI Conference" },
    { title: "React Conf", company: "Meta", date: "Apr 22", type: "Framework Conference" },
    { title: "Next.js Conf", company: "Vercel", date: "Oct 25", type: "Framework Conference" },
    { title: "Chrome Dev Summit", company: "Google", date: "Nov 12", type: "Web Development" },
    { title: "TensorFlow Dev Summit", company: "Google", date: "Aug 30", type: "ML Conference" },
    { title: "AWS re:Invent", company: "Amazon", date: "Nov 27", type: "Cloud Conference" },
    { title: "DockerCon", company: "Docker", date: "Sep 18", type: "DevOps Conference" },
    { title: "KubeCon", company: "CNCF", date: "Oct 12", type: "Cloud Native" },
    { title: "GitHub Universe", company: "GitHub", date: "Nov 08", type: "Developer Conference" }
];

// --- Animated Event Card Sub-Component ---
const AnimatedEventCard = ({
    eventData,
    positions,
    scrollYProgress
}: {
    eventData: typeof eventsData[0],
    positions: AnimationPosition,
    scrollYProgress: MotionValue<number>
}) => {
    const x = useTransform(scrollYProgress, [0, 1], [positions.chaos.x, positions.organized.x]);
    const y = useTransform(scrollYProgress, [0, 1], [positions.chaos.y, positions.organized.y]);
    const scale = useTransform(scrollYProgress, [0, 1], [positions.chaos.scale, positions.organized.scale]);
    const rotate = useTransform(scrollYProgress, [0, 1], [positions.chaos.rot, positions.organized.rot]);

    return (
        <motion.div
            className="floating-event"
            style={{ x, y, scale, rotate }}
        >
            <div className="event-header">
                <div className="event-company-tag">{eventData.company}</div>
                <div className="event-date-badge">{eventData.date}</div>
            </div>
            <div className="floating-event-title">{eventData.title}</div>
            <div className="floating-event-type">{eventData.type}</div>
        </motion.div>
    );
};

// --- Main Landing Page Component ---
export default function LandingPage() {
    const chaosSectionRef = useRef<HTMLElement>(null);
    const [animationPositions, setAnimationPositions] = useState<AnimationPosition[]>([]);

    const { scrollYProgress } = useScroll({
        target: chaosSectionRef,
        offset: ["start start", "end end"]
    });

    // Effect for setting up Intersection Observers for simple animations
    useEffect(() => {
        const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        const elements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
        elements.forEach(el => observer.observe(el));

        return () => elements.forEach(el => observer.unobserve(el));
    }, []);

    // Effect for setting up positions for the complex scroll animation
    // NEW, CORRECTED useEffect
    useEffect(() => {
        const setupPositions = () => {
            // We no longer need sectionRect for height calculations.
            if (!chaosSectionRef.current) return;
            const sectionWidth = chaosSectionRef.current.getBoundingClientRect().width;

            const isMobile = window.innerWidth <= 768;
            const cardWidth = 220;
            const cardHeight = 135;
            const padding = 20;
            const cols = isMobile ? 2 : 4;
            const eventsToAnimate = isMobile ? eventsData.slice(0, 8) : eventsData;

            const gridWidth = cols * cardWidth + (cols - 1) * padding;
            const gridHeight = Math.ceil(eventsToAnimate.length / cols) * (cardHeight + padding);

            // Use sectionWidth for horizontal centering, but window.innerHeight for vertical centering.
            const gridStartX = (sectionWidth - gridWidth) / 2;
            const gridStartY = (window.innerHeight - gridHeight) * 0.5; // CORRECTED

            const positions = eventsToAnimate.map((_, index) => {
                const chaosState = {
                    x: Math.random() * (sectionWidth - cardWidth),
                    // The starting Y position is now calculated based on the viewport height,
                    // placing it just below the visible area.
                    y: window.innerHeight + Math.random() * 200, // CORRECTED
                    scale: 0.5 + Math.random() * 0.5,
                    rot: (Math.random() - 0.5) * 90
                };
                const col = index % cols;
                const row = Math.floor(index / cols);
                const organizedState = {
                    x: gridStartX + col * (cardWidth + padding),
                    y: gridStartY + row * (cardHeight + padding),
                    scale: 1,
                    rot: 0
                };
                return { chaos: chaosState, organized: organizedState };
            });
            setAnimationPositions(positions);
        };

        setupPositions();
        window.addEventListener('resize', setupPositions);
        return () => window.removeEventListener('resize', setupPositions);
    }, []);


    const chaosHeaderOpacity = useTransform(scrollYProgress, [0.1, 0.4], [1, 0]);
    const solutionHeaderOpacity = useTransform(scrollYProgress, [0.6, 0.9], [0, 1]);

    return (
        <div className="landing-container">
            {/* Navigation */}
            <nav className="nav">
                <div className="nav-container">
                    <div className="logo">Kure-Cal</div>
                    <ul className="nav-links">
                        <li><Link href="#features" className="nav-link">Features</Link></li>
                        <li><Link href="/blog" className="nav-link">Blog</Link></li>
                    </ul>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="nav-link">Sign In</Link>
                        <Link href="/signup" className="nav-cta">Start Free Trial</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-bg"></div>
                <div className="hero-grid"></div>

                <div className="hero-content">
                    <div className="hero-text">
                        <h1 className="hero-title">Never Miss What Matters</h1>
                        <p className="hero-subtitle">{"// antidote to information_overload"}</p>
                        <p className="hero-description">
                            Stop juggling 12 different calendars and missing crucial tech events.
                            Kure-Cal consolidates 500+ event sources into one intelligent calendar
                            that learns what you care about.
                        </p>

                        <div className="hero-stats">
                            {heroStats.map((stat, index) => (
                                <div key={index} className="hero-stat">
                                    <span className="hero-stat-number">{stat.number}</span>
                                    <div className="hero-stat-label">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="cta-container">
                            <Link href="/calendar" className="cta-button cta-primary">
                                <span>See Live Calendar</span>
                                <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>

                    <div className="calendar-preview slide-in-right">
                        <div className="calendar-header">
                            <div className="calendar-title">Upcoming Tech Events</div>
                            <div className="calendar-live">
                                <div className="live-dot"></div>
                                Live Updates
                            </div>
                        </div>
                        <div className="calendar-events">
                            <div className="calendar-event">
                                <div className="event-date">May 14</div>
                                <div className="event-details">
                                    <div className="event-title">Google I/O 2025</div>
                                    <div className="event-company">Google</div>
                                </div>
                                <div className="event-status status-upcoming">Upcoming</div>
                            </div>
                            <div className="calendar-event">
                                <div className="event-date">May 21</div>
                                <div className="event-details">
                                    <div className="event-title">Microsoft Build</div>
                                    <div className="event-company">Microsoft</div>
                                </div>
                                <div className="event-status status-upcoming">Upcoming</div>
                            </div>
                            <div className="calendar-event">
                                <div className="event-date">Jun 10</div>
                                <div className="event-details">
                                    <div className="event-title">WWDC 2025</div>
                                    <div className="event-company">Apple</div>
                                </div>
                                <div className="event-status status-upcoming">Upcoming</div>
                            </div>
                            <div className="calendar-event">
                                <div className="event-date">NOW</div>
                                <div className="event-details">
                                    <div className="event-title">DevOps Days</div>
                                    <div className="event-company">DevOps Community</div>
                                </div>
                                <div className="event-status status-live">Live</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Chaos to Order Animation */}
            <section className="chaos-to-order" ref={chaosSectionRef}>
                <div className="animation-pinner">
                    <div className="events-container">
                        {animationPositions.map((pos, index) => (
                            <AnimatedEventCard
                                key={index}
                                eventData={eventsData[index]}
                                positions={pos}
                                scrollYProgress={scrollYProgress}
                            />
                        ))}
                    </div>
                    <div className="header-container">
                        <motion.div className="chaos-header" style={{ opacity: chaosHeaderOpacity }}>
                            <h2 className="chaos-title">The Problem</h2>
                            <p className="chaos-subtitle">Information scattered everywhere...</p>
                        </motion.div>
                        <motion.div className="solution-header" style={{ opacity: solutionHeaderOpacity }}>
                            <h2 className="solution-title">The Solution</h2>
                            <p className="solution-subtitle">Everything organized, nothing missed.</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="social-proof fade-in">
                <h3 className="social-proof-title">Trusted by teams at</h3>
                <div className="company-logos">
                    <div className="company-logo">Stripe</div>
                    <div className="company-logo">Vercel</div>
                    <div className="company-logo">Linear</div>
                    <div className="company-logo">Notion</div>
                    <div className="company-logo">Figma</div>
                </div>
                <p className="user-count">Join 50,000+ developers who never miss important tech events</p>
            </section>

            {/* Features */}
            <section className="features" id="features">
                <div className="features-header fade-in">
                    <h2 className="features-title">The Complete Solution</h2>
                    <p className="features-subtitle">
                        Everything you need to stay on top of the tech world,
                        without the information overload
                    </p>
                </div>

                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className={`feature-card ${index % 2 === 0 ? 'slide-in-left' : 'slide-in-right'}`}>
                            <div className="feature-icon">{feature.icon}</div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="final-cta">
                <div className="final-cta-content">
                    <h2 className="fade-in">Ready to cure your tech FOMO?</h2>
                    <p className="fade-in">Join 50,000+ professionals who have found the antidote to information overload.</p>
                    <Link href="/signup" className="final-cta-button fade-in">
                        Start Your Free Trial
                    </Link>
                </div>
            </section>
        </div>
    );
}