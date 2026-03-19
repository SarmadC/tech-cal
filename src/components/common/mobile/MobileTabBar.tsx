'use client';

import type { ElementType } from 'react';
import { cn } from '@/lib/utils';

export interface MobileTabBarItem {
    name: string;
    href: string;
    icon: ElementType;
    active: boolean;
}

interface MobileTabBarProps {
    items: MobileTabBarItem[];
    onSelect: (href: string) => void;
    className?: string;
}

export default function MobileTabBar({ items, onSelect, className }: MobileTabBarProps) {
    return (
        <div className="mobile-tabbar-wrap">
            <nav className={cn('mobile-tabbar', className)} aria-label="Primary navigation">
                {items.map((item) => (
                    <button
                        key={item.name}
                        type="button"
                        onClick={() => onSelect(item.href)}
                        className="mobile-tabbar__item"
                        data-active={item.active}
                        aria-current={item.active ? 'page' : undefined}
                    >
                        <item.icon size={22} weight={item.active ? 'fill' : 'regular'} />
                        <span className="mobile-tabbar__label">{item.name}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
