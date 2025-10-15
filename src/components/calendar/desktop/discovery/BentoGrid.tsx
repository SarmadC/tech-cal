'use client';

import React from 'react';
import './bento-grid.css';

export interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

const BentoGrid: React.FC<BentoGridProps> = ({ children, className = '' }) => {
  return (
    <div className={`bento-grid ${className}`} role="list">
      {children}
    </div>
  );
};

export default BentoGrid;


