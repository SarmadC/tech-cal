// src/components/calendar/CalendarSidebar.tsx
'use client';

import { FC } from 'react';
import { AppEvent, AppEventType } from '@/types';
import MiniCalendar from './MiniCalendar'; // Import the new component

interface SidebarProps {
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    categories: AppEventType[];
    selectedCategories: Set<string>;
    setSelectedCategories: (categories: Set<string>) => void;
    nextUpcomingEvent?: AppEvent;
    user: { name: string; role: string };
    events: AppEvent[];
}

const CalendarSidebar: FC<SidebarProps> = ({
    currentDate,
    setCurrentDate,
    categories,
    selectedCategories,
    setSelectedCategories,
    nextUpcomingEvent,
    user,
    events,
}) => {
    // ... (All the code from the original Sidebar component)
    const handleCategoryChange = (categoryId: string) => {
        const newSet = new Set(selectedCategories);
        if (newSet.has(categoryId)) {
            newSet.delete(categoryId);
        } else {
            newSet.add(categoryId);
        }
        setSelectedCategories(newSet);
    };

    return (
        <aside className="w-80 bg-[#1e1e1e] border-r border-gray-800 p-6 flex flex-col space-y-6">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center font-bold text-white">
                    {user.name.charAt(0)}
                </div>
                <div>
                    <p className="font-semibold text-white">{user.name}</p>
                    <p className="text-sm text-gray-400">{user.role}</p>
                </div>
            </div>

            <MiniCalendar date={currentDate} setDate={setCurrentDate} events={events} currentDate={currentDate} />

            {nextUpcomingEvent && (
                <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">
                        {new Date(nextUpcomingEvent.startTime).toLocaleString('en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <h4 className="font-semibold text-white mb-1">{nextUpcomingEvent.title}</h4>
                    <p className="text-sm text-gray-400">{nextUpcomingEvent.location}</p>
                    <div className="flex space-x-2 mt-3">
                        <button className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md">Details</button>
                        <button className="text-sm bg-gray-900 hover:bg-black px-3 py-1 rounded-md">Later</button>
                    </div>
                </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto">
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Filter by Category</h3>
                    <div className="space-y-2">
                        {categories.map(cat => (
                            <label key={cat.id} className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.has(cat.id)}
                                    onChange={() => handleCategoryChange(cat.id)}
                                    className="form-checkbox bg-gray-700 border-gray-600 rounded"
                                    style={{ accentColor: cat.color }}
                                />
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                <span className="text-sm">{cat.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
};
export default CalendarSidebar;