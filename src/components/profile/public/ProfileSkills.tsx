'use client';

import { useState } from 'react';

interface ProfileSkillsProps {
  primarySkills: string[];
  skillsToLearn: string[];
  interests: string[];
}

function SkillTag({ skill, variant = 'default' }: { skill: string; variant?: 'default' | 'learning' | 'interest' }) {
  const variantStyles = {
    default: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    learning: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    interest: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${variantStyles[variant]}`}
    >
      {skill}
    </span>
  );
}

export default function ProfileSkills({ primarySkills, skillsToLearn, interests }: ProfileSkillsProps) {
  const [showAllPrimary, setShowAllPrimary] = useState(false);
  const [showAllLearning, setShowAllLearning] = useState(false);
  const [showAllInterests, setShowAllInterests] = useState(false);

  const hasSkills = primarySkills.length > 0 || skillsToLearn.length > 0 || interests.length > 0;

  if (!hasSkills) {
    return (
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Skills & Interests</h2>
        <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
          No skills added yet.
        </p>
      </section>
    );
  }

  const displayLimit = 6;

  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
      <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Skills & Interests</h2>

      {primarySkills.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-tertiary)] mb-2">
            Primary Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {(showAllPrimary ? primarySkills : primarySkills.slice(0, displayLimit)).map((skill) => (
              <SkillTag key={skill} skill={skill} variant="default" />
            ))}
          </div>
          {primarySkills.length > displayLimit && (
            <button
              onClick={() => setShowAllPrimary(!showAllPrimary)}
              className="mt-2 text-xs text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] transition-colors"
            >
              {showAllPrimary ? 'Show less' : `+${primarySkills.length - displayLimit} more`}
            </button>
          )}
        </div>
      )}

      {skillsToLearn.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-tertiary)] mb-2">
            Currently Learning
          </h3>
          <div className="flex flex-wrap gap-2">
            {(showAllLearning ? skillsToLearn : skillsToLearn.slice(0, displayLimit)).map((skill) => (
              <SkillTag key={skill} skill={skill} variant="learning" />
            ))}
          </div>
          {skillsToLearn.length > displayLimit && (
            <button
              onClick={() => setShowAllLearning(!showAllLearning)}
              className="mt-2 text-xs text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] transition-colors"
            >
              {showAllLearning ? 'Show less' : `+${skillsToLearn.length - displayLimit} more`}
            </button>
          )}
        </div>
      )}

      {interests.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-tertiary)] mb-2">
            Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {(showAllInterests ? interests : interests.slice(0, displayLimit)).map((interest) => (
              <SkillTag key={interest} skill={interest} variant="interest" />
            ))}
          </div>
          {interests.length > displayLimit && (
            <button
              onClick={() => setShowAllInterests(!showAllInterests)}
              className="mt-2 text-xs text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] transition-colors"
            >
              {showAllInterests ? 'Show less' : `+${interests.length - displayLimit} more`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
