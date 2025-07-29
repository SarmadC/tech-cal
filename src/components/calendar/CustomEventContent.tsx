// src/components/calendar/CustomEventContent.tsx
'use client';

import { FC } from 'react';
import { EventContentArg } from '@fullcalendar/core';
import { AppEvent } from '@/types';

const CustomEventContent: FC<EventContentArg> = ({ event }) => {
    const { title, extendedProps } = event;
    const { color, startTime, endTime } = extendedProps as AppEvent;

    const formatTime = (time: string) => new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    return (
        <div className="p-1 h-full w-full">
            <div
                className="p-2 h-full w-full flex flex-col text-white rounded-lg"
                style={{ backgroundColor: color }}
            >
                <div className="flex-grow overflow-hidden">
                    <p className="font-bold text-sm text-white break-words">{title}</p>
                    <p className="text-xs opacity-90 mt-1 text-white/80">
                        {formatTime(startTime)} - {endTime ? formatTime(endTime) : ''}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CustomEventContent;