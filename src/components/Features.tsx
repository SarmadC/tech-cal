'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { 
  Filter, 
  SatelliteDish, 
  Link as LinkIcon, 
  Code2, 
  BarChart3, 
  Users,
  Calendar,
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Zap
} from 'lucide-react';

const features = [
  {
    id: 'chaos',
    icon: <Bell />,
    title: 'The Overwhelming Reality',
    subtitle: 'Your current day',
    description: 'Notifications from Slack, emails about events, calendar invites, Twitter announcements, Discord pings, newsletter updates...',
    problem: true
  },
  {
    id: 'filtering',
    icon: <Filter />,
    title: 'Smart Filtering',
    subtitle: 'AI learns your interests',
    description: 'Our AI learns what matters to you. See ML breakthroughs, skip crypto hype. Your feed, your rules.',
    color: '#8B5CF6'
  },
  {
    id: 'realtime',
    icon: <SatelliteDish />,
    title: 'Real-time Intelligence',
    subtitle: 'Never miss updates',
    description: 'Schedule changes, surprise announcements, livestream links. We monitor 500+ sources so you don\'t have to.',
    color: '#06B6D4'
  },
  {
    id: 'integration',
    icon: <LinkIcon />,
    title: 'Seamless Integration',
    subtitle: 'One calendar to rule them all',
    description: 'Syncs with Google Calendar, Outlook, Apple Calendar. One-click to add events with all the details.',
    color: '#10B981'
  },
  {
    id: 'analytics',
    icon: <BarChart3 />,
    title: 'Intelligent Insights',
    subtitle: 'Data-driven decisions',
    description: 'Track which events matter most to your industry. See trending topics and attendance insights.',
    color: '#F59E0B'
  },
  {
    id: 'collaboration',
    icon: <Users />,
    title: 'Team Harmony',
    subtitle: 'Coordinate effortlessly',
    description: 'Share calendars with your team. Coordinate attendance and never double-book important events.',
    color: '#EF4444'
  }
];

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  originalPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  type: string;
  mesh?: THREE.Mesh;
}

