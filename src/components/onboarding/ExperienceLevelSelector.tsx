'use client';

import React, { useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { LEVELS_BY_TRACK, type ExperienceLevel } from '@/types/career';

interface ExperienceLevelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onBlur?: () => void;
}

export function ExperienceLevelSelector({
  value,
  onChange,
  error
}: ExperienceLevelSelectorProps) {
  const [track, setTrack] = useState<'ic' | 'management' | null>(null);
  const [showAll, setShowAll] = useState(false);
  
  // Filter levels based on selected track
  const visibleLevels = track ? 
    LEVELS_BY_TRACK[track].filter(l => showAll || !l.lessCommon) : 
    [];
  
  const hasLessCommonLevels = track ? LEVELS_BY_TRACK[track].some(l => l.lessCommon) : false;
  
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

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium">
        Experience Level <span className="text-red-600" aria-label="required">*</span>
        <span className="text-xs font-normal text-gray-600 block mt-1">
          Staff/Principal are IC levels; Manager/Director are management levels
        </span>
      </legend>
      
      {/* Track selector */}
      <div role="radiogroup" aria-label="Career track" className="space-y-3">
        {track === 'ic' ? (
          <>
            <TrackOption
              value="ic"
              label="Technical Experience"
              checked={true}
              onChange={() => {}}
            />
            <button
              type="button"
              onClick={() => {
                setTrack('management');
                setShowAll(false);
              }}
              className="text-xs opacity-70 hover:opacity-100 transition-colors italic"
            >
              ← Switch to Management Experience
            </button>
          </>
        ) : track === 'management' ? (
          <>
            <TrackOption
              value="management"
              label="Management Experience"
              checked={true}
              onChange={() => {}}
            />
            <button
              type="button"
              onClick={() => {
                setTrack('ic');
                setShowAll(false);
              }}
              className="text-xs opacity-70 hover:opacity-100 transition-colors italic"
            >
              ← Switch to Technical Experience
            </button>
          </>
        ) : (
          <>
            <TrackOption
              value="ic"
              label="Technical Experience"
              checked={false}
              onChange={() => {
                setTrack('ic');
                setShowAll(false);
              }}
            />
            <TrackOption
              value="management"
              label="Management Experience"
              checked={false}
              onChange={() => {
                setTrack('management');
                setShowAll(false);
              }}
            />
          </>
        )}
      </div>
      
      {/* Level selector (accordion) */}
      {track && (
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: '1000px',
            opacity: 1
          }}
        >
          <div className="flex items-center gap-2 my-4">
            <div className="flex-1 border-t" style={{ borderColor: 'var(--border-default)' }}></div>
            <span className="text-xs font-medium opacity-60 uppercase tracking-wide">Choose your level</span>
            <div className="flex-1 border-t" style={{ borderColor: 'var(--border-default)' }}></div>
          </div>
          <fieldset>
            <legend className="sr-only">Experience level selection</legend>
            <div role="radiogroup" aria-label="Experience level" className="space-y-1.5">
            {visibleLevels.map(level => (
              <LevelOption
                key={level.value}
                level={level}
                checked={value === level.value}
                onChange={() => handleLevelChange(level.value)}
              />
            ))}
            
            {!showAll && hasLessCommonLevels && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-sm opacity-70 hover:opacity-100 transition-colors"
              >
                + Show more levels
              </button>
            )}
            </div>
          </fieldset>
        </div>
      )}
      
      {error && (
        <p className="text-sm mt-1" style={{ color: 'var(--error)' }} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

// Track selection card component - More prominent and distinctive
interface TrackOptionProps {
  value: 'ic' | 'management';
  label: string;
  checked: boolean;
  onChange: () => void;
}

function TrackOption({ value, label, checked, onChange }: TrackOptionProps) {
  const inputId = `track-${value}`;
  
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
      className={`
        flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer
        transition-all duration-200 min-h-[56px]
        ${
          checked
            ? 'border-white bg-white/10 shadow-sm'
            : 'border-white/20 hover:border-white/30 hover:bg-white/5 bg-white/5'
        }
        focus-within:outline-none focus-within:ring-2 focus-within:ring-white focus-within:ring-offset-2 focus-within:ring-offset-black/50
      `}
    >
      <input
        type="radio"
        id={inputId}
        name="career-track"
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      
      <div className="flex-shrink-0">
        {checked ? (
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <CheckCircle size={16} className="text-black" weight="fill" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2" style={{ borderColor: 'var(--border-strong)' }} />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold">
          {label}
        </div>
      </div>
    </label>
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
      className="flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 min-h-[44px] focus-within:outline-none focus-within:ring-2 focus-within:ring-white focus-within:ring-offset-1"
      style={{
        backgroundColor: checked ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        borderColor: checked ? 'var(--accent-primary)' : 'var(--border-default)',
        borderWidth: '1px'
      }}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.borderColor = 'var(--border-strong)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.borderColor = 'var(--border-default)';
        }
      }}
    >
      <input
        type="radio"
        id={inputId}
        name="experience-level"
        value={level.value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      
      <div className="flex-shrink-0">
        {checked ? (
          <CheckCircle size={18} weight="fill" style={{ color: 'var(--accent-primary)' }} />
        ) : (
          <div className="w-[18px] h-[18px] rounded-full border-2" style={{ borderColor: 'var(--border-strong)' }} />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            {level.label}
          </div>
        {level.years && (
          <div className="text-xs opacity-70 mt-0.5">
            {level.years}
          </div>
        )}
      </div>
    </label>
  );
}
