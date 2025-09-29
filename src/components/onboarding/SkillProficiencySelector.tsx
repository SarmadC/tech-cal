'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { SkillTag, SkillProficiency, PROFICIENCY_LEVELS } from '@/types/career';
import { Star, X } from '@phosphor-icons/react';
import { ErrorAlert, EmptyState } from './shared/OnboardingUI';

interface SkillProficiencySelectorProps {
  skills: string[];
  skillTags: SkillTag[];
  onSkillsChange: (skills: SkillTag[]) => void;
  className?: string;
}

export const SkillProficiencySelector: React.FC<SkillProficiencySelectorProps> = ({
  skills,
  skillTags,
  onSkillsChange,
  className = ''
}) => {
  const [error, setError] = useState<string | null>(null);
  const [draggedSkill, setDraggedSkill] = useState<string | null>(null);

  // Create skill tags for skills that don't have them
  const allSkillTags = useMemo(() => 
    skills.map(skill => {
      const existing = skillTags.find(tag => tag.skill === skill);
      return existing || {
        skill,
        proficiency: 'intermediate' as SkillProficiency,
        yearsOfExperience: 2,
        lastUsed: new Date().toISOString(),
        category: getSkillCategory(skill)
      };
    }), [skills, skillTags]
  );

  const updateSkillProficiency = useCallback((skill: string, proficiency: SkillProficiency) => {
    try {
      const updatedTags = allSkillTags.map(tag => 
        tag.skill === skill 
          ? { ...tag, proficiency, yearsOfExperience: PROFICIENCY_LEVELS[proficiency].years }
          : tag
      );
      onSkillsChange(updatedTags);
      setError(null);
    } catch (_error) {
      setError('Failed to update skill proficiency');
    }
  }, [allSkillTags, onSkillsChange]);

  const removeSkill = useCallback((skill: string) => {
    try {
      const updatedTags = allSkillTags.filter(tag => tag.skill !== skill);
      onSkillsChange(updatedTags);
      setError(null);
    } catch (_error) {
      setError('Failed to remove skill');
    }
  }, [allSkillTags, onSkillsChange]);

  const handleDragStart = useCallback((e: React.DragEvent, skill: string) => {
    setDraggedSkill(skill);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSkill: string) => {
    e.preventDefault();
    if (!draggedSkill || draggedSkill === targetSkill) return;

    try {
      const draggedIndex = allSkillTags.findIndex(tag => tag.skill === draggedSkill);
      const targetIndex = allSkillTags.findIndex(tag => tag.skill === targetSkill);
      
      if (draggedIndex === -1 || targetIndex === -1) return;

      const newTags = [...allSkillTags];
      [newTags[draggedIndex], newTags[targetIndex]] = [newTags[targetIndex], newTags[draggedIndex]];
      
      onSkillsChange(newTags);
      setDraggedSkill(null);
    } catch (_error) {
      setError('Failed to reorder skills');
    }
  }, [draggedSkill, allSkillTags, onSkillsChange]);

  if (skills.length === 0) {
    return (
      <EmptyState
        icon={<Star size={48} className="mx-auto" />}
        title="No Skills Selected"
        description="Please select skills in the previous step to rate your proficiency."
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <ErrorAlert
          error={error}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="space-y-3">
        {allSkillTags.map((skillTag, index) => (
          <div
            key={skillTag.skill}
            draggable
            onDragStart={(e) => handleDragStart(e, skillTag.skill)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, skillTag.skill)}
            className={`group flex items-center justify-between p-4 border rounded-lg transition-all hover:shadow-md ${
              draggedSkill === skillTag.skill ? 'opacity-50' : 'hover:border-gray-300'
            } ${draggedSkill ? 'cursor-move' : 'cursor-grab'}`}
          >
            <div className="flex items-center space-x-3 flex-1">
              <div className="text-gray-400 text-sm font-mono w-6 text-center">
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{skillTag.skill}</h4>
                <p className="text-sm text-gray-500 capitalize">{skillTag.category}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <fieldset className="flex space-x-3">
                <legend className="sr-only">Proficiency level for {skillTag.skill}</legend>
                {Object.entries(PROFICIENCY_LEVELS).map(([level, config]) => (
                  <label key={level} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name={`proficiency-${skillTag.skill}`}
                      value={level}
                      checked={skillTag.proficiency === level}
                      onChange={() => updateSkillProficiency(skillTag.skill, level as SkillProficiency)}
                      className="sr-only"
                    />
                    <div className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      skillTag.proficiency === level
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}>
                      {config.label}
                    </div>
                  </label>
                ))}
              </fieldset>
              
              <button
                onClick={() => removeSkill(skillTag.skill)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                type="button"
                title="Remove skill"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 text-center">
        💡 Drag skills to reorder them by priority
      </div>
    </div>
  );
};

// Enhanced skill category helper with better categorization
function getSkillCategory(skill: string): string {
  const skillLower = skill.toLowerCase();
  
  const categories = [
    { keywords: ['javascript', 'typescript', 'react', 'vue', 'angular', 'svelte', 'html', 'css', 'sass', 'tailwind'], name: 'Frontend' },
    { keywords: ['python', 'java', 'node', 'php', 'ruby', 'go', 'rust', 'c#', 'c++', 'c', 'scala', 'kotlin'], name: 'Backend' },
    { keywords: ['sql', 'database', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'neo4j'], name: 'Database' },
    { keywords: ['aws', 'docker', 'kubernetes', 'devops', 'terraform', 'jenkins', 'gitlab', 'azure', 'gcp'], name: 'DevOps' },
    { keywords: ['design', 'ui', 'ux', 'figma', 'sketch', 'adobe', 'photoshop', 'illustrator'], name: 'Design' },
    { keywords: ['machine', 'learning', 'ai', 'tensorflow', 'pytorch', 'data', 'science', 'analytics'], name: 'AI/ML' },
    { keywords: ['mobile', 'ios', 'android', 'flutter', 'react-native', 'swift', 'kotlin'], name: 'Mobile' },
    { keywords: ['blockchain', 'web3', 'solidity', 'ethereum', 'crypto', 'defi'], name: 'Blockchain' }
  ];
  
  for (const category of categories) {
    if (category.keywords.some(keyword => skillLower.includes(keyword))) {
      return category.name;
    }
  }
  
  return 'Other';
}