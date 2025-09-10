'use client';

import React from 'react';

type OrbitingCirclesProps = {
    className?: string;
    children: React.ReactNode;
    reverse?: boolean;
    duration?: number; // seconds
    delay?: number; // seconds
    radius?: number; // px
    path?: boolean;
    iconSize?: number; // px
    speed?: number; // multiplier
};

type CSSVars = React.CSSProperties & {
    ['--duration']?: string;
    ['--radius']?: string;
    ['--delay']?: string;
    ['--angle']?: string;
    ['--icon-size']?: string;
};

export function OrbitingCircles({
    className,
    children,
    reverse = false,
    duration = 20,
    delay = 0,
    radius = 160,
    path = true,
    iconSize = 30,
    speed = 1,
}: OrbitingCirclesProps) {
    const items = React.Children.toArray(children);
    const total = items.length || 1;

    const rootStyle: CSSVars = {
        ['--duration']: String(duration / Math.max(speed, 0.001)),
        ['--radius']: String(radius),
        ['--delay']: String(delay),
    };

    return (
        <div className={["orbit-root", reverse ? "orbit-reverse" : "", className || ""].join(" ")} style={rootStyle}>
            {path && <div className="orbit-path" aria-hidden="true" />}
            {items.map((child, index) => {
                const angle = (360 / total) * index;
                const itemStyle: CSSVars = {
                    ['--angle']: String(angle),
                    ['--icon-size']: `${iconSize}px`,
                };
                return (
                    <div className="orbiting" style={itemStyle} key={index}>
                        <div className="orbit-icon" aria-hidden="true">
                            {child}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default OrbitingCircles;


