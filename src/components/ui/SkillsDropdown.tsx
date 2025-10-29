'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Check } from '@phosphor-icons/react';
import { SKILL_CATEGORIES, searchSkills, POPULAR_SKILLS } from '@/data/skillsData';
import { cn } from '@/lib/utils';

interface SkillsDropdownProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
  placeholder?: string;
  maxSkills?: number;
  className?: string;
  disabled?: boolean;
}

export const SkillsDropdown: React.FC<SkillsDropdownProps> = ({
  selectedSkills,
  onSkillsChange,
  placeholder = "Search and select skills...",
  maxSkills = 50,
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter skills based on search query and category
  useEffect(() => {
    let skills: string[] = [];
    
    if (searchQuery.trim()) {
      skills = searchSkills(searchQuery, 50);
    } else if (activeCategory === 'all') {
      skills = POPULAR_SKILLS;
    } else {
      const category = SKILL_CATEGORIES.find(cat => cat.id === activeCategory);
      skills = category ? category.skills : [];
    }
    
    // Remove duplicate skill entries before filtering
    skills = Array.from(new Set(skills));

    // Filter out already selected skills
    skills = skills.filter(skill => !selectedSkills.includes(skill));
    setFilteredSkills(skills.slice(0, 30)); // Limit to 30 for performance
  }, [searchQuery, activeCategory, selectedSkills]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSkills.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredSkills[highlightedIndex]) {
          handleSkillSelect(filteredSkills[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSkillSelect = (skill: string) => {
    if (selectedSkills.includes(skill) || selectedSkills.length >= maxSkills) {
      return;
    }
    
    onSkillsChange([...selectedSkills, skill]);
    setSearchQuery('');
    setHighlightedIndex(-1);
    
    // Keep dropdown open for multiple selections
    inputRef.current?.focus();
  };

  const handleSkillRemove = (skill: string) => {
    onSkillsChange(selectedSkills.filter(s => s !== skill));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(-1);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Selected Skills Display */}
      <div
        className={cn(
          'min-h-[48px] rounded-2xl border border-border-color bg-background-tertiary/80 px-3 py-2 shadow-sm transition-all duration-200',
          'focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/30',
          disabled && 'pointer-events-none opacity-70'
        )}
      >
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border transition-colors duration-200"
              style={{
                backgroundColor: 'var(--success-light)',
                borderColor: 'var(--success)',
                color: 'var(--success)',
                boxShadow: 'var(--shadow-xs)'
              }}
            >
              {skill}
              <button
                type="button"
                onClick={() => handleSkillRemove(skill)}
                className="ml-1 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                style={{ 
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  color: 'var(--success)',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'}
                disabled={disabled}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={selectedSkills.length === 0 ? placeholder : 'Add more skills...'}
          disabled={disabled}
          className="w-full border-none bg-transparent text-sm placeholder:opacity-50 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border-color bg-background-secondary shadow-xl">
          {/* Category Tabs */}
          <div className="border-b border-border-subtle bg-background-secondary/80">
            <div className="flex overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                  className={cn(
                    'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                    activeCategory === 'all'
                      ? 'border-b-2 border-opacity-100'
                      : 'border-b-2 border-transparent opacity-70 hover:opacity-100'
                  )}
              >
                Popular
              </button>
              {SKILL_CATEGORIES.slice(0, 6).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                    activeCategory === category.id
                      ? 'border-b-2 border-blue-500 text-blue-500'
                      : 'border-b-2 border-transparent text-foreground-muted hover:text-foreground-secondary'
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Skills List */}
          <div ref={listRef} className="max-h-60 overflow-y-auto bg-background-secondary/90">
            {filteredSkills.length === 0 ? (
              <div className="px-4 py-3 text-sm opacity-70 text-center">
                {searchQuery ? 'No skills found' : 'No skills available'}
              </div>
            ) : (
              filteredSkills.map((skill, index) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleSkillSelect(skill)}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors',
                    'hover:bg-opacity-10 hover:bg-current focus:bg-opacity-10 focus:bg-current focus:outline-none',
                    index === highlightedIndex && 'bg-opacity-10 bg-current'
                  )}
                >
                  <span>{skill}</span>
                  {selectedSkills.includes(skill) && (
                    <Check size={16} style={{ color: 'var(--success)' }} />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border-subtle bg-background-secondary/80 px-4 py-2 text-xs opacity-70">
            {selectedSkills.length}/{maxSkills} skills selected
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsDropdown;
