'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, CalendarBlank, SquaresFour, UsersThree } from '@phosphor-icons/react';
import MobileTabBar, { MobileTabBarItem } from '@/components/common/mobile/MobileTabBar';

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
}

const MobileBottomNav = () => {
    const pathname = usePathname();
    const router = useRouter();

    const navItems: NavItem[] = [
        { name: 'Discover', href: '/discover', icon: Compass },
        { name: 'Calendar', href: '/calendar', icon: CalendarBlank },
        { name: 'Community', href: '/community', icon: UsersThree },
        { name: 'Dashboard', href: '/dashboard', icon: SquaresFour },
    ];

    const items: MobileTabBarItem[] = navItems.map((item) => ({
        ...item,
        active: pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href)),
    }));

    return (
        <div className="md:hidden">
            <MobileTabBar items={items} onSelect={(href) => router.push(href)} />
        </div>
    );
};

export default MobileBottomNav;
