'use client';

import React, { useMemo } from 'react';
import { CareerProfile } from '@/types/career';
import { GOAL_OPTIONS } from '../config';

// Editor prop interface
export interface GoalsEditorProps {
  profile: Partial<CareerProfile>;
  onUpdate: (updates: Partial<CareerProfile>) => void;
}

// Memoized GoalsEditor component
const GoalsEditor: React.FC<GoalsEditorProps> = React.memo(({ profile, onUpdate }) => {
  // Memoized form data to prevent unnecessary re-renders
  const formData = useMemo(() => ({
    careerGoals: profile.careerGoals || [],
    timeframe: profile.timeframe || 'immediate'
  }), [profile]);

  // Goal toggle handler
  const handleGoalToggle = (goal: string) => {
    const updatedGoals = formData.careerGoals.includes(goal as CareerProfile['careerGoals'][0])
      ? formData.careerGoals.filter(g => g !== goal)
      : [...formData.careerGoals, goal as CareerProfile['careerGoals'][0]];

    onUpdate({
      careerGoals: updatedGoals,
      timeframe: formData.timeframe
    });
  };

  // Timeframe change handler
  const handleTimeframeChange = (timeframe: CareerProfile['timeframe']) => {
    onUpdate({
      careerGoals: formData.careerGoals,
      timeframe
    });
  };

  return (
    <div className="space-y-6">
      {/* Career Goals */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-4">Career Goals</label>
        <div className="grid grid-cols-2 gap-3">
          {GOAL_OPTIONS.map((goal) => (
            <label key={goal.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.careerGoals.includes(goal.value as CareerProfile['careerGoals'][0])}
                onChange={() => handleGoalToggle(goal.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{goal.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Timeline</label>
        <select
          value={formData.timeframe}
          onChange={(e) => handleTimeframeChange(e.target.value as CareerProfile['timeframe'])}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base bg-white"
        >
          <option value="immediate">Immediately (0-6 months)</option>
          <option value="short-term">Short-term (6-18 months)</option>
          <option value="medium-term">Medium-term (1-3 years)</option>
          <option value="long-term">Long-term (3+ years)</option>
        </select>
      </div>
    </div>
  );
});

GoalsEditor.displayName = 'GoalsEditor';

export default GoalsEditor;