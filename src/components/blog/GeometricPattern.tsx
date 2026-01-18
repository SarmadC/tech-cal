
'use client';

import { useMemo } from 'react';

type GeometricPatternProps = {
    variant?: 'blue' | 'orange' | 'green' | 'purple' | 'mixed';
    className?: string;
};

export default function GeometricPattern({ variant = 'mixed', className = '' }: GeometricPatternProps) {
    // Deterministic geometric shapes based on variant to create that "Linear/SaaS" abstract look
    // We'll use SVGs with random-looking but fixed shapes

    const colors = useMemo(() => {
        switch (variant) {
            case 'blue': return ['#3B82F6', '#1E40AF', '#60A5FA'];
            case 'orange': return ['#F97316', '#C2410C', '#FB923C'];
            case 'green': return ['#10B981', '#047857', '#34D399'];
            case 'purple': return ['#8B5CF6', '#5B21B6', '#A78BFA'];
            default: return ['#3B82F6', '#F97316', '#10B981']; // Mixed
        }
    }, [variant]);

    return (
        <div className={`w-full h-full overflow-hidden bg-zinc-900 relative ${className}`}>
            <svg
                viewBox="0 0 400 300"
                preserveAspectRatio="xMidYMid slice"
                className="w-full h-full opacity-90"
            >
                <rect width="100%" height="100%" fill="#18181b" />

                {variant === 'mixed' && (
                    <>
                        <circle cx="50" cy="50" r="100" fill={colors[0]} fillOpacity="0.2" />
                        <path d="M 300 0 L 400 0 L 400 100 Z" fill={colors[1]} fillOpacity="0.3" />
                        <rect x="250" y="150" width="100" height="100" rx="20" fill={colors[2]} fillOpacity="0.2" transform="rotate(20 300 200)" />
                        <circle cx="350" cy="250" r="60" stroke={colors[0]} strokeWidth="2" fill="none" />
                        <path d="M 0 200 Q 100 250 200 200 T 400 200" stroke={colors[1]} strokeWidth="2" fill="none" />
                    </>
                )}

                {variant === 'blue' && (
                    <>
                        <rect x="0" y="0" width="100" height="300" fill={colors[0]} fillOpacity="0.1" />
                        <rect x="50" y="50" width="300" height="50" fill={colors[1]} fillOpacity="0.2" />
                        <circle cx="300" cy="200" r="80" fill={colors[2]} fillOpacity="0.15" />
                        <rect x="20" y="200" width="80" height="80" stroke={colors[0]} strokeWidth="2" fill="none" />
                    </>
                )}

                {variant === 'orange' && (
                    <>
                        <path d="M 0 0 L 400 300 L 0 300 Z" fill={colors[0]} fillOpacity="0.15" />
                        <circle cx="200" cy="150" r="120" fill={colors[1]} fillOpacity="0.1" />
                        <path d="M 300 50 L 350 150 L 250 150 Z" fill={colors[2]} fillOpacity="0.3" />
                    </>
                )}

                {variant === 'purple' && (
                    <>
                        <rect x="100" y="0" width="200" height="300" fill={colors[0]} fillOpacity="0.1" transform="rotate(45 200 150)" />
                        <circle cx="100" cy="250" r="50" fill={colors[1]} fillOpacity="0.2" />
                        <circle cx="300" cy="50" r="70" stroke={colors[2]} strokeWidth="3" fill="none" />
                    </>
                )}

                {variant === 'green' && (
                    <>
                        <path d="M0,150 C100,50 300,250 400,150" stroke={colors[0]} strokeWidth="120" strokeOpacity="0.1" fill="none" />
                        <circle cx="350" cy="50" r="40" fill={colors[1]} fillOpacity="0.3" />
                        <rect x="50" y="200" width="60" height="60" fill={colors[2]} fillOpacity="0.2" transform="rotate(-15 80 230)" />
                    </>
                )}
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/50 to-transparent" />
        </div>
    );
}
