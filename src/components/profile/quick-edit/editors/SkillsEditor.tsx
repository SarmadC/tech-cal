'use client';

import React, { useMemo } from 'react';
import { CareerProfile, INTEREST_AREAS } from '@/types/career';
import SkillsDropdown from '@/components/ui/SkillsDropdown';
import { LinearFormField } from '../components/LinearInputs';

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
            {/* Core Skills */}
            <LinearFormField
                label="Core Skills"
                description="Stack and tools you are proficient in (e.g. React, Python)"
                className="w-full"
            >
                <SkillsDropdown
                    selectedSkills={formData.primarySkills}
                    onSkillsChange={handlePrimarySkillsChange}
                    placeholder="Add skills..."
                />
            </LinearFormField>

            {/* Learning Goals */}
            <LinearFormField
                label="Learning Goals"
                description="Technologies or skills you are actively learning"
                className="w-full"
            >
                <SkillsDropdown
                    selectedSkills={formData.skillsToLearn}
                    onSkillsChange={handleSkillsToLearnChange}
                    placeholder="Add learning goals..."
                />
            </LinearFormField>

            {/* Interests */}
            <LinearFormField
                label="Interests"
                description="Broader topics or industries you are curious about"
                className="w-full"
            >
                <SkillsDropdown
                    selectedSkills={formData.interests}
                    onSkillsChange={handleInterestsChange}
                    placeholder="Add interests..."
                    suggestions={INTEREST_AREAS}
                    suggestionHeaderLabel="Suggested Interests"
                    entityName="interests"
                />
            </LinearFormField>
        </div>
    );
});

SkillsEditor.displayName = 'SkillsEditor';

export default SkillsEditor;
