'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  Filter,
  SatelliteDish,
  Link as LinkIcon,
  Code2,
  BarChart3,
  Users,
  ArrowRight,
  Play,
} from 'lucide-react';

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
    icon: <Code2 />,
    title: 'Developer API',
    description: "RESTful API, webhooks, and real-time feeds. Integrate our curated event data into your apps.",
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

export default function LandingPage() {
  const chaosSectionRef = useRef<HTMLElement>(null);
  const chaosHeaderRef = useRef<HTMLDivElement>(null);
  const solutionHeaderRef = useRef<HTMLDivElement>(null);
  const eventCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationStateRef = useRef({ positions: [] as any[], isInitialized: false, animationFrameId: 0 });

  // Intersection Observer for simple fade/slide animations
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

  // "Chaos to Order" Animation Logic
  useEffect(() => {
    const chaosSection = chaosSectionRef.current;
    const chaosHeader = chaosHeaderRef.current;
    const solutionHeader = solutionHeaderRef.current;

    if (!chaosSection || !chaosHeader || !solutionHeader) return;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const setupPositions = () => {
      const isMobile = window.innerWidth <= 768;
      const cardWidth = 220;
      const cardHeight = 135;
      const padding = 20;
      const cols = isMobile ? 2 : 4;
      const eventsToAnimate = isMobile ? eventsData.slice(0, 8) : eventsData;
      
      const gridWidth = cols * cardWidth + (cols - 1) * padding;
      const gridHeight = Math.ceil(eventsToAnimate.length / cols) * (cardHeight + padding);
      const gridStartX = (window.innerWidth - gridWidth) / 2;
      const gridStartY = (window.innerHeight - gridHeight) * 0.6;

      animationStateRef.current.positions = eventsToAnimate.map((_, index) => {
        const chaosState = {
          x: Math.random() * (window.innerWidth - cardWidth),
          y: Math.random() * window.innerHeight + window.innerHeight * 1.2,
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
      animationStateRef.current.isInitialized = true;
    };

    const animateOnScroll = () => {
      if (!animationStateRef.current.isInitialized) return;
      
      const rect = chaosSection.getBoundingClientRect();
      const scrollY = -rect.top;

      if (scrollY > -window.innerHeight && scrollY < chaosSection.offsetHeight) {
        const scrollTrackLength = chaosSection.offsetHeight - window.innerHeight;
        const animationEndsAt = scrollTrackLength * 0.75;
        const progress = Math.max(0, Math.min(1, scrollY / animationEndsAt));

        eventCardRefs.current.forEach((el, index) => {
          if (el && animationStateRef.current.positions[index]) {
              const { chaos, organized } = animationStateRef.current.positions[index];
              const currentX = lerp(chaos.x, organized.x, progress);
              const currentY = lerp(chaos.y, organized.y, progress);
              const currentScale = lerp(chaos.scale, organized.scale, progress);
              const currentRot = lerp(chaos.rot, organized.rot, progress);
              el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${currentScale}) rotate(${currentRot}deg)`;
          }
        });

        const headerFadeStartPoint = 0.30;
        const headerFadeEndPoint = 0.90;
        const headerProgress = Math.max(0, Math.min(1, (progress - headerFadeStartPoint) / (headerFadeEndPoint - headerFadeStartPoint)));

        chaosHeader.style.opacity = `${1 - headerProgress}`;
        solutionHeader.style.opacity = `${headerProgress}`;
      }
      
      animationStateRef.current.animationFrameId = requestAnimationFrame(animateOnScroll);
    };

    setupPositions();
    animationStateRef.current.animationFrameId = requestAnimationFrame(animateOnScroll);

    window.addEventListener('resize', setupPositions);

    return () => {
      window.removeEventListener('resize', setupPositions);
      cancelAnimationFrame(animationStateRef.current.animationFrameId);
    };
  }, []);

  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-container">
          <div className="logo">Kure-Cal</div>
          <ul className="nav-links">
            <li><Link href="#features" className="nav-link">Features</Link></li>
            <li><Link href="/api-docs" className="nav-link">API</Link></li>
            <li><Link href="/blog" className="nav-link">Blog</Link></li>
          </ul>
          <Link href="/signup" className="nav-cta">Start Free Trial</Link>
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
              <Link href="#" className="cta-button cta-secondary">
                <span>Watch Demo</span>
                <Play size={20} />
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
              {eventsData.map((eventData, index) => (
                  <div 
                    key={index} 
                    className="floating-event" 
                    ref={el => { eventCardRefs.current[index] = el; }}
                  >
                      <div className="event-header">
                          <div className="event-company-tag">{eventData.company}</div>
                          <div className="event-date-badge">{eventData.date}</div>
                      </div>
                      <div className="floating-event-title">{eventData.title}</div>
                      <div className="floating-event-type">{eventData.type}</div>
                  </div>
              ))}
            </div>
            <div className="header-container">
                <div className="chaos-header" ref={chaosHeaderRef}>
                    <h2 className="chaos-title">The Problem</h2>
                    <p className="chaos-subtitle">Information scattered everywhere...</p>
                </div>
                <div className="solution-header" ref={solutionHeaderRef}>
                    <h2 className="solution-title">The Solution</h2>
                    <p className="solution-subtitle">Everything organized, nothing missed.</p>
                </div>
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