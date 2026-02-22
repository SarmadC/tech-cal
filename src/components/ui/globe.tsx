'use client';

import createGlobe from 'cobe';
import { useEffect, useRef } from 'react';
import { useSpring } from 'react-spring';

interface GlobeProps {
    className?: string;
    locations: {
        lat: number;
        lng: number;
        size?: number;
    }[];
    focusOn?: { lat: number; lng: number } | null;
}

export function Globe({ className, locations, focusOn }: GlobeProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointerInteracting = useRef<number | null>(null);
    const pointerInteractionMovement = useRef(0);
    const [{ r }, api] = useSpring(() => ({
        r: 0,
        config: {
            mass: 1,
            tension: 280,
            friction: 40,
            precision: 0.001,
        },
    }));

    const focusRef = useRef<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        focusRef.current = focusOn || null;
    }, [focusOn]);

    useEffect(() => {
        let phi = 0;
        let width = 0;
        const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth);
        window.addEventListener('resize', onResize);
        onResize();
        const globe = createGlobe(canvasRef.current!, {
            devicePixelRatio: 2,
            width: width * 2,
            height: width * 2,
            phi: 0,
            theta: 0.3,
            dark: 1,
            diffuse: 0.4,
            mapSamples: 16000,
            mapBrightness: 1.2,
            baseColor: [0.3, 0.3, 0.3],
            markerColor: [0.1, 0.8, 1],
            glowColor: [0.1, 0.1, 0.2],
            markers: locations.map(loc => ({
                location: [loc.lat, loc.lng],
                size: loc.size || 0.05
            })),
            onRender: (state) => {
                if (!pointerInteracting.current) {
                    if (focusRef.current) {
                        const targetPhi = -(focusRef.current.lng * Math.PI) / 180 - Math.PI / 2;
                        const dist = targetPhi - phi;
                        // Shortest path logic
                        const shortestDist = ((dist + Math.PI) % (2 * Math.PI)) - Math.PI;
                        phi += shortestDist * 0.05; // Smooth ease to target
                    } else {
                        phi += 0.005; // Auto rotate
                    }
                }
                state.phi = phi + r.get();
                state.width = width * 2;
                state.height = width * 2;
            },
        });
        setTimeout(() => (canvasRef.current!.style.opacity = '1'));
        return () => {
            globe.destroy();
            window.removeEventListener('resize', onResize);
        };
    }, [locations, r]);

    return (
        <div
            style={{
                width: '100%',
                maxWidth: 600,
                aspectRatio: 1,
                margin: 'auto',
                position: 'relative',
            }}
            className={className}
        >
            <canvas
                ref={canvasRef}
                onPointerDown={(e) => {
                    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
                    canvasRef.current!.style.cursor = 'grabbing';
                }}
                onPointerUp={() => {
                    pointerInteracting.current = null;
                    canvasRef.current!.style.cursor = 'grab';
                }}
                onPointerOut={() => {
                    pointerInteracting.current = null;
                    canvasRef.current!.style.cursor = 'grab';
                }}
                onMouseMove={(e) => {
                    if (pointerInteracting.current !== null) {
                        const delta = e.clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta;
                        api.start({
                            r: delta / 200,
                        });
                    }
                }}
                onTouchMove={(e) => {
                    if (pointerInteracting.current !== null && e.touches[0]) {
                        const delta = e.touches[0].clientX - pointerInteracting.current;
                        pointerInteractionMovement.current = delta;
                        api.start({
                            r: delta / 100,
                        });
                    }
                }}
                style={{
                    width: '100%',
                    height: '100%',
                    cursor: 'grab',
                    contain: 'layout paint size',
                    opacity: 0,
                    transition: 'opacity 1s ease',
                }}
            />
        </div>
    );
}
