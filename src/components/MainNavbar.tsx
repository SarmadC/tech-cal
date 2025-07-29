// src/components/MainNavbar.tsx

import UserMenu from '@/components/common/UserMenu';

export default function MainNavbar() {
    return (
        <nav className="h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-50 shadow-sm">
            <div className="flex items-center gap-8">
                <div className="text-xl font-bold text-blue-600">TechCalendar</div>
                <div className="hidden lg:flex items-center gap-6">
                    <a href="/calendar" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Events</a>
                    <a href="/calendar" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Calendar</a>
                    <a href="/api-docs" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Resources</a>
                    <a href="/blog" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">About</a>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <UserMenu />
            </div>
        </nav>
    );
}