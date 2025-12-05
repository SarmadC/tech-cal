'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { SkillTag, SkillProficiency, PROFICIENCY_LEVELS } from '@/types/career';
import { Star, X, Lightbulb } from '@phosphor-icons/react';
import { ErrorAlert, EmptyState } from './shared/OnboardingUI';
import {
  getCanonicalSkillMeta,
  getSkillCategory,
  getSkillSynonyms,
  mapSkillsToCanonical,
  normalizeSkillName
} from '@/utils/skillTaxonomy';
import { sendTelemetryEvent } from '@/utils/telemetryClient';

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

  const allSkillTags = useMemo(() => {
    const canonicalSkills = mapSkillsToCanonical(skills);
    const tagLookup = new Map<string, SkillTag>(
      skillTags.map(tag => [normalizeSkillName(tag.skill), tag])
    );

    return canonicalSkills.map((skill, index) => {
      const normalizedSkill = normalizeSkillName(skill);
      const existingTag = tagLookup.get(normalizedSkill);
      const meta = getCanonicalSkillMeta(skill);

      if (existingTag) {
        return {
          ...existingTag,
          skill: meta?.name ?? existingTag.skill,
          category: meta?.category ?? existingTag.category ?? getSkillCategory(skill),
          pendingProficiency: !existingTag.proficiency,
          order: index
        };
      }

      return {
        skill: meta?.name ?? skill,
        proficiency: undefined,
        yearsOfExperience: 0,
        lastUsed: new Date().toISOString(),
        category: meta?.category ?? getSkillCategory(skill),
        pendingProficiency: true,
        order: index
      };
    });
  }, [skills, skillTags]);

  const updateSkillProficiency = useCallback((skill: string, proficiency: SkillProficiency) => {
    try {
      const canonicalSkill = getCanonicalSkillMeta(skill)?.name ?? skill;
      const updatedTags = allSkillTags.map(tag =>
        tag.skill === canonicalSkill
          ? {
              ...tag,
              skill: canonicalSkill,
              proficiency,
              yearsOfExperience: PROFICIENCY_LEVELS[proficiency].years,
              pendingProficiency: false
            }
          : tag
      );
      onSkillsChange(updatedTags);
      setError(null);

      const updatedTag = updatedTags.find(tag => tag.skill === canonicalSkill);
      void sendTelemetryEvent({
        eventType: 'skill_rating_saved',
        eventVersion: 1,
        context: {
          surface: 'career_onboarding',
          step: 'skills'
        },
        metadata: {
          skill: updatedTag?.skill ?? canonicalSkill,
          proficiency,
          order: updatedTag?.order ?? updatedTags.findIndex(tag => tag.skill === canonicalSkill),
          taxonomyVersion: 1
        }
      });
    } catch (_error) {
      setError('Failed to update skill proficiency');
    }
  }, [allSkillTags, onSkillsChange]);

  const removeSkill = useCallback((skill: string) => {
    try {
      const canonicalSkill = getCanonicalSkillMeta(skill)?.name ?? skill;
      const normalized = normalizeSkillName(skill);
      const updatedTags = allSkillTags.filter(tag => normalizeSkillName(tag.skill) !== normalized);
      onSkillsChange(updatedTags);
      setError(null);

      void sendTelemetryEvent({
        eventType: 'skill_removed',
        eventVersion: 1,
        context: {
          surface: 'career_onboarding',
          step: 'skills'
        },
        metadata: {
          skill: canonicalSkill,
          taxonomyVersion: 1
        }
      });
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
    if (!draggedSkill || normalizeSkillName(draggedSkill) === normalizeSkillName(targetSkill)) return;

    try {
      const draggedIndex = allSkillTags.findIndex(tag => normalizeSkillName(tag.skill) === normalizeSkillName(draggedSkill));
      const targetIndex = allSkillTags.findIndex(tag => normalizeSkillName(tag.skill) === normalizeSkillName(targetSkill));

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

  const pendingSkills = allSkillTags.filter(tag => !tag.proficiency);

  return (
    <div className={`space-y-4 ${className}`}>
      {pendingSkills.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Select a proficiency level for each skill to capture your experience accurately.
        </div>
      )}

      {error && (
        <ErrorAlert
          error={error}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="space-y-3">
        {allSkillTags.map((skillTag, index) => {
          const synonyms = getSkillSynonyms(skillTag.skill);
          const isDragged = draggedSkill && normalizeSkillName(draggedSkill) === normalizeSkillName(skillTag.skill);

          return (
            <div
              key={normalizeSkillName(skillTag.skill)}
              draggable
              onDragStart={(e) => handleDragStart(e, skillTag.skill)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, skillTag.skill)}
              className={`group flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md ${
                isDragged ? 'opacity-50' : 'hover:border-gray-300'
              } ${draggedSkill ? 'cursor-move' : 'cursor-grab'} ${
                skillTag.proficiency ? 'border-gray-200 bg-white' : 'border-amber-300 bg-amber-50'
              }`}
            >
              <div className="flex flex-1 items-start space-x-3">
                <div className="w-6 text-center font-mono text-sm text-gray-400">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{skillTag.skill}</h4>
                    {!skillTag.proficiency && (
                      <span className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
                        Needs rating
                      </span>
                    )}
                  </div>
                  <p className="text-sm capitalize text-gray-500">{skillTag.category}</p>
                  {synonyms.length > 0 && (
                    <p className="text-xs text-gray-400">
                      Also known as: {synonyms.slice(0, 4).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <fieldset className="flex space-x-3">
                  <legend className="sr-only">Proficiency level for {skillTag.skill}</legend>
                  {Object.entries(PROFICIENCY_LEVELS).map(([level, config]) => {
                    const inputId = `proficiency-${normalizeSkillName(skillTag.skill)}-${level}`;
                    return (
                      <label key={level} className="flex cursor-pointer items-center">
                        <input
                          id={inputId}
                          type="radio"
                          name={`proficiency-${normalizeSkillName(skillTag.skill)}`}
                          value={level}
                          checked={skillTag.proficiency === level}
                          onChange={() => updateSkillProficiency(skillTag.skill, level as SkillProficiency)}
                          className="sr-only"
                        />
                        <div className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
                          skillTag.proficiency === level
                            ? 'border-2 border-blue-200 bg-blue-100 text-blue-700'
                            : 'border-2 border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                          {config.label}
                        </div>
                      </label>
                    );
                  })}
                </fieldset>

                <button
                  onClick={() => removeSkill(skillTag.skill)}
                  className="rounded p-1 text-gray-400 transition-colors hover:text-red-500"
                  type="button"
                  title={`Remove ${skillTag.skill}`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-1">
        <Lightbulb size={14} weight="regular" className="text-gray-400" />
        <span>Drag skills to reorder them by priority</span>
      </div>
    </div>
  );
};
