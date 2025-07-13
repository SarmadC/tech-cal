// src/components/MainNavbar.tsx

import { User } from 'lucide-react';
export default function MainNavbar() {
  return (
    <nav className="h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-50 shadow-sm">
      <div className="flex items-center gap-8">
        <div className="text-xl font-bold text-blue-600">TechCalendar</div>
        <div className="hidden lg:flex items-center gap-6">
          <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Events</a>
          <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Calendar</a>
          <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Resources</a>
          <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <User className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </nav>
  );
}