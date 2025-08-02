// src/components/calendar/CalendarHeader.tsx
'use client';

import { FC } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

type CalendarViewType = 'month' | 'week' | 'day';

export interface CalendarHeaderProps {
    currentDate: Date;
    view: CalendarViewType;
    onNavigate: (dir: 'prev' | 'next' | 'today') => void;
    onChangeView: (view: CalendarViewType) => void;
}

const CalendarHeader: FC<CalendarHeaderProps> = ({ currentDate, view, onNavigate, onChangeView }) => {
    const { signOut } = useAuth(); // Get signOut function

    return (
        <header className="h-20 flex-shrink-0 px-6 flex items-center justify-between border-b border-gray-800">
            {/* vvv NEW: Dashboard Link vvv */}
            <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg" title="Go to Dashboard">
                    <LayoutDashboard className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-semibold text-white">
                    {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </h1>
            </div>
            {/* ^^^ END NEW ^^^ */}

            <div className="flex items-center space-x-4">
                <div className="flex items-center bg-gray-800 rounded-lg">
                    {(['month', 'week', 'day'] as CalendarViewType[]).map(v => (
                        <button
                            key={v}
                            onClick={() => onChangeView(v)}
                            className={`px-4 py-2 text-sm rounded-md transition-colors capitalize ${view === v ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => onNavigate('prev')} className="p-2 hover:bg-gray-800 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => onNavigate('today')} className="text-sm px-3 py-1.5 border border-gray-700 rounded-lg hover:bg-gray-800">Today</button>
                    <button onClick={() => onNavigate('next')} className="p-2 hover:bg-gray-800 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
                </div>
                {/* vvv NEW: Sign Out Button (optional but good UX) vvv */}
                <button onClick={signOut} className="text-sm px-3 py-1.5 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/20">
                    Sign Out
                </button>
            </div>
        </header>
    );
};

export default CalendarHeader;