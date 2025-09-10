// src/components/calendar/EventHeader.tsx
'use client';

import { FC } from 'react';
import { XIcon } from '@phosphor-icons/react';

interface EventHeaderProps {
    onClose: () => void;
}

export const EventHeader: FC<EventHeaderProps> = ({ onClose }) => {
    return (
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Event Details</h2>
            <button
                onClick={onClose}
                className="p-1 hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Close event details"
            >
                <XIcon className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
        </div>
    );
};

export default EventHeader;