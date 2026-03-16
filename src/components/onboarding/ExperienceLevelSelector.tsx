'use client';

import React, { useState } from 'react';
import { Check, User, UsersThree } from '@phosphor-icons/react';
import { LEVELS_BY_TRACK, type ExperienceLevel } from '@/types/career';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from './shared/StaticMotion';

interface ExperienceLevelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    onBlur?: () => void;
    className?: string; // Added className support
    variant?: 'default' | 'compact';
}

export function ExperienceLevelSelector({
    value,
    onChange,
    error,
    className,
    variant = 'default'
}: ExperienceLevelSelectorProps) {
    const [track, setTrack] = useState<'ic' | 'management' | null>(null);

    // Filter levels based on selected track
    const visibleLevels = track ? LEVELS_BY_TRACK[track] : [];

    // Infer track from current value if it's already set
    React.useEffect(() => {
        if (value && !track) {
            const level = [...LEVELS_BY_TRACK.ic, ...LEVELS_BY_TRACK.management].find(l => l.value === value);
            if (level) {
                const inferredTrack = LEVELS_BY_TRACK.ic.includes(level) ? 'ic' : 'management';
                setTrack(inferredTrack);
            }
        }
    }, [value, track]);

    const handleLevelChange = (levelValue: string) => {
        onChange(levelValue);
    };

    const onTrackChange = (newTrack: 'ic' | 'management') => {
        setTrack(newTrack);
    };

    // Staggered animation variants for the grid
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10, scale: 0.95 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring" as const, stiffness: 400, damping: 20 }
        }
    };

    return (
        <div className={twMerge("space-y-4", className)}>
            <div className="space-y-3">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8F98] flex items-center">
                    Experience Level <span className="text-red-500 ml-1">*</span>
                </label>

                {/* Segmented Control Track Selector */}
                <div className="relative p-0.5 bg-[#222326] rounded-lg flex items-center gap-0.5 w-full max-w-md mx-auto sm:mx-0 border border-[#36373A]">
                    {/* Sliding background for selected state */}
                    {Object.keys(LEVELS_BY_TRACK).map((trackKey) => {
                        const isSelected = track === trackKey;
                        return (
                            <button
                                key={trackKey}
                                type="button"
                                onClick={() => onTrackChange(trackKey as 'ic' | 'management')}
                                className={clsx(
                                    "relative flex-1 py-1 px-2 text-[12px] font-medium rounded-md transition-all duration-150 z-10 text-center",
                                    isSelected ? "text-[#FFFFFF]" : "text-[#8A8F98] hover:text-[#E3E3E3]"
                                )}
                            >
                                {isSelected && (
                                    <motion.div
                                        layoutId="activeTrack"
                                        className="absolute inset-0 bg-[#3A3B40] border border-white/10 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {trackKey === 'ic' ? (
                                        <>
                                            <User size={14} weight={isSelected ? "fill" : "regular"} />
                                            Individual Contributor
                                        </>
                                    ) : (
                                        <>
                                            <UsersThree size={14} weight={isSelected ? "fill" : "regular"} />
                                            Management
                                        </>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Level selector (Grid) */}
            <div
                className={clsx(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    track ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <fieldset>
                    <legend className="sr-only">Experience level selection</legend>
                    <motion.div
                        role="radiogroup"
                        aria-label="Experience level"
                        className={clsx(
                            "grid grid-cols-1 gap-2",
                            variant === 'compact' && "gap-2"
                        )}
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        key={track} // Re-trigger animation when track changes
                    >
                        {visibleLevels.map(level => (
                            <motion.div key={level.value} variants={itemVariants}>
                                <LevelOption
                                    level={level}
                                    checked={value === level.value}
                                    onChange={() => handleLevelChange(level.value)}
                                    variant={variant}
                                />
                            </motion.div>
                        ))}
                    </motion.div>

                </fieldset>
            </div>

            {error && (
                <p className="text-sm mt-1 text-red-500" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

// Experience level option component
interface LevelOptionProps {
    level: ExperienceLevel;
    checked: boolean;
    onChange: () => void;
    variant?: 'default' | 'compact';
}

function LevelOption({ level, checked, onChange, variant = 'default' }: LevelOptionProps) {
    const inputId = `level-${level.value}`;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange();
        }
    };

    return (
        <label
            htmlFor={inputId}
            onKeyDown={handleKeyDown}
            className={clsx(
                "group relative flex items-center justify-between cursor-pointer transition-all duration-150 border-b text-left",
                variant === 'default' ? "px-2 py-2.5" : "px-2 py-2",
                checked
                    ? "bg-transparent border-[#36373A] text-[#E3E3E3]"
                    : "bg-transparent border-[#36373A] text-[#E3E3E3] hover:bg-[#2C2D31]"
            )}
        >
            <input
                type="radio"
                id={inputId}
                name="experience-level"
                value={level.value}
                checked={checked}
                onChange={onChange}
                className="sr-only focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none"
            />

            {/* Content */}
            <div className="flex items-center justify-between w-full relative z-10">
                <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="text-[13px] font-medium leading-tight text-[#E3E3E3]">{level.label}</span>
                    {level.years && (
                        <span className="text-[11px] text-[#8A8F98]">{level.years}</span>
                    )}
                </div>

                {checked && (
                    <motion.div
                        className="flex-shrink-0 ml-2 text-[#E3E3E3]"
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.15 }}
                    >
                        <Check size={16} weight="bold" />
                    </motion.div>
                )}
            </div>
        </label>
    );
}