export default function Features() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Fixed: Proper TypeScript typing for Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Create particles
    createParticles();

    // Handle resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  const createParticles = () => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const particles: Particle[] = [];

    // Create notification particles
    const notificationTypes = ['email', 'slack', 'calendar', 'twitter', 'discord', 'newsletter'];
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3];

    for (let i = 0; i < 150; i++) {
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material = new THREE.MeshBasicMaterial({ 
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.8
      });
      const mesh = new THREE.Mesh(geometry, material);

      const particle: Particle = {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 20
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 1
        ),
        originalPosition: new THREE.Vector3(),
        targetPosition: new THREE.Vector3(),
        color: new THREE.Color(colors[i % colors.length]),
        scale: Math.random() * 0.5 + 0.5,
        type: notificationTypes[i % notificationTypes.length],
        mesh
      };

      particle.originalPosition.copy(particle.position);
      mesh.position.copy(particle.position);
      mesh.scale.setScalar(particle.scale);
      
      scene.add(mesh);
      particles.push(particle);
    }

    particlesRef.current = particles;
  };

  const animateParticles = (progress: number, featureIndex: number) => {
    if (!particlesRef.current.length) return;

    particlesRef.current.forEach((particle, i) => {
      if (!particle.mesh) return;

      if (featureIndex === 0) {
        // Chaos mode - random movement
        particle.position.add(particle.velocity);
        
        // Bounce off boundaries
        if (Math.abs(particle.position.x) > 40) particle.velocity.x *= -1;
        if (Math.abs(particle.position.y) > 20) particle.velocity.y *= -1;
        if (Math.abs(particle.position.z) > 10) particle.velocity.z *= -1;

        particle.mesh.position.copy(particle.position);
        particle.mesh.rotation.x += 0.02;
        particle.mesh.rotation.y += 0.02;
      } else if (featureIndex === 1) {
        // Filtering - some particles fade out, others organize
        const shouldFilter = i % 3 === 0;
        if (shouldFilter) {
          (particle.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 1 - progress);
        } else {
          particle.targetPosition.set(
            Math.sin(i * 0.5) * 15,
            Math.cos(i * 0.3) * 10,
            0
          );
          particle.mesh.position.lerp(particle.targetPosition, progress * 0.05);
        }
      } else if (featureIndex === 2) {
        // Real-time - flowing movement
        const time = Date.now() * 0.001;
        particle.targetPosition.set(
          Math.sin(time + i * 0.1) * 20,
          Math.sin(time * 0.5 + i * 0.05) * 15,
          Math.cos(time + i * 0.1) * 5
        );
        particle.mesh.position.lerp(particle.targetPosition, 0.02);
      } else if (featureIndex === 3) {
        // Integration - forming calendar grid
        const cols = 12;
        const spacing = 3;
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        particle.targetPosition.set(
          (col - cols/2) * spacing,
          (row - 6) * spacing,
          0
        );
        particle.mesh.position.lerp(particle.targetPosition, progress * 0.03);
      } else if (featureIndex === 4) {
        // Analytics - forming chart patterns
        const height = Math.sin(i * 0.2) * 10 + 5;
        particle.targetPosition.set(
          (i % 20 - 10) * 2,
          height,
          0
        );
        particle.mesh.position.lerp(particle.targetPosition, progress * 0.04);
      } else if (featureIndex === 5) {
        // Collaboration - forming team clusters
        const clusters = 6;
        const clusterId = i % clusters;
        const angle = (clusterId / clusters) * Math.PI * 2;
        const radius = 8 + Math.sin(Date.now() * 0.001 + clusterId) * 2;
        
        particle.targetPosition.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          (Math.random() - 0.5) * 5
        );
        particle.mesh.position.lerp(particle.targetPosition, 0.02);
      }
    });
  };

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      // Animate particles based on current feature
      animateParticles(1, currentFeature);

      // Render
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    if (isVisible) {
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentFeature, isVisible]);

  // Intersection observer for visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Scroll-based feature progression
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)));
      const newFeatureIndex = Math.min(features.length - 1, Math.floor(progress * features.length));
      
      setCurrentFeature(newFeatureIndex);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full min-h-[400vh] bg-black overflow-hidden" id="features">
      {/* WebGL Canvas */}
      <canvas 
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-10"
      />
      
      {/* Feature Content */}
      <div className="relative z-20 min-h-screen">
        {features.map((feature, index) => (
          <div 
            key={feature.id}
            className={`
              sticky top-0 h-screen flex items-center justify-center px-8
              transition-all duration-1000 ease-out
              ${currentFeature === index ? 'opacity-100' : 'opacity-30'}
            `}
          >
            <div className="max-w-4xl mx-auto text-center">
              <div 
                className={`
                  inline-flex items-center justify-center w-24 h-24 rounded-full mb-8
                  transition-all duration-1000 ease-out transform
                  ${currentFeature === index ? 'scale-110' : 'scale-100'}
                `}
                style={{ 
                  backgroundColor: feature.problem ? '#ff4444' : feature.color,
                  boxShadow: currentFeature === index ? `0 0 60px ${feature.problem ? '#ff4444' : feature.color}40` : 'none'
                }}
              >
                <div className="text-white text-3xl">
                  {feature.icon}
                </div>
              </div>
              
              <h3 className="text-5xl font-bold text-white mb-4 tracking-tight">
                {feature.title}
              </h3>
              
              <p className="text-xl text-gray-300 mb-6 font-medium">
                {feature.subtitle}
              </p>
              
              <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
                {feature.description}
              </p>

              {feature.problem && currentFeature === index && (
                <div className="mt-12 text-red-400 animate-pulse">
                  <p className="text-sm uppercase tracking-wider">Sound familiar?</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Indicator */}
      <div className="fixed left-8 top-1/2 transform -translate-y-1/2 z-30">
        <div className="flex flex-col space-y-4">
          {features.map((_, index) => (
            <div
              key={index}
              className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${currentFeature === index 
                  ? 'bg-white scale-150 shadow-lg' 
                  : 'bg-gray-600 hover:bg-gray-400 cursor-pointer'
                }
              `}
              onClick={() => setCurrentFeature(index)}
            />
          ))}
        </div>
      </div>

      {/* Feature Labels */}
      <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-30">
        <div className="text-right">
          <div className="text-sm text-gray-500 uppercase tracking-wider mb-2">
            {String(currentFeature + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
          </div>
          <div className="text-white font-semibold">
            {features[currentFeature]?.title}
          </div>
        </div>
      </div>
    </div>
  );
}