'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { ChartBar, GraduationCap, TrendUp } from '@phosphor-icons/react';
import type { CareerProfile, Event } from '@/types';
import { PROFICIENCY_LEVELS } from '@/types/career';

interface SkillsDevelopmentCardProps {
  careerProfile: CareerProfile;
  upcomingEvents: Event[];
}

export function SkillsDevelopmentCard({
  careerProfile,
  upcomingEvents
}: SkillsDevelopmentCardProps) {
  const theme = useTimelineTheme();

  // Calculate skill metrics
  const skillMetrics = useMemo(() => {
    const skillTags = careerProfile.skillTags || [];

    // Count by proficiency
    const proficiencyCounts = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      expert: 0
    };

    skillTags.forEach(tag => {
      proficiencyCounts[tag.proficiency]++;
    });

    // Calculate average experience
    const avgExperience = skillTags.length > 0
      ? (skillTags.reduce((sum, tag) => sum + tag.yearsOfExperience, 0) / skillTags.length).toFixed(1)
      : '0.0';

    // Find relevant events for skills to learn
    const relevantEvents = upcomingEvents.filter(event => {
      const eventTitle = event.title.toLowerCase();
      const eventDesc = event.description.toLowerCase();
      return careerProfile.skillsToLearn.some(skill =>
        eventTitle.includes(skill.toLowerCase()) || eventDesc.includes(skill.toLowerCase())
      );
    }).length;

    return {
      proficiencyCounts,
      avgExperience,
      totalSkills: skillTags.length,
      relevantEvents
    };
  }, [careerProfile, upcomingEvents]);

  // Calculate learning progress
  const learningProgress = useMemo(() => {
    const total = careerProfile.primarySkills.length + careerProfile.skillsToLearn.length;
    return total > 0
      ? Math.round((careerProfile.primarySkills.length / total) * 100)
      : 0;
  }, [careerProfile]);

  const getProficiencyColor = (level: string) => {
    const colors = {
      beginner: 'bg-blue-500',
      intermediate: 'bg-green-500',
      advanced: 'bg-orange-500',
      expert: 'bg-purple-500'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <Card className={`border ${theme.borderCard}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`text-lg ${theme.textPrimary}`}>Skills Development</CardTitle>
            <CardDescription className={theme.textSecondary}>
              {skillMetrics.totalSkills} skills • {skillMetrics.avgExperience} years avg experience
            </CardDescription>
          </div>
          <ChartBar className={`w-5 h-5 ${theme.textMuted}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Proficiency Distribution */}
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Proficiency Levels</h4>
          {Object.entries(PROFICIENCY_LEVELS).map(([level, config]) => {
            const count = skillMetrics.proficiencyCounts[level as keyof typeof skillMetrics.proficiencyCounts];
            const percentage = skillMetrics.totalSkills > 0
              ? (count / skillMetrics.totalSkills) * 100
              : 0;

            if (count === 0) return null;

            return (
              <div key={level} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${getProficiencyColor(level)}`} />
                    <span className={theme.textPrimary}>{config.label}</span>
                  </div>
                  <span className={theme.textMuted}>{count} skills</span>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
            );
          })}
        </div>

        {/* Learning Progress */}
        <div className={`p-4 rounded-lg border ${theme.borderCard} space-y-3`}>
          <div className="flex items-center gap-2">
            <TrendUp className={`w-4 h-4 ${theme.textPrimary}`} />
            <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Learning Progress</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${theme.textPrimary}`}>{learningProgress}%</span>
              <span className={`text-sm ${theme.textMuted}`}>
                {careerProfile.primarySkills.length} / {careerProfile.primarySkills.length + careerProfile.skillsToLearn.length}
              </span>
            </div>
            <Progress value={learningProgress} className="h-2" />
          </div>
        </div>

        {/* Skills to Learn */}
        {careerProfile.skillsToLearn.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className={`w-4 h-4 ${theme.textPrimary}`} />
                <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Next to Learn</h4>
              </div>
              {skillMetrics.relevantEvents > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {skillMetrics.relevantEvents} relevant events
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {careerProfile.skillsToLearn.slice(0, 8).map((skill) => (
                <Badge key={skill} variant="outline" className={theme.textSecondary}>
                  {skill}
                </Badge>
              ))}
              {careerProfile.skillsToLearn.length > 8 && (
                <Badge variant="outline" className={theme.textMuted}>
                  +{careerProfile.skillsToLearn.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Primary Skills */}
        {careerProfile.primarySkills.length > 0 && (
          <div className="space-y-3">
            <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Current Skills</h4>
            <div className="flex flex-wrap gap-2">
              {careerProfile.primarySkills.slice(0, 8).map((skill) => (
                <Badge key={skill} variant="secondary" className={theme.textPrimary}>
                  {skill}
                </Badge>
              ))}
              {careerProfile.primarySkills.length > 8 && (
                <Badge variant="secondary" className={theme.textMuted}>
                  +{careerProfile.primarySkills.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
