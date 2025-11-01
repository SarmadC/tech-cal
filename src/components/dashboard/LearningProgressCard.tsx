'use client';

import React from 'react';
import { GraduationCap, TrendUp, CheckCircle, Info } from '@phosphor-icons/react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import type { TrackedEventRecord, Event, CareerProfile } from '@/types';
import { getCanonicalSkillMeta, mapSkillsToCanonical } from '@/utils/skillTaxonomy';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface LearningProgressCardProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  careerProfile: CareerProfile | null;
}

export function LearningProgressCard({
  trackedEvents,
  upcomingEvents,
  careerProfile,
}: LearningProgressCardProps) {
  const metrics = useDashboardMetrics({
    trackedEvents,
    upcomingEvents,
    careerProfile,
  });
  const { getEventMatchedSkills } = metrics;

  // Calculate skills progress
  const skillsProgress = React.useMemo(() => {
    if (!careerProfile || careerProfile.skillsToLearn.length === 0) {
      return {
        coveredCount: 0,
        totalCount: 0,
        coverage: 0,
        unlockedThisMonth: [],
        needsVerification: [],
      };
    }

    // Get canonical versions of skills to learn
    const canonicalTargetSkills = mapSkillsToCanonical(careerProfile.skillsToLearn);
    
    // Get skills unlocked this month (with confidence levels)
    const unlockedThisMonth = metrics.skillsCoveredThisMonth.uniqueSkills.map(skill => {
      const canonical = getCanonicalSkillMeta(skill);
      return {
        skill: canonical?.name || skill,
        confidence: canonical ? 'high' : 'medium' as const,
      };
    });
    
    // Determine which target skills have been covered
    const coveredSkills = new Set<string>();
    unlockedThisMonth.forEach(({ skill, confidence }) => {
      if (confidence === 'high') {
        coveredSkills.add(skill);
      }
    });
    
    // Skills that need verification (low confidence matches)
    const needsVerification = metrics.skillsCoveredThisMonth.needsVerification;

    return {
      coveredCount: coveredSkills.size,
      totalCount: canonicalTargetSkills.length,
      coverage: canonicalTargetSkills.length > 0
        ? Math.round((coveredSkills.size / canonicalTargetSkills.length) * 100)
        : 0,
      unlockedThisMonth: unlockedThisMonth.filter(u => u.confidence === 'high').slice(0, 5),
      needsVerification: needsVerification.slice(0, 3),
    };
  }, [careerProfile, metrics.skillsCoveredThisMonth]);

  // Find upcoming events that cover skills to learn (using event-specific matched skills)
  const relevantUpcomingEvents = React.useMemo(() => {
    if (!careerProfile || careerProfile.skillsToLearn.length === 0) {
      return [];
    }

    const canonicalTargetSkills = mapSkillsToCanonical(careerProfile.skillsToLearn);
    
    return upcomingEvents
      .filter(event => {
        // Use the helper from metrics hook (checks both pre-computed and cache)
        const eventMatchedSkills = getEventMatchedSkills(event);
        
        return eventMatchedSkills.some(skill => {
          const canonical = getCanonicalSkillMeta(skill);
          const canonicalSkill = canonical?.name || skill;
          return canonicalTargetSkills.some(target => 
            target.toLowerCase().includes(canonicalSkill.toLowerCase()) ||
            canonicalSkill.toLowerCase().includes(target.toLowerCase())
          );
        });
      })
      .slice(0, 5);
  }, [upcomingEvents, careerProfile, getEventMatchedSkills]);

  if (!careerProfile || careerProfile.skillsToLearn.length === 0) {
    return (
      <div className="glass-card glass-glow p-6">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="w-5 h-5 text-glass-secondary" weight="regular" />
          <h3 className="text-base font-medium text-glass-primary">Learning Progress</h3>
        </div>
        <div className="text-center py-12">
          <GraduationCap className="w-12 h-12 text-glass-tertiary opacity-60 mx-auto mb-3" weight="regular" />
          <p className="text-sm font-medium text-glass-secondary mb-1">No learning goals set</p>
          <p className="text-xs text-glass-tertiary">
            Update your career profile to track skill development
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card glass-glow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-5 h-5 text-glass-secondary" weight="regular" />
            <h3 className="text-base font-medium text-glass-primary">Learning Progress</h3>
          </div>
          <p className="text-sm text-glass-tertiary">
            Skills coverage using canonical taxonomy
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {skillsProgress.coveredCount}/{skillsProgress.totalCount}
        </Badge>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-glass-secondary">Coverage Progress</span>
          <span className="text-2xl font-bold text-glass-primary">{skillsProgress.coverage}%</span>
        </div>
        <Progress value={skillsProgress.coverage} className="h-3" />
        <p className="text-xs text-glass-tertiary mt-2">
          {skillsProgress.coveredCount} skills covered out of {skillsProgress.totalCount} target skills
        </p>
      </div>

      {/* Skills Unlocked This Month */}
      {skillsProgress.unlockedThisMonth.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-400" weight="fill" />
            <h4 className="text-sm font-semibold text-glass-primary">Skills Unlocked This Month</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {skillsProgress.unlockedThisMonth.map(({ skill }, idx) => (
              <Badge key={idx} variant="default" className="text-xs bg-green-500/20 text-green-400 border-green-400/30">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Needs Verification */}
      {skillsProgress.needsVerification.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-amber-400" weight="regular" />
            <h4 className="text-sm font-semibold text-glass-primary">Needs Verification</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {skillsProgress.needsVerification.map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-xs border-amber-400/30 text-amber-400 bg-amber-500/10">
                {skill}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-glass-tertiary mt-2 italic">
            These skills couldn&apos;t be matched via canonical taxonomy
          </p>
        </div>
      )}

      {/* Suggested Action */}
      {relevantUpcomingEvents.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10 dark:border-white/10 light:border-black/10">
          <div className="flex items-start gap-3">
            <TrendUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" weight="regular" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-glass-primary mb-1">
                Relevant Events Coming Up
              </h4>
              <p className="text-xs text-glass-tertiary">
                {relevantUpcomingEvents.length} upcoming event{relevantUpcomingEvents.length === 1 ? '' : 's'} cover your target skills
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State for No Recent Progress */}
      {skillsProgress.unlockedThisMonth.length === 0 && skillsProgress.needsVerification.length === 0 && (
        <div className="text-center py-8">
          <GraduationCap className="w-10 h-10 text-glass-tertiary opacity-60 mx-auto mb-3" weight="regular" />
          <p className="text-sm text-glass-tertiary">No new skills unlocked this month</p>
          <p className="text-xs text-glass-tertiary opacity-60 mt-1">Attend events to develop new skills</p>
        </div>
      )}
    </div>
  );
}
