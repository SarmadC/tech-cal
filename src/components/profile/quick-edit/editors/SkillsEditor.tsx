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
    <div className="space-y-6">
      {/* Current Skills */}
      <FormField 
        label="Current Skills" 
        description="Add 3–5 of your strongest skills"
      >
        <SkillsDropdown
          selectedSkills={formData.primarySkills}
          onSkillsChange={handlePrimarySkillsChange}
          placeholder="Type to search or select from suggestions..."
        />
      </FormField>

      {/* Skills to Learn */}
      <FormField 
        label="Skills You Want to Learn" 
        description="What's next on your roadmap? Add 2–3 skills"
      >
        <SkillsDropdown
          selectedSkills={formData.skillsToLearn}
          onSkillsChange={handleSkillsToLearnChange}
          placeholder="Type to search or select..."
        />
      </FormField>

      {/* Areas of Interest */}
      <FormField 
        label="Areas of Interest" 
        description="Broader topics you're curious about"
      >
        <SkillsDropdown
          selectedSkills={formData.interests}
          onSkillsChange={handleInterestsChange}
          placeholder="Type to search or add custom topics..."
        />
      </FormField>
    </div>
  );
});

SkillsEditor.displayName = 'SkillsEditor';

export default SkillsEditor;