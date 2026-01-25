'use client';

import React, { useState, useEffect } from 'react';
import { User, UsersThree, Check } from '@phosphor-icons/react';
import { LEVELS_BY_TRACK, type ExperienceLevel } from '@/types/career';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileExperienceLevelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    className?: string;
}

export function MobileExperienceLevelSelector({
    value,
    onChange,
    error,
    className
}: MobileExperienceLevelSelectorProps) {
    const [track, setTrack] = useState<'ic' | 'management' | null>('ic');

    const visibleLevels = track ? LEVELS_BY_TRACK[track] : [];

    useEffect(() => {
        if (value) {
            const level = [...LEVELS_BY_TRACK.ic, ...LEVELS_BY_TRACK.management].find(l => l.value === value);
            if (level) {
                const inferredTrack = LEVELS_BY_TRACK.ic.includes(level) ? 'ic' : 'management';
                setTrack(inferredTrack);
            }
        }
    }, [value]);

    const handleLevelChange = (levelValue: string) => {
        onChange(levelValue);
    };

    const onTrackChange = (newTrack: 'ic' | 'management') => {
        setTrack(newTrack);
    };

    return (
        <div className={twMerge("space-y-6", className)}>
            <div className="space-y-4">
                <label className="text-[13px] font-medium text-[#E3E3E3] flex items-center">
                    Experience Level <span className="text-red-500 ml-1">*</span>
                </label>

                {/* Tab Selector (Reverted to Linear Clean Style) */}
                <div className="flex border-b border-[#2E2F33]">
                    <button
                        type="button"
                        onClick={() => onTrackChange('ic')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-all relative",
                            track === 'ic' ? "text-white" : "text-[#8A8F98] hover:text-[#E3E3E3]"
                        )}
                    >
                        <User size={16} weight={track === 'ic' ? "fill" : "regular"} />
                        Individual Contributor
                        {track === 'ic' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => onTrackChange('management')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-all relative",
                            track === 'management' ? "text-white" : "text-[#8A8F98] hover:text-[#E3E3E3]"
                        )}
                    >
                        <UsersThree size={16} weight={track === 'management' ? "fill" : "regular"} />
                        Management
                        {track === 'management' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* Clean List Selector */}
            <div className="space-y-0.5">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={track}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-col"
                    >
                        {visibleLevels.map((level) => (
                            <MobileLevelOption
                                key={level.value}
                                level={level}
                                selected={value === level.value}
                                onSelect={() => handleLevelChange(level.value)}
                            />
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>

            {error && (
                <p className="text-sm mt-1 text-red-500" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

// Clean List Option Row (Checkmark on Right)
function MobileLevelOption({
    level,
    selected,
    onSelect
}: {
    level: ExperienceLevel;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={clsx(
                "group relative w-full flex items-center justify-between py-3 px-1 text-left rounded-lg transition-all duration-150",
                selected
                    ? "bg-transparent text-white"
                    : "bg-transparent text-[#8A8F98] hover:text-[#E3E3E3]"
            )}
        >
            <div className="flex flex-col min-w-0">
                <span className={clsx(
                    "text-[14px] font-medium transition-colors",
                    selected ? "text-[#E3E3E3]" : "text-[#8A8F98]"
                )}>
                    {level.label}
                </span>

                {level.years && (
                    <span className="text-[12px] text-[#5A5B60] group-hover:text-[#8A8F98] font-normal transition-colors">
                        {level.years}
                    </span>
                )}
            </div>

            {/* Checkmark on Right */}
            {selected && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-[#E3E3E3] flex-shrink-0 ml-3"
                >
                    <Check size={14} weight="bold" />
                </motion.div>
            )}
        </button>
    );
}
