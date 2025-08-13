'use client';

import { useRouter } from 'next/navigation';
import { TechCalendarDayView } from '@/components/calendar/TechCalendarDayView';
import type { AppEvent } from '@/types';

interface DayViewClientWrapperProps {
    initialEvents: AppEvent[];
    initialDate: Date;
}

export function DayViewClientWrapper({ initialEvents, initialDate }: DayViewClientWrapperProps) {
    const router = useRouter();

    // FIX: Use the prop directly instead of storing in state
    // This ensures the component always uses the latest date from the server
    const currentDate = new Date(initialDate);

    const formatDateForURL = (date: Date) => date.toISOString().split('T')[0];

    const handleNavigate = (direction: 'prev' | 'next') => {
        // Calculate new date based on the current prop, not stale state
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));

        // Use router.push to trigger server-side re-render with new date
        router.push(`/calendar?view=day&date=${formatDateForURL(newDate)}`);
    };

    return (
        <TechCalendarDayView
            events={initialEvents}
            date={currentDate}
            onPrevDay={() => handleNavigate('prev')}
            onNextDay={() => handleNavigate('next')}
        />
    );
}