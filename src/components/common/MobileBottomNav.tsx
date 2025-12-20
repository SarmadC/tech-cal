'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { House, Compass, CalendarBlank, SquaresFour, Ticket } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

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
        { name: 'Events', href: '/events', icon: Ticket },
        { name: 'Dashboard', href: '/dashboard', icon: SquaresFour },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#000000] border-t border-white/10 pb-safe md:hidden">
            <div className="flex justify-around items-center h-[60px] px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

                    return (
                        <button
                            key={item.name}
                            onClick={() => router.push(item.href)}
                            className="flex flex-col items-center justify-center w-full h-full gap-1"
                        >
                            <div className={cn(
                                "flex items-center justify-center transition-colors duration-200",
                                isActive ? "text-[#22c55e]" : "text-gray-500 hover:text-gray-300"
                            )}>
                                <item.icon size={24} weight={isActive ? "bold" : "regular"} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium transition-colors duration-200",
                                isActive ? "text-[#22c55e]" : "text-gray-500"
                            )}>
                                {item.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileBottomNav;
