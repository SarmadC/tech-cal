'use client';

import { FC } from 'react';
import { UsersIcon } from '@phosphor-icons/react';
import { Event, Speaker } from '@/types';
import { getSpeakerAvatarUrl } from '@/services/avatarService';

interface SpeakerShowcaseProps {
    event: Event;
}

const SpeakerShowcase: FC<SpeakerShowcaseProps> = ({ event }) => {
    // Get all speakers from both event.speakerLineup and agenda items
    const getAllSpeakers = (): Speaker[] => {
        const speakerMap = new Map<string, Speaker>();
        
        // Add speakers from event lineup
        if (event.speakerLineup) {
            event.speakerLineup.forEach(speaker => {
                speakerMap.set(speaker.id, speaker);
            });
        }
        
        // Add speakers from agenda items (support both speaker and speakers[])
        if (event.agenda) {
            event.agenda.forEach(item => {
                if (item.speaker) speakerMap.set(item.speaker.id, item.speaker);
                if (Array.isArray(item.speakers)) {
                    item.speakers.forEach(sp => speakerMap.set(sp.id, sp));
                }
            });
        }
        
        return Array.from(speakerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    };
    
    const speakers = getAllSpeakers();
    
    if (speakers.length === 0) {
        return null;
    }
    
    const handleSpeakerClick = (speaker: Speaker) => {
        if (speaker.socialLinks?.linkedin) {
            window.open(speaker.socialLinks.linkedin, '_blank', 'noopener,noreferrer');
        }
    };
    
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-gray-300" />
                <h3 className="text-lg font-semibold text-white">
                    Speakers ({speakers.length})
                </h3>
            </div>
            
            {/* Speaker Avatars */}
            <div className="flex flex-wrap items-center gap-3">
                {speakers.map((speaker) => {
                    const avatarUrl = getSpeakerAvatarUrl(speaker, 36); // 36px for small avatars
                    const clickable = Boolean(speaker.socialLinks?.linkedin);
                    return (
                        <div key={speaker.id} className="flex items-center gap-2">
                            <button
                                onClick={() => clickable && handleSpeakerClick(speaker)}
                                disabled={!clickable}
                                title={clickable ? 'Open LinkedIn profile' : speaker.name}
                                className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border ${
                                    clickable ? 'border-blue-400 hover:ring-2 hover:ring-blue-500/40' : 'border-gray-600'
                                } ${clickable ? '' : 'cursor-default'}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={avatarUrl} 
                                    alt={speaker.name} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                        // Fallback to initials if image fails to load
                                        const target = e.currentTarget as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                    }}
                                />
                                <span 
                                    className="text-xs font-semibold text-gray-200 absolute inset-0 flex items-center justify-center"
                                    style={{ display: 'none' }}
                                >
                                    {speaker.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                            </button>
                            <span className="text-sm text-gray-300">{speaker.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SpeakerShowcase;