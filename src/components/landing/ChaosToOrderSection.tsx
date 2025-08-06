'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { eventsData } from '@/data/landing-page-data';
import { AnimatedEventCard } from './AnimatedEventCard';
import './ChaosToOrder.css'; // Import the dedicated styles

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
  const animationFrameRef = useRef<number>();
  const scrollProgressRef = useRef(0);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0f172a, 10, 50);
    
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 20);
    
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 2000;
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
    
    const particlesMaterial = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x6366f1, 1);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);
    
    sceneRef.current = { scene, camera, renderer, particles };
    
    const animate = (time: number) => {
      const t = time * 0.001;
      const scrollProgress = scrollProgressRef.current;
      
      if (particles) {
        const chaos = 1 - scrollProgress;
        particles.rotation.x = t * 0.05 * chaos;
        particles.rotation.y = t * 0.03 * chaos;
        particles.material.opacity = 0.2 + chaos * 0.4;
        (particles.material as THREE.PointsMaterial).size = 0.03 + chaos * 0.02;
      }
      
      camera.position.z += (20 - scrollProgress * 10 - camera.position.z) * 0.05;
      camera.position.x = Math.sin(t * 0.2) * 2 * (1 - scrollProgress);
      camera.position.y = Math.cos(t * 0.15) * 1 * (1 - scrollProgress);
      camera.lookAt(0, 0, 0);
      
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate(0);
    
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
    };
  }, []);

  const updateCards = (progress: number) => {
    const cards = containerRef.current?.querySelectorAll<HTMLElement>('.event-card-animated');
    if (!cards) return;
    
    const cols = window.innerWidth > 768 ? 4 : 2;
    const cardWidth = 300;
    const cardHeight = 150;
    const gap = 30;
    const totalWidth = cols * cardWidth + (cols - 1) * gap;
    const rows = Math.ceil(cards.length / cols);
    const totalHeight = rows * cardHeight + (rows - 1) * gap;
    const startX = (window.innerWidth - totalWidth) / 2;
    const startY = (window.innerHeight - totalHeight) / 2;
    
    cards.forEach((card, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const orderX = startX + col * (cardWidth + gap);
      const orderY = startY + row * (cardHeight + gap);
      
      const chaosX = parseFloat(card.dataset.chaosX || '0');
      const chaosY = parseFloat(card.dataset.chaosY || '0');
      const chaosRot = parseFloat(card.dataset.chaosRot || '0');
      const chaosScale = parseFloat(card.dataset.chaosScale || '1');
      
      const easedProgress = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const p = easedProgress(progress);
      
      const currentX = chaosX + (orderX - chaosX) * p;
      const currentY = chaosY + (orderY - chaosY) * p;
      const currentRot = chaosRot * (1 - p);
      const currentScale = chaosScale + (1 - chaosScale) * p;
      const currentZ = 100 * (1 - p);
      
      card.style.transform = `translate3d(${currentX}px, ${currentY}px, ${currentZ}px) rotate(${currentRot}deg) scale(${currentScale})`;
      
      card.classList.toggle('chaos-state', progress < 0.3);
      card.classList.toggle('organized', progress > 0.7);
    });
  };

  useEffect(() => {
    if (!sectionRef.current) return;
    
    const scrollTrigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        scrollProgressRef.current = self.progress;
        updateCards(self.progress);
        
        const chaosTitle = sectionRef.current?.querySelector<HTMLElement>('.chaos-title');
        const orderTitle = sectionRef.current?.querySelector<HTMLElement>('.order-title');
        const chaosSubtitle = sectionRef.current?.querySelector<HTMLElement>('.chaos-subtitle');
        const orderSubtitle = sectionRef.current?.querySelector<HTMLElement>('.order-subtitle');
        
        gsap.to([chaosTitle, chaosSubtitle], { opacity: 1 - self.progress * 2.5, ease: 'power1.out' });
        
        if (self.progress > 0.5) {
            if(orderTitle) orderTitle.style.display = 'block';
            if(orderSubtitle) orderSubtitle.style.display = 'block';
            gsap.to([orderTitle, orderSubtitle], { opacity: (self.progress - 0.5) * 2, ease: 'power1.in' });
        } else {
            if(orderTitle) orderTitle.style.display = 'none';
            if(orderSubtitle) orderSubtitle.style.display = 'none';
        }
      },
    });
    
    return () => scrollTrigger.kill();
  }, []);

  return (
    <section ref={sectionRef} className="chaos-section">
      <div className="sticky-container">
        <canvas ref={canvasRef} className="three-canvas" />
        <div ref={containerRef} className="cards-container">
          {eventsData.map((event, index) => (
            <AnimatedEventCard key={index} event={event} index={index} />
          ))}
        </div>
        <div className="text-overlay-container">
          <h2 className="chaos-title">The Problem: Information Chaos</h2>
          <p className="chaos-subtitle">Events scattered across Twitter, Discord, Email, Slack...</p>
          <h2 className="order-title">The Solution: Perfect Order</h2>
          <p className="order-subtitle">Everything organized. Nothing missed. Your time saved.</p>
        </div>
      </div>
    </section>
  );
}