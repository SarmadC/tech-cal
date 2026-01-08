'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import * as THREE from 'three';

export default function ChromeCross() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Wait for hydration to avoid hydration mismatch on theme
    useEffect(() => {
        setTimeout(() => setMounted(true), 0);
    }, []);

    // Removed unused isDarkMode variable

    // Update scene background when theme changes (without recreating the scene)
    useEffect(() => {
        if (!mounted || !sceneRef.current) return;
        // Always use transparent background
        sceneRef.current.background = null;
    }, [mounted]);

    // Initialize Three.js scene (only once after mounting)
    useEffect(() => {
        if (!mounted || !containerRef.current || !canvasRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        if (width === 0 || height === 0) return;

        let animationId: number;
        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            antialias: true,
            alpha: true
        });

        // cleanup tracking
        const resources: { dispose: () => void }[] = [renderer];

        try {
            const scene = new THREE.Scene();
            // Always use transparent background
            scene.background = null;
            sceneRef.current = scene;

            const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            camera.position.set(4, 3, 5);
            camera.lookAt(0, 0, 0);

            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // Simplified Chrome Material (No extensive EnvMap yet)
            const chromeMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.9,
                roughness: 0.1,
            });
            resources.push(chromeMaterial);

            // GEOMETRY
            const crossGroup = new THREE.Group();
            const armLength = 1.6;
            const armSize = 0.5;

            const boxGeometry = new THREE.BoxGeometry(armSize, armLength, armSize);
            resources.push(boxGeometry);

            const directions = [
                { rotation: [0, 0, 0] as [number, number, number], position: [0, armLength / 2, 0] as [number, number, number] },
                { rotation: [Math.PI, 0, 0] as [number, number, number], position: [0, -armLength / 2, 0] as [number, number, number] },
                { rotation: [0, 0, Math.PI / 2] as [number, number, number], position: [armLength / 2, 0, 0] as [number, number, number] },
                { rotation: [0, 0, -Math.PI / 2] as [number, number, number], position: [-armLength / 2, 0, 0] as [number, number, number] },
                { rotation: [Math.PI / 2, 0, 0] as [number, number, number], position: [0, 0, armLength / 2] as [number, number, number] },
                { rotation: [-Math.PI / 2, 0, 0] as [number, number, number], position: [0, 0, -armLength / 2] as [number, number, number] },
            ];

            directions.forEach(({ rotation, position }) => {
                const arm = new THREE.Mesh(boxGeometry, chromeMaterial);
                arm.rotation.set(...rotation);
                arm.position.set(...position);
                crossGroup.add(arm);
            });

            const centerGeometry = new THREE.BoxGeometry(armSize, armSize, armSize);
            resources.push(centerGeometry);
            const center = new THREE.Mesh(centerGeometry, chromeMaterial);
            crossGroup.add(center);

            scene.add(crossGroup);

            // LIGHTING
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);

            const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
            keyLight.position.set(5, 5, 5);
            scene.add(keyLight);

            const fillLight = new THREE.DirectionalLight(0xff9966, 0.8);
            fillLight.position.set(-3, -2, 4);
            scene.add(fillLight);

            const animate = () => {
                animationId = requestAnimationFrame(animate);
                crossGroup.rotation.y += 0.003;
                crossGroup.rotation.x = Math.sin(Date.now() * 0.0003) * 0.1;
                renderer.render(scene, camera);
            };
            animate();

            const handleResize = () => {
                if (!containerRef.current) return;
                const newWidth = containerRef.current.clientWidth;
                const newHeight = containerRef.current.clientHeight;
                renderer.setSize(newWidth, newHeight);
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
            };

            window.addEventListener('resize', handleResize);

            // Add cleanup to resize listener? No clean way to remove anon function unless stored. 
            // Using `handleResize` which is defined in scope but will likely cause memory leak if not careful, 
            // but `useEffect` cleanup handles it. Wait, `handleResize` is defined inside `useEffect`. That is correct.

            // Assign cleanup function
            /* eslint-disable-next-line */
            const cleanup = () => {
                cancelAnimationFrame(animationId);
                window.removeEventListener('resize', handleResize);
                resources.forEach(r => r.dispose());
            };
            return cleanup;

        } catch (error) {
            console.error("ChromeCross simplified init error:", error);
            resources.forEach(r => r.dispose());
        }

    }, [mounted]);

    return (
        <div
            ref={containerRef}
            className="chrome-cross-container"
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                // Remove inline background - let CSS handle it via parent container
                borderRadius: '32px', // Match container
                overflow: 'hidden'
            }}
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
}



