'use client';

import React, { useState } from 'react';
import { Check, CheckCircle, User, UsersThree } from '@phosphor-icons/react';
import { LEVELS_BY_TRACK, type ExperienceLevel } from '@/types/career';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

interface ExperienceLevelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    onBlur?: () => void;
    className?: string; // Added className support
}

export function ExperienceLevelSelector({
    value,
    onChange,
    error,
    className
}: ExperienceLevelSelectorProps) {
    const [track, setTrack] = useState<'ic' | 'management' | null>(null);
    const [showAll, setShowAll] = useState(false);
    // Using Framer Motion for the segmented control slide effect
    const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);

    // Filter levels based on selected track
    const visibleLevels = track ?
        LEVELS_BY_TRACK[track].filter(l => showAll || !l.lessCommon) :
        [];

    // Check if there are actually hidden levels to show
    // Only show button if we're not showing all levels AND there are lessCommon levels that would be added
    const allLevels = track ? LEVELS_BY_TRACK[track] : [];
    const hasHiddenLevels = !showAll && allLevels.length > visibleLevels.length;

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
        setShowAll(false);
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
        <div className={twMerge("space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards", className)}>
            <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center">
                    Experience Level <span className="text-red-500 ml-1">*</span>
                </label>

                {/* Segmented Control Track Selector */}
                <div className="relative p-1.5 bg-secondary/40 backdrop-blur-sm rounded-xl flex items-center gap-1.5 w-full max-w-md mx-auto sm:mx-0 border border-border/50">
                    {/* Sliding background for selected state */}
                    {Object.keys(LEVELS_BY_TRACK).map((trackKey) => {
                        const isSelected = track === trackKey;
                        return (
                            <button
                                key={trackKey}
                                type="button"
                                onClick={() => onTrackChange(trackKey as 'ic' | 'management')}
                                onMouseEnter={() => setHoveredTrack(trackKey)}
                                onMouseLeave={() => setHoveredTrack(null)}
                                className={clsx(
                                    "relative flex-1 py-2 px-4 text-xs font-medium rounded-lg transition-all duration-200 z-10 text-center",
                                    isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {isSelected && (
                                    <motion.div
                                        layoutId="activeTrack"
                                        className="absolute inset-0 bg-secondary rounded-lg shadow-sm"
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
                        className="grid grid-cols-2 sm:grid-cols-2 gap-4"
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
                                />
                            </motion.div>
                        ))}
                    </motion.div>

                    {hasHiddenLevels && (
                        <button
                            type="button"
                            onClick={() => setShowAll(true)}
                            className="w-full mt-4 py-2 text-xs font-medium text-muted-foreground/60 hover:text-foreground transition-all hover:bg-secondary/50 rounded-lg"
                        >
                            Show more levels
                        </button>
                    )}
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
}

function LevelOption({ level, checked, onChange }: LevelOptionProps) {
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
                "group relative flex flex-col justify-between px-5 py-4 rounded-lg cursor-pointer transition-all duration-300 border text-left h-full",
                // Enhanced focus ring specifically for keyboard accessibility (only when not checked)
                checked
                    ? "bg-gradient-to-br from-secondary to-secondary/70 border-emerald-500/30 shadow-lg dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm focus-within:outline-none"
                    : "bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/50 hover:border-border hover:shadow-md focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-400/30 focus-within:ring-offset-2 focus-within:ring-offset-background"
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

            {/* Premium Selection Indicator - Subtle inner glow */}
            {checked && (
                <motion.div
                    layoutId="selectionRing"
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    style={{
                        boxShadow: 'inset 0 0 0 1px rgba(16, 185, 129, 0.3), inset 0 1px 2px rgba(16, 185, 129, 0.15)',
                    }}
                    transition={{ duration: 0.2 }}
                />
            )}

            {/* Content */}
            <div className="flex items-start justify-between w-full relative z-10">
                <div className="min-w-0 flex-1">
                    <div className={clsx(
                        "text-[15px] font-medium leading-snug mb-1 transition-colors",
                        checked ? "text-foreground" : "text-foreground"
                    )}>
                        {level.label}
                    </div>
                    {level.years && (
                        <div className={clsx(
                            "text-xs leading-relaxed transition-colors",
                            checked ? "text-muted-foreground/70" : "text-muted-foreground/70"
                        )}>
                            {level.years}
                        </div>
                    )}
                </div>

                {/* Premium Check Indicator */}
                <motion.div 
                    className={clsx(
                        "flex-shrink-0 ml-3 rounded-md p-1.5 transition-all duration-200",
                        checked 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-secondary/50 text-transparent group-hover:bg-secondary"
                    )}
                    animate={{
                        scale: checked ? 1 : 0.9,
                        opacity: checked ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                >
                    <CheckCircle size={16} weight="fill" />
                </motion.div>
            </div>
        </label>
    );
}
