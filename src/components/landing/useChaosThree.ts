import { useEffect, RefObject, MutableRefObject } from 'react';
import * as THREE from 'three';
import { debounce } from '@/utils/debounce';

/**
 * Hook: Manages the Three.js scene and particle animation.
 * Moved here to isolate 'three' dependency.
 */
export function useThreeScene(
    canvasRef: RefObject<HTMLCanvasElement | null>,
    scrollProgressRef: MutableRefObject<number>
) {
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current!; // ! assertion because check above

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0f172a, 10, 50);

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 20);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 800;
        const positions = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i += 3) {
            const radius = 25 + Math.random() * 25;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi);
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: false,
            transparent: true,
            opacity: 0.6,
            color: 0x6366f1,
            blending: THREE.AdditiveBlending
        });
        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particles);

        let animationFrameId: number;
        const animate = (time: number) => {
            const t = time * 0.001;
            const chaosFactor = 1 - scrollProgressRef.current;

            particles.rotation.y = t * 0.03 * chaosFactor;
            particles.material.opacity = 0.2 + chaosFactor * 0.4;

            camera.position.z = 20 - scrollProgressRef.current * 10;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        };
        animate(0);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        const debouncedHandleResize = debounce(handleResize, 150);
        window.addEventListener('resize', debouncedHandleResize);

        return () => {
            window.removeEventListener('resize', debouncedHandleResize);
            cancelAnimationFrame(animationFrameId);
            particlesGeometry.dispose();
            particlesMaterial.dispose();
            renderer.dispose();
        };
    }, [canvasRef, scrollProgressRef]);
}
