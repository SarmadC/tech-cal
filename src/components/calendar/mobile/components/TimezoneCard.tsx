'use client';

import React from 'react';

export interface TimezoneCardProps {
  timezone: string;
  location: string;
  time: string;
  className?: string;
}

const TimezoneCard: React.FC<TimezoneCardProps> = ({
  timezone: _timezone,
  location,
  time,
  className = ''
}) => {
  return (
    <div className={`timezone-card ${className}`} role="region" aria-label={`Current time in ${location}: ${time}`}>
      <div className="timezone-time" aria-label={`Time: ${time}`}>{time}</div>
      <div className="timezone-location" aria-label={`Location: ${location}`}>{location}</div>
    </div>
  );
};

export default TimezoneCard;