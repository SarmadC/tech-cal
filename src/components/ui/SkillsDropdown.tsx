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
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Selected Skills Display */}
      <div className="min-h-[40px] p-2 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
        <div className="flex flex-wrap gap-1 mb-1">
          {selectedSkills.map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              {skill}
              <button
                type="button"
                onClick={() => handleSkillRemove(skill)}
                className="ml-1 text-blue-500 hover:text-blue-700 focus:outline-none"
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
          placeholder={selectedSkills.length === 0 ? placeholder : "Add more skills..."}
          disabled={disabled}
          className="w-full border-none outline-none text-sm placeholder-gray-500"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Category Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                  activeCategory === 'all'
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
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
                    "px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                    activeCategory === category.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Skills List */}
          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {filteredSkills.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {searchQuery ? 'No skills found' : 'No skills available'}
              </div>
            ) : (
              filteredSkills.map((skill, index) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleSkillSelect(skill)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between",
                    index === highlightedIndex && "bg-gray-100"
                  )}
                >
                  <span>{skill}</span>
                  {selectedSkills.includes(skill) && (
                    <Check size={16} className="text-blue-600" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200">
            {selectedSkills.length}/{maxSkills} skills selected
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsDropdown;
