'use client';

import React from 'react';
import type { AppProfile } from '@/types';

interface CareerProfilePromptProps {
  profile: AppProfile;
  className?: string;
}

const CareerProfilePrompt: React.FC<CareerProfilePromptProps> = ({ profile: _profile, className = '' }) => {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="text-sm text-muted-foreground">
        Complete your career profile to unlock personalized insights.
      </div>
    </div>
  );
};

export default CareerProfilePrompt;


