'use client';

import { useEffect, useRef } from 'react';
import {
    Lightning,
    ChartBar,
    UsersThree,
    ArrowRight
} from '@phosphor-icons/react';

export default function DesignMockupPage() {
    const heroRef = useRef<HTMLElement>(null);
    const workflowRef = useRef<HTMLElement>(null);
    const trustedRef = useRef<HTMLElement>(null);
    const featuresRef = useRef<HTMLElement>(null);
    const ctaRef = useRef<HTMLElement>(null);
    const dashboardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Smooth scroll behavior
        document.documentElement.style.scrollBehavior = 'smooth';

        // Intersection Observer for scroll-triggered animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-visible');
                }
            });
        }, observerOptions);

        // Observe all sections
        const sections = [heroRef.current, workflowRef.current, trustedRef.current, featuresRef.current, ctaRef.current].filter(Boolean);
        sections.forEach((section) => {
            if (section) observer.observe(section);
        });

        // 3D Parallax effect for dashboard preview
        const handleMouseMove = (e: MouseEvent) => {
            if (!dashboardRef.current) return;
            const rect = dashboardRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;

            dashboardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
        };

        const handleMouseLeave = () => {
            if (!dashboardRef.current) return;
            dashboardRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        };

        const dashboard = dashboardRef.current;
        if (dashboard) {
            dashboard.addEventListener('mousemove', handleMouseMove);
            dashboard.addEventListener('mouseleave', handleMouseLeave);
        }

        return () => {
            sections.forEach((section) => {
                if (section) observer.unobserve(section);
            });
            if (dashboard) {
                dashboard.removeEventListener('mousemove', handleMouseMove);
                dashboard.removeEventListener('mouseleave', handleMouseLeave);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-[#C86BFF]/30 overflow-x-hidden">
            <style jsx global>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .fade-in-section {
                    opacity: 0;
                    transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .fade-in-visible {
                    opacity: 1;
                    animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }

                .fade-in-delay-1 {
                    transition-delay: 0.1s;
                }

                .fade-in-delay-2 {
                    transition-delay: 0.2s;
                }

                .fade-in-delay-3 {
                    transition-delay: 0.3s;
                }

                @keyframes gradient-shift {
                    0%, 100% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                }

                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient-shift 4s ease infinite;
                }

                @keyframes rotate-circle {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                @keyframes dash-offset {
                    from {
                        stroke-dashoffset: 0;
                    }
                    to {
                        stroke-dashoffset: 12;
                    }
                }

                .animate-rotate {
                    animation: rotate-circle 20s linear infinite;
                    transform-origin: center center;
                }

                .animate-dash {
                    animation: dash-offset 1s linear infinite;
                }

                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>


            {/* Ambient Glows - Refined */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[800px] max-w-7xl pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-[#C86BFF]/8 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#36D39A]/8 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
            </div>

            {/* Navbar - Enhanced */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#020202]/80 backdrop-blur-2xl transition-all duration-300">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C86BFF] to-[#36D39A] flex items-center justify-center shadow-lg shadow-[#C86BFF]/20">
                            <span className="font-bold text-white text-sm">K</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">Kure-Cal</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                        <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300 relative group">
                            Product
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#C86BFF] to-[#36D39A] group-hover:w-full transition-all duration-300"></span>
                        </a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300 relative group">
                            Solutions
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#C86BFF] to-[#36D39A] group-hover:w-full transition-all duration-300"></span>
                        </a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300 relative group">
                            Pricing
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#C86BFF] to-[#36D39A] group-hover:w-full transition-all duration-300"></span>
                        </a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300 relative group">
                            Changelog
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#C86BFF] to-[#36D39A] group-hover:w-full transition-all duration-300"></span>
                        </a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-300">Log in</button>
                        <button className="text-sm font-semibold bg-white text-black px-5 py-2.5 rounded-full hover:bg-gray-200 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-white/20">
                            Sign up
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section - Two Column Layout */}
            <section ref={heroRef} className="relative pt-48 pb-40 z-10 fade-in-section">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="grid md:grid-cols-2 gap-16 items-center min-h-[600px]">
                        {/* Left Side - Text Content */}
                        <div className="space-y-8">
                    {/* Announcement Pill */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#36D39A] backdrop-blur-sm hover:bg-white/10 transition-all duration-300 cursor-pointer group hover:border-[#36D39A]/30">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#36D39A] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#36D39A]"></span>
                        </span>
                                <span className="tracking-wide">New: Career-focused event recommendations</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>

                            <h1 className="text-[2.7rem] font-light leading-none md:leading-tight xl:leading-[80px] lg:text-6xl xl:text-7xl -tracking-[1%] font-aeonik max-w-2xl xl:max-w-4xl text-white">
                                <span className="text-[#BBDEF2]">Your Tech Event</span> Calendar
                    </h1>

                            <p className="text-lg md:text-xl text-gray-400 leading-relaxed font-light max-w-xl">
                                Discover career-focused tech events with smart recommendations. Sync to your calendar and never miss what matters.
                    </p>

                            {/* CTA Buttons - Side by side */}
                            <div className="flex items-center gap-4 pt-4">
                                <button className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full hover:bg-gray-200 transition-all duration-300 hover:scale-105 active:scale-100">
                            Start for free
                                    <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </button>

                                <button className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-transparent border border-white/20 rounded-full hover:bg-white/5 hover:border-white/40 transition-all duration-300">
                                    Build AI
                                    <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </button>
                            </div>
                        </div>

                        {/* Right Side - Abstract Graphics */}
                        <div className="relative w-full h-full min-h-[500px] flex items-center justify-center overflow-hidden">
                            {/* Three triangular shapes with gradients */}
                            <div className="relative w-full max-w-lg h-[600px]">
                                {/* Largest triangle - rightmost, highest */}
                                <div 
                                    className="absolute top-[10%] right-[5%]"
                                    style={{
                                        width: '280px',
                                        height: '400px',
                                        background: 'linear-gradient(135deg, rgba(200, 107, 255, 0.6) 0%, rgba(168, 85, 247, 0.4) 50%, rgba(96, 165, 250, 0.6) 100%)',
                                        clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                                        filter: 'drop-shadow(0 0 40px rgba(200, 107, 255, 0.3)) blur(0.5px)',
                                        opacity: 0.85,
                                    }}
                                />

                                {/* Medium triangle - middle position */}
                                <div 
                                    className="absolute top-[25%] right-[20%]"
                                    style={{
                                        width: '220px',
                                        height: '320px',
                                        background: 'linear-gradient(135deg, rgba(200, 107, 255, 0.5) 0%, rgba(168, 85, 247, 0.3) 50%, rgba(96, 165, 250, 0.5) 100%)',
                                        clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                                        filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.3)) blur(0.5px)',
                                        opacity: 0.75,
                                    }}
                                />

                                {/* Smallest triangle - leftmost, lowest */}
                                <div 
                                    className="absolute top-[40%] right-[35%]"
                                    style={{
                                        width: '160px',
                                        height: '240px',
                                        background: 'linear-gradient(135deg, rgba(200, 107, 255, 0.4) 0%, rgba(168, 85, 247, 0.2) 50%, rgba(96, 165, 250, 0.4) 100%)',
                                        clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                                        filter: 'drop-shadow(0 0 20px rgba(96, 165, 250, 0.3)) blur(0.5px)',
                                        opacity: 0.65,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Workflow Diagram Section - Inspired by Hex.tech */}
            <section ref={workflowRef} className="py-32 md:py-48 relative fade-in-section overflow-hidden">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        {/* Left: Headlines */}
                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                                A smarter way to <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C86BFF] to-[#36D39A]">
                                    discover tech events
                                </span>
                            </h2>
                            <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed max-w-xl">
                                Kure-Cal helps you discover events that match your career goals, prioritize what matters, and sync seamlessly to your calendar – so you can focus on what&apos;s important.
                            </p>
                        </div>

                        {/* Right: Cycle Grid */}
                        <div className="relative flex items-center justify-center min-h-[560px] w-full">
                            {/* Particles Grid - Contains all diagram elements */}
                            <div className="relative w-full max-w-[560px] aspect-square">
                                {/* Text on Circular Paths - Step Transition Text */}
                                <svg 
                                    height="440" 
                                    viewBox="0 0 440 440" 
                                    width="440" 
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] h-[78%]"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <defs>
                                        <path 
                                            d="M 220,220 m 200, 0 a 200,200 0 1,1 -400,0 a 200,200 0 1,1 400,0" 
                                            id="cycle-path-reverse"
                                        />
                                        <path 
                                            d="M 220,220 m 200, 0 a 200,200 0 1,0 -400,0 a 200,200 0 1,0 400,0" 
                                            id="cycle-path"
                                        />
                                    </defs>
                                    <text 
                                        fill="#9CA3AF" 
                                        fontSize="9" 
                                        fontWeight="600" 
                                        letterSpacing="0.04em"
                                        style={{ textTransform: 'uppercase' }}
                                    >
                                        <textPath startOffset="53%" href="#cycle-path-reverse" fill="#9CA3AF">
                                            Auto-discover events
                                        </textPath>
                                        <textPath startOffset="89%" href="#cycle-path-reverse" fill="#9CA3AF">
                                            AI prioritization
                                        </textPath>
                                        <textPath startOffset="72%" href="#cycle-path" fill="#9CA3AF">
                                            Sync to calendar
                                        </textPath>
                                    </text>
                                </svg>

                                {/* Circular Arrow Path - Connecting all 3 nodes */}
                                <svg 
                                    height="560" 
                                    viewBox="0 0 560 560" 
                                    width="560" 
                                    className="absolute inset-0 w-full h-full animate-rotate"
                                    xmlns="http://www.w3.org/2000/svg"
                                    style={{ transformOrigin: '280px 280px' }}
                                >
                                    <defs>
                                        <marker 
                                            id="arrow-marker" 
                                            markerHeight="6" 
                                            markerWidth="6" 
                                            orient="auto-start-reverse" 
                                            refX="5" 
                                            refY="5" 
                                            viewBox="0 0 10 10"
                                        >
                                            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(156, 163, 175, 0.6)" />
                                        </marker>
                                    </defs>
                                    
                                    {/* Circular path connecting the 3 nodes evenly */}
                                    {/* Nodes are at 140px from center, cards are 140px, so path at 210px radius to loop around them */}
                                    <circle
                                        cx="280"
                                        cy="280"
                                        r="210"
                                        fill="none"
                                        markerStart="url(#arrow-marker)"
                                        stroke="rgba(156, 163, 175, 0.4)"
                                        strokeWidth="1"
                                        strokeDasharray="4 8"
                                        strokeDashoffset="0"
                                        className="animate-dash"
                                    />
                                </svg>

                                {/* Node Cards - Positioned around circle */}
                                {/* Node 1: Auto Discovery (Bottom) - normal: (0, -1) */}
                                <div 
                                    className="absolute top-1/2 left-1/2"
                                    style={{
                                        '--step-normal-x': '-1.2246467991473532e-16',
                                        '--step-normal-y': '-1',
                                        '--step-color': '#36D39A',
                                        transform: 'translate(calc(var(--step-normal-x) * 180px - 50%), calc(var(--step-normal-y) * 180px - 50%))',
                                    } as React.CSSProperties}
                                >
                                    <div className="relative group w-[140px] h-[140px]">
                                        {/* Gradient Mask */}
                                        <div className="absolute inset-0 rounded-2xl overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#36D39A]/10 to-[#10B981]/10" />
                                            {/* Dot grid mask */}
                                            <div className="absolute inset-0 opacity-30"
                                                style={{
                                                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                                                    backgroundSize: '8px 8px',
                                                }}
                                            />
                                        </div>
                                        
                                        <div className="relative bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-[#36D39A]/30 transition-all duration-300 w-full h-full flex items-center justify-center">
                                            {/* Illustration SVG */}
                                            <div className="w-[100px] h-[100px] flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" vectorEffect="non-scaling-stroke" viewBox="0 0 174 162" className="w-full h-full">
                                                    <path stroke="#F5C0C0" d="M122.404 71.5 144 84l-56 36.5L30.5 84l23-12.39" />
                                                    <path stroke="#F5C0C0" strokeWidth="2.33" d="m87.72 90.769-56.55-31.62 56.865-31.926 56.366 31.618z" />
                                                    <path stroke="#FBF9F9" strokeDasharray="2.33 4.65" d="m75.67 44.54 35.944 21.098" />
                                                    <path stroke="#FBF9F9" d="m75.67 57.043 25.004 14.065M98.33 44.54l25.786 14.847" />
                                                    <path stroke="#FBF9F9" strokeDasharray="2.33 4.65" d="m59.26 59.387 31.256 18.754" />
                                                    <path stroke="#FBF9F9" d="m29 84 58 66" />
                                                    <path stroke="#FBF9F9" d="m145 84-58 66" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Title - Flat Text */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 pointer-events-none whitespace-nowrap">
                                        <div className="text-[#36D39A] text-xs font-bold uppercase tracking-[0.04em] text-center">
                                            Auto discovery
                                        </div>
                                    </div>
                                    <a 
                                        href="#auto-discovery" 
                                        className="absolute inset-0 z-20" 
                                        aria-label="Auto discovery"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            // Smooth scroll to section if it exists
                                            const target = document.querySelector('#auto-discovery');
                                            if (target) {
                                                target.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                    />
                                </div>

                                {/* Node 2: Smart Prioritization (Top Right) - normal: (0.866, 0.5) */}
                                <div 
                                    className="absolute top-1/2 left-1/2"
                                    style={{
                                        '--step-normal-x': '0.866025403784439',
                                        '--step-normal-y': '0.49999999999999933',
                                        '--step-color': '#C86BFF',
                                        transform: 'translate(calc(var(--step-normal-x) * 180px - 50%), calc(var(--step-normal-y) * 180px - 50%))',
                                    } as React.CSSProperties}
                                >
                                    <div className="relative group w-[140px] h-[140px]">
                                        {/* Gradient Mask */}
                                        <div className="absolute inset-0 rounded-2xl overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#C86BFF]/10 to-[#A855F7]/10" />
                                            {/* Dot grid mask */}
                                            <div className="absolute inset-0 opacity-30"
                                                style={{
                                                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                                                    backgroundSize: '8px 8px',
                                                }}
                                            />
                    </div>

                                        <div className="relative bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-[#C86BFF]/30 transition-all duration-300 w-full h-full flex items-center justify-center">
                                            {/* Illustration SVG */}
                                            <div className="w-[100px] h-[100px] flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" vectorEffect="non-scaling-stroke" viewBox="0 0 178 179" className="w-full h-full">
                                                    <circle cx="89.408" cy="88.056" r="27.503" stroke="#F5C0C0" />
                                                    <circle cx="89.408" cy="88.056" r="27.503" stroke="#F5C0C0" />
                                                    <path stroke="#36D39A" d="m77.165 87.616 9.75 9.751 17.45-17.45" />
                                                    <path stroke="#FBF9F9" d="M145.141 121.614c18.088-31.328 7.519-71.292-23.604-89.261-29.09-16.795-65.84-8.433-85.287 18.31m19.787 95.139c-8.657-4.998-15.723-11.697-21.025-19.438m93.985 13.973c-13.832 10.944-31.566 15.865-48.957 13.608M27.203 67.969a65.5 65.5 0 0 0-1.7 37.13" />
                                                    <ellipse cx="89.5" cy="89" stroke="#FBF9F9" strokeDasharray="2.33 4.65" rx="47.5" ry="47" shapeRendering="crispEdges" />
                                                    <circle cx="146.391" cy="119.449" r="9" fill="#36D39A" transform="rotate(30 146.391 119.449)" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Title - Flat Text */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 pointer-events-none whitespace-nowrap">
                                        <div className="text-[#C86BFF] text-xs font-bold uppercase tracking-[0.04em] text-center">
                                            Smart prioritization
                                        </div>
                                    </div>
                                    <a 
                                        href="#smart-prioritization" 
                                        className="absolute inset-0 z-20" 
                                        aria-label="Smart prioritization"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            const target = document.querySelector('#smart-prioritization');
                                            if (target) {
                                                target.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                    />
                                </div>

                                {/* Node 3: Calendar Sync (Top Left) - normal: (-0.866, 0.5) */}
                                <div 
                                    className="absolute top-1/2 left-1/2"
                                    style={{
                                        '--step-normal-x': '-0.8660254037844384',
                                        '--step-normal-y': '0.5000000000000006',
                                        '--step-color': '#60A5FA',
                                        transform: 'translate(calc(var(--step-normal-x) * 180px - 50%), calc(var(--step-normal-y) * 180px - 50%))',
                                    } as React.CSSProperties}
                                >
                                    <div className="relative group w-[140px] h-[140px]">
                                        {/* Gradient Mask */}
                                        <div className="absolute inset-0 rounded-2xl overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#60A5FA]/10 to-[#3B82F6]/10" />
                                            {/* Dot grid mask */}
                                            <div className="absolute inset-0 opacity-30"
                                                style={{
                                                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                                                    backgroundSize: '8px 8px',
                                                }}
                                            />
                                        </div>
                                        
                                        <div className="relative bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-[#60A5FA]/30 transition-all duration-300 w-full h-full flex items-center justify-center">
                                            {/* Illustration SVG */}
                                            <div className="w-[100px] h-[100px] flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" vectorEffect="non-scaling-stroke" viewBox="0 0 178 179" className="w-full h-full">
                                                    {/* Calendar frame */}
                                                    <rect x="20" y="30" width="138" height="128" rx="4" stroke="#F5C0C0" strokeWidth="2" />
                                                    {/* Calendar header */}
                                                    <rect x="20" y="30" width="138" height="28" rx="4" fill="#F5C0C0" opacity="0.2" />
                                                    {/* Calendar grid lines */}
                                                    {/* Evenly spaced: calendar width is 138px, divided into 4 columns = 34.5px each */}
                                                    <path stroke="#FBF9F9" strokeDasharray="2.33 4.65" d="M20 58h138M54.5 30v128M89 30v128M123.5 30v128" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Title - Flat Text */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 pointer-events-none whitespace-nowrap">
                                        <div className="text-[#60A5FA] text-xs font-bold uppercase tracking-[0.04em] text-center">
                                            Calendar sync
                                        </div>
                                    </div>
                                    <a 
                                        href="#calendar-sync" 
                                        className="absolute inset-0 z-20" 
                                        aria-label="Calendar sync"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            const target = document.querySelector('#calendar-sync');
                                            if (target) {
                                                target.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Built For Developers */}
            <section ref={trustedRef} className="py-16 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm fade-in-section">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-xs text-gray-500 font-medium mb-4 uppercase tracking-[0.2em]">Built for developers</p>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto font-light">
                        Track events from 100+ sources. Get personalized recommendations. Sync to your calendar.
                    </p>
                </div>
            </section>

            {/* Features Grid - Enhanced */}
            <section ref={featuresRef} className="py-48 relative fade-in-section">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-32">
                        <h2 className="text-5xl md:text-6xl font-extrabold mb-8 tracking-tight">Features built for your workflow</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-xl font-light">
                            Tools to help you discover, prioritize, and track the tech events that matter to your career.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10">
                        {[
                            {
                                icon: <Lightning size={36} weight="fill" />,
                                title: 'Lightning Alerts',
                                desc: 'Be notified when new events drop—no feeds to babysit. Instant push notifications for your tracked interests.',
                                gradient: 'from-[#C86BFF] to-[#A855F7]'
                            },
                            {
                                icon: <ChartBar size={36} weight="fill" />,
                                title: 'Smart Insights',
                                desc: 'See the events that actually move your career forward. AI-driven recommendations based on your stack.',
                                gradient: 'from-[#36D39A] to-[#10B981]'
                            },
                            {
                                icon: <UsersThree size={36} weight="fill" />,
                                title: 'Team Intelligence',
                                desc: 'Share must‑attend events and keep schedules aligned. Export directly to Slack or Google Calendar.',
                                gradient: 'from-[#60A5FA] to-[#3B82F6]'
                            }
                        ].map((feature, i) => (
                            <div 
                                key={i} 
                                className="group relative p-12 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-sm transition-all duration-500 hover:border-white/15 hover:bg-white/[0.05] hover:-translate-y-3 hover:shadow-2xl hover:shadow-[#C86BFF]/10 fade-in-section"
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                <div className={`mb-10 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${feature.gradient} bg-opacity-20 text-white shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-[#C86BFF]/30 transition-all duration-500`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-5 tracking-tight">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-400 leading-relaxed text-lg font-light">
                                    {feature.desc}
                                </p>
                                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section - Enhanced */}
            <section ref={ctaRef} className="py-48 relative overflow-hidden fade-in-section">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0B0E14] via-[#0B0E14] to-[#C86BFF]/10" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-t from-[#C86BFF]/25 via-[#A855F7]/15 to-transparent blur-[120px] pointer-events-none" />
                <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-gradient-to-b from-[#36D39A]/15 to-transparent blur-[100px] pointer-events-none" />

                <div className="container relative mx-auto px-6 text-center z-10">
                    <h2 className="text-6xl md:text-7xl font-extrabold mb-10 tracking-tight">Ready to sync your career?</h2>
                    <p className="text-xl md:text-2xl text-gray-400 mb-14 max-w-2xl mx-auto font-light leading-relaxed">
                        Start tracking tech events that align with your career goals. Free to get started.
                    </p>
                    <button className="group relative px-14 py-7 bg-white text-black text-xl font-bold rounded-full hover:bg-gray-200 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] active:scale-100">
                        Start Tracking Now
                        <ArrowRight className="inline-block ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                </div>
            </section>

            {/* Footer - Enhanced */}
            <footer className="border-t border-white/5 py-20 bg-[#020202]">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-6 h-6 rounded bg-gradient-to-br from-[#C86BFF] to-[#36D39A] shadow-lg shadow-[#C86BFF]/20" />
                                <span className="text-lg font-bold">Kure-Cal</span>
                            </div>
                            <p className="text-gray-500 text-sm font-light">The calendar for the modern web.</p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6 text-white">Product</h4>
                            <ul className="space-y-4 text-gray-500">
                                <li><a href="#" className="hover:text-white transition-colors duration-300 text-sm">Features</a></li>
                                <li><a href="#" className="hover:text-white transition-colors duration-300 text-sm">Integrations</a></li>
                                <li><a href="#" className="hover:text-white transition-colors duration-300 text-sm">Pricing</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6 text-white">Company</h4>
                            <ul className="space-y-4 text-gray-500">
                                <li><a href="#" className="hover:text-white transition-colors duration-300 text-sm">About</a></li>
                                <li><a href="#" className="hover:text-white transition-colors duration-300 text-sm">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition-colors duration-300 text-sm">Careers</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-6 text-white">Legal</h4>
                            <ul className="space-y-4 text-gray-500">
                                <li><a href="#" className="hover:text-white transition-colors duration-300 text-sm">Privacy</a></li>
                                <li><a href="#" className="hover:text-white transition-colors duration-300 text-sm">Terms</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-10 border-t border-white/5 text-center text-gray-600 text-sm">
                        © 2025 Kure-Cal. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
