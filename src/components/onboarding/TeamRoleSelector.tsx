'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { TeamRole, TEAM_ROLE_CONFIGS, SkillTag } from '@/types/career';
import { CheckCircle, Star, Users, Code, Palette, Database, Gear, Lightbulb } from '@phosphor-icons/react';
import { ErrorAlert, Card, Badge, getRoleColor } from './shared/OnboardingUI';

interface TeamRoleSelectorProps {
  onRoleChange: (role: TeamRole) => void;
  currentRole: string;
  skills: SkillTag[];
  className?: string;
}

export const TeamRoleSelector: React.FC<TeamRoleSelectorProps> = ({
  onRoleChange,
  currentRole,
  skills,
  className = ''
}) => {
  const [selectedRole, setSelectedRole] = useState<TeamRole | null>(
    currentRole as TeamRole || null
  );
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Calculate role suggestions based on skills
  const roleSuggestions = useMemo(() => {
    if (!Array.isArray(skills) || skills.length === 0) return [];

    const skillNames = skills.map(s => s.skill.toLowerCase());
    const suggestions: { role: TeamRole; score: number; reason: string }[] = [];

    Object.values(TEAM_ROLE_CONFIGS).forEach(config => {
      if (config.role === 'flexible') return;

      let score = 0;
      const matchedSkills: string[] = [];

      // Check required skills
      config.requiredSkills?.forEach(requiredSkill => {
        if (skillNames.some(skill => skill.includes(requiredSkill.toLowerCase()))) {
          score += 3;
          matchedSkills.push(requiredSkill);
        }
      });

      // Check recommended skills
      config.recommendedSkills?.forEach(recommendedSkill => {
        if (skillNames.some(skill => skill.includes(recommendedSkill.toLowerCase()))) {
          score += 1;
          matchedSkills.push(recommendedSkill);
        }
      });

      if (score > 0) {
        suggestions.push({
          role: config.role,
          score,
          reason: `Matches: ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? '...' : ''}`
        });
      }
    });

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [skills]);

  const handleRoleSelect = useCallback((role: TeamRole) => {
    try {
      setSelectedRole(role);
      onRoleChange(role);
      setError(null);
    } catch (_error) {
      setError('Failed to select role');
    }
  }, [onRoleChange]);

  const getRoleIcon = useCallback((role: TeamRole) => {
    const iconMap: Record<TeamRole, React.ReactNode> = {
      'frontend-developer': <Code size={20} className="text-blue-600" />,
      'backend-developer': <Database size={20} className="text-green-600" />,
      'full-stack-developer': <Gear size={20} className="text-purple-600" />,
      'mobile-developer': <Code size={20} className="text-indigo-600" />,
      'ui-ux-designer': <Palette size={20} className="text-pink-600" />,
      'product-manager': <Users size={20} className="text-orange-600" />,
      'data-scientist': <Database size={20} className="text-teal-600" />,
      'devops-engineer': <Gear size={20} className="text-gray-600" />,
      'qa-engineer': <CheckCircle size={20} className="text-yellow-600" />,
      'tech-lead': <Star size={20} className="text-amber-600" />,
      'project-manager': <Users size={20} className="text-cyan-600" />,
      'flexible': <Lightbulb size={20} className="text-violet-600" />
    };
    return iconMap[role] || <Users size={20} className="text-gray-600" />;
  }, []);


  if (!Array.isArray(skills)) {
    return (
      <ErrorAlert
        error="Invalid skills array provided"
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <ErrorAlert
          error={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Role Suggestions */}
      {roleSuggestions.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 flex items-center">
              <Star size={16} className="mr-2 text-blue-600" />
              Suggested Roles
            </h4>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-sm text-blue-600 hover:text-blue-800"
              type="button"
            >
              {showSuggestions ? 'Hide' : 'Show'} suggestions
            </button>
          </div>
          
          {showSuggestions && (
            <div className="space-y-2">
              {roleSuggestions.map(suggestion => (
                <button
                  key={suggestion.role}
                  onClick={() => handleRoleSelect(suggestion.role)}
                  className="w-full text-left p-3 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 transition-colors"
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(suggestion.role)}
                      <span className="font-medium text-sm">{TEAM_ROLE_CONFIGS[suggestion.role].title}</span>
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      {suggestion.score} matches
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{suggestion.reason}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(TEAM_ROLE_CONFIGS).map(config => (
          <Card
            key={config.role}
            onClick={() => handleRoleSelect(config.role)}
            selected={selectedRole === config.role}
            className={`text-left p-4 transition-all group ${
              selectedRole === config.role
                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50'
                : `${getRoleColor(config.role)} hover:shadow-md`
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              {getRoleIcon(config.role)}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 group-hover:text-gray-700">
                  {config.title}
                </h4>
                <p className="text-xs text-gray-600 group-hover:text-gray-500">
                  {config.description}
                </p>
              </div>
              {selectedRole === config.role && (
                <CheckCircle size={20} className="text-blue-600 flex-shrink-0" />
              )}
            </div>

            <div className="mb-3">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Key Responsibilities:</h5>
              <div className="flex flex-wrap gap-1">
                {config.responsibilities.slice(0, 3).map((responsibility, index) => (
                  <Badge key={index} size="sm" variant="default">
                    {responsibility}
                  </Badge>
                ))}
                {config.responsibilities.length > 3 && (
                  <Badge size="sm" variant="info">
                    +{config.responsibilities.length - 3} more
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-1">Ideal For:</h5>
              <p className="text-xs text-gray-600">
                {config.idealFor.slice(0, 2).join(', ')}
                {config.idealFor.length > 2 && '...'}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Selected Role Summary */}
      {selectedRole && TEAM_ROLE_CONFIGS[selectedRole] && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <CheckCircle size={16} className="mr-2 text-blue-600" />
            Selected Role Summary
          </h4>
          <div className="flex items-center space-x-3">
            {getRoleIcon(selectedRole)}
            <div>
              <p className="font-medium text-gray-900">{TEAM_ROLE_CONFIGS[selectedRole].title}</p>
              <p className="text-sm text-gray-600">{TEAM_ROLE_CONFIGS[selectedRole].description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};