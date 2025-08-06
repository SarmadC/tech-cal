// src/components/landing/ChaosToOrderSection.tsx

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { eventsData } from '@/data/landing-page-data';
import { AnimatedEventCard } from './AnimatedEventCard';
import '@/app/styles/ChaosToOrder.css';

// Register GSAP plugins safely for client-side execution
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function ChaosToOrderSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    particles: THREE.Points | null;
  } | null>(null);

  const animationFrameRef = useRef<number | undefined>(undefined);
  const scrollProgressRef = useRef(0);
  
  // Cache DOM elements
  const domCacheRef = useRef<{
    cards: NodeListOf<HTMLElement> | null;
    chaosTitle: HTMLElement | null;
    chaosSubtitle: HTMLElement | null;
    orderTitle: HTMLElement | null;
    orderSubtitle: HTMLElement | null;
  }>({
    cards: null,
    chaosTitle: null,
    chaosSubtitle: null,
    orderTitle: null,
    orderSubtitle: null
  });

  // Pre-calculate card positions
  const cardPositionsRef = useRef<{
    chaos: { x: number; y: number; rot: number; scale: number }[];
    order: { x: number; y: number }[];
  }>({ chaos: [], order: [] });

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0f172a, 10, 50);
    
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 20);
    
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance" // Prefer high performance GPU
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Reduce particle count for better performance
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 800; // Optimized for 9 cards
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
      const radius = 25 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
      const mixFactor = Math.random();
      colors[i] = 0.39 + mixFactor * 0.13;
      colors[i + 1] = 0.4 + mixFactor * 0.43;
      colors[i + 2] = 0.95 - mixFactor * 0.02;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({ 
      size: 0.05, 
      vertexColors: true, 
      transparent: true, 
      opacity: 0.6, 
      blending: THREE.AdditiveBlending 
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x6366f1, 1);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);
    
    sceneRef.current = { scene, camera, renderer, particles };
    
    // Throttled animation loop
    let lastTime = 0;
    const targetFPS = 60; // Increased back to 60 FPS for smoother particles
    const frameInterval = 1000 / targetFPS;
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= frameInterval) {
        const t = currentTime * 0.001;
        const scrollProgress = scrollProgressRef.current;
        
        if (particles) {
          const chaos = 1 - scrollProgress;
          particles.rotation.x = t * 0.05 * chaos;
          particles.rotation.y = t * 0.03 * chaos;
          particles.material.opacity = 0.2 + chaos * 0.4;
          (particles.material as THREE.PointsMaterial).size = 0.03 + chaos * 0.02;
        }
        
        camera.position.z = 20 - scrollProgress * 10;
        camera.position.x = Math.sin(t * 0.2) * 2 * (1 - scrollProgress);
        camera.position.y = Math.cos(t * 0.15) * 1 * (1 - scrollProgress);
        camera.lookAt(0, 0, 0);
        
        renderer.render(scene, camera);
        lastTime = currentTime - (deltaTime % frameInterval);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate(0);
    
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      calculateCardPositions(); // Recalculate positions on resize
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
    };
  }, []);

  // Calculate card positions once
  const calculateCardPositions = () => {
    const cards = domCacheRef.current.cards;
    if (!cards) return;
    
    // Calendar layout calculations
    const calendarWidth = window.innerWidth > 768 ? Math.min(800, window.innerWidth * 0.8) : window.innerWidth * 0.95;
    const calendarHeight = window.innerWidth > 768 ? 450 : 350;
    const startX = (window.innerWidth - calendarWidth) / 2;
    const startY = (window.innerHeight - calendarHeight) / 2 + 40;
    
    // 7 columns for days of the week
    const cols = 7;
    const cellWidth = calendarWidth / cols;
    const cellHeight = (calendarHeight - 80) / 5; // 5 rows + header space
    
    // Card dimensions to fit in calendar cells
    const cardWidth = cellWidth - 8;
    const cardHeight = cellHeight - 8;
    
    // Define calendar positions for each event (mapped to specific dates)
    // This creates a realistic calendar layout for May 2025
    const calendarPositions = [
      { col: 3, row: 1 }, // May 14 - Google I/O (Wed, week 2)
      { col: 1, row: 2 }, // Jun 10 would be next month, so place elsewhere
      { col: 3, row: 2 }, // May 21 - Microsoft Build (Wed, week 3)
      { col: 5, row: 0 }, // Apr 22 shown as past event
      { col: 4, row: 3 }, // Oct 25 placeholder
      { col: 0, row: 1 }, // Mar 15 placeholder
      { col: 6, row: 4 }, // Nov 27 placeholder
      { col: 2, row: 3 }, // Sep 18 placeholder
      { col: 5, row: 2 }, // Nov 08 placeholder
    ];
    
    cardPositionsRef.current.chaos = [];
    cardPositionsRef.current.order = [];
    
    cards.forEach((card, i) => {
      // Chaos positions - scattered randomly
      cardPositionsRef.current.chaos.push({
        x: Math.random() * (window.innerWidth - 240),
        y: Math.random() * (window.innerHeight - 120),
        rot: (Math.random() - 0.5) * 45,
        scale: 0.7 + Math.random() * 0.3
      });
      
      // Order positions - in calendar layout
      const pos = calendarPositions[i] || { col: 0, row: 0 };
      cardPositionsRef.current.order.push({
        x: startX + pos.col * cellWidth + 4,
        y: startY + 80 + pos.row * cellHeight + 4 // 80px offset for calendar header
      });
      
      // Store dimensions for card resizing
      card.dataset.cardWidth = String(cardWidth);
      card.dataset.cardHeight = String(cardHeight);
    });
    
    // Store calendar dimensions for rendering
    if (containerRef.current) {
      containerRef.current.dataset.calendarStartX = String(startX);
      containerRef.current.dataset.calendarStartY = String(startY);
      containerRef.current.dataset.calendarWidth = String(calendarWidth);
      containerRef.current.dataset.calendarHeight = String(calendarHeight);
    }
  };

  // Optimized card update function
  const updateCards = (progress: number) => {
    const cards = domCacheRef.current.cards;
    if (!cards || cardPositionsRef.current.chaos.length === 0) return;
    
    // Simple linear interpolation for smoother scrolling
    const easedProgress = progress;
    
    cards.forEach((card, i) => {
      const chaos = cardPositionsRef.current.chaos[i];
      const order = cardPositionsRef.current.order[i];
      
      const currentX = chaos.x + (order.x - chaos.x) * easedProgress;
      const currentY = chaos.y + (order.y - chaos.y) * easedProgress;
      const currentRot = chaos.rot * (1 - easedProgress);
      const currentScale = chaos.scale + (1 - chaos.scale) * easedProgress;
      
      // Get target dimensions for calendar view
      const targetWidth = parseFloat(card.dataset.cardWidth || '100');
      const targetHeight = parseFloat(card.dataset.cardHeight || '60');
      
      // Use transform3d for GPU acceleration
      card.style.transform = `translate3d(${currentX}px, ${currentY}px, 0px) rotate(${currentRot}deg) scale(${currentScale})`;
      
      // Animate card size for calendar fit
      if (progress > 0.5) {
        const sizeProgress = (progress - 0.5) * 2;
        card.style.width = `${240 + (targetWidth - 240) * sizeProgress}px`;
        card.style.height = `${120 + (targetHeight - 120) * sizeProgress}px`;
      }
      
      // Update classes only when crossing thresholds
      if (progress < 0.3 && !card.classList.contains('chaos-state')) {
        card.classList.add('chaos-state');
        card.classList.remove('organized', 'calendar-view');
      } else if (progress > 0.7 && !card.classList.contains('calendar-view')) {
        card.classList.remove('chaos-state');
        card.classList.add('organized', 'calendar-view');
      } else if (progress >= 0.3 && progress <= 0.7) {
        card.classList.remove('chaos-state', 'organized', 'calendar-view');
      }
    });
    
    // Update calendar frame visibility
    const calendarFrame = containerRef.current?.querySelector('.calendar-frame');
    if (calendarFrame instanceof HTMLElement) {
      calendarFrame.style.opacity = String(Math.max(0, (progress - 0.5) * 2));
    }
  };

  // Initialize DOM cache and positions
  useEffect(() => {
    if (!containerRef.current || !sectionRef.current) return;
    
    // Cache DOM elements once
    domCacheRef.current = {
      cards: containerRef.current.querySelectorAll<HTMLElement>('.event-card-animated'),
      chaosTitle: sectionRef.current.querySelector<HTMLElement>('.chaos-title'),
      chaosSubtitle: sectionRef.current.querySelector<HTMLElement>('.chaos-subtitle'),
      orderTitle: sectionRef.current.querySelector<HTMLElement>('.order-title'),
      orderSubtitle: sectionRef.current.querySelector<HTMLElement>('.order-subtitle')
    };
    
    // Calculate initial positions
    calculateCardPositions();
    
    // Set calendar frame position
    const calendarFrame = containerRef.current.querySelector<HTMLElement>('.calendar-frame');
    if (calendarFrame && containerRef.current.dataset.calendarStartX) {
      calendarFrame.style.left = `${containerRef.current.dataset.calendarStartX}px`;
      calendarFrame.style.top = `${containerRef.current.dataset.calendarStartY}px`;
      calendarFrame.style.width = `${containerRef.current.dataset.calendarWidth}px`;
      calendarFrame.style.height = `${containerRef.current.dataset.calendarHeight}px`;
    }
    
    // Make cards visible with stagger
    domCacheRef.current.cards?.forEach((card, i) => {
      setTimeout(() => {
        card.classList.add('visible');
      }, i * 50); // Reduced from 100ms
    });
  }, []);

  // Optimized scroll animation
  useEffect(() => {
    if (!sectionRef.current) return;
    
    const { chaosTitle, chaosSubtitle, orderTitle, orderSubtitle } = domCacheRef.current;
    
    // Create timeline for text animations
    const tl = gsap.timeline({ paused: true });
    
    tl.to([chaosTitle, chaosSubtitle], {
      opacity: 0,
      duration: 0.3,
      ease: "power1.out"
    }, 0)
    .set([orderTitle, orderSubtitle], { display: 'block' }, 0.5)
    .fromTo([orderTitle, orderSubtitle], 
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: "power1.out" },
      0.5
    );
    
    const scrollTrigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.1, // Minimal scrub for immediate response
      onUpdate: (self) => {
        scrollProgressRef.current = self.progress;
        updateCards(self.progress);
        tl.progress(self.progress);
      },
    });
    
    return () => {
      scrollTrigger.kill();
      tl.kill();
    };
  }, []);

  return (
    <section ref={sectionRef} className="chaos-section">
      <div className="sticky-container">
        <canvas ref={canvasRef} className="three-canvas" />
        <div ref={containerRef} className="cards-container">
          {/* Calendar Frame - appears during organization */}
          <div className="calendar-frame">
            <div className="calendar-header">
              <h3 className="calendar-month">May 2025</h3>
              <div className="calendar-days">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>
            </div>
            <div className="calendar-grid">
              {/* Generate calendar cells for visual effect */}
              {Array.from({ length: 35 }, (_, i) => (
                <div key={i} className="calendar-cell" />
              ))}
            </div>
          </div>
          {/* Event Cards */}
          {eventsData.map((event, index) => (
            <AnimatedEventCard key={index} event={event} index={index} />
          ))}
        </div>
        <div className="text-overlay-container">
          <div className="chaos-text-wrapper">
            <h2 className="chaos-title">The Problem: Information Chaos</h2>
            <p className="chaos-subtitle">Events scattered across Twitter, Discord, Email, Slack...</p>
          </div>
          <div className="order-text-wrapper">
            <h2 className="order-title">The Solution: Your Calendar</h2>
            <p className="order-subtitle">Every event organized. Smart filters. Never miss what matters.</p>
          </div>
        </div>
      </div>
    </section>
  );
}