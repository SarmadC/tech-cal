'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TechCalendarDayView } from '@/components/calendar/TechCalendarDayView';
import type { AppEvent } from '@/types';

interface DayViewClientWrapperProps {
    initialEvents: AppEvent[];
    initialDate: Date;
}

export function DayViewClientWrapper({ initialEvents, initialDate }: DayViewClientWrapperProps) {
    const router = useRouter();
    // Re-hydrate the date string from the server into a proper Date object
    const [currentDate] = useState(() => new Date(initialDate));

    const formatDateForURL = (date: Date) => date.toISOString().split('T')[0];

    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
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