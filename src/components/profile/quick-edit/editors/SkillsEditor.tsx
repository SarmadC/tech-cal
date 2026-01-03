'use client';

import React, { useMemo } from 'react';
import { CareerProfile } from '@/types/career';
import SkillsDropdown from '@/components/ui/SkillsDropdown';
import { FormField } from '@/components/onboarding/shared/FormField';

// Editor prop interface
export interface SkillsEditorProps {
  profile: Partial<CareerProfile>;
  onUpdate: (updates: Partial<CareerProfile>) => void;
}

// Memoized SkillsEditor component
const SkillsEditor: React.FC<SkillsEditorProps> = React.memo(({ profile, onUpdate }) => {
  // Memoized form data to prevent unnecessary re-renders
  const formData = useMemo(() => ({
    primarySkills: profile.primarySkills || [],
    skillsToLearn: profile.skillsToLearn || [],
    interests: profile.interests || []
  }), [profile]);

  // Skill change handlers
  const handlePrimarySkillsChange = (skills: string[]) => {
    onUpdate({ primarySkills: skills });
  };

  const handleSkillsToLearnChange = (skills: string[]) => {
    onUpdate({ skillsToLearn: skills });
  };

  const handleInterestsChange = (interests: string[]) => {
    onUpdate({ interests });
  };

  return (
    <div className="space-y-8">
      {/* Core Skills */}
      <div className="pb-6 border-b border-white/5">
        <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold mb-1 block">
          Core Skills
        </label>
        <p className="text-xs text-zinc-500 mb-3">What you can do now</p>
        <SkillsDropdown
          selectedSkills={formData.primarySkills}
          onSkillsChange={handlePrimarySkillsChange}
          placeholder="Type to add..."
        />
      </div>

      {/* Learning Goals */}
      <div className="pb-6 border-b border-white/5">
        <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold mb-1 block">
          Learning Goals
        </label>
        <p className="text-xs text-zinc-500 mb-3">What you're actively learning</p>
        <SkillsDropdown
          selectedSkills={formData.skillsToLearn}
          onSkillsChange={handleSkillsToLearnChange}
          placeholder="Type to add..."
        />
      </div>

      {/* Interests */}
      <div>
        <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold mb-1 block">
          Interests
        </label>
        <p className="text-xs text-zinc-500 mb-3">Broader topics you're curious about</p>
        <SkillsDropdown
          selectedSkills={formData.interests}
          onSkillsChange={handleInterestsChange}
          placeholder="Type to add..."
        />
      </div>
    </div>
  );
});

SkillsEditor.displayName = 'SkillsEditor';

export default SkillsEditor;