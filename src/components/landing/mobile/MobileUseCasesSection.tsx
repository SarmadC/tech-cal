'use client';

import React from 'react';
import { Plus } from '@phosphor-icons/react';
import { DiscoveryGraphic, CalendarSyncGraphic, InsightsGraphic } from '../UseCaseGraphics';

export interface MobileUseCasesSectionProps {
  className?: string;
}

type UseCase = {
  title: string;
  graphic: React.ReactNode;
};

const useCases: UseCase[] = [
  {
    title: "Personalized discovery that matches your career goals",
    graphic: <DiscoveryGraphic />,
  },
  {
    title: "One-tap planning that syncs with Google calendar",
    graphic: <CalendarSyncGraphic />,
  },
  {
    title: "Career insights that track your growth",
    graphic: <InsightsGraphic />,
  },
];

const MobileUseCasesSection: React.FC<MobileUseCasesSectionProps> = ({ className = '' }) => {
  return (
    <section className={`mobile-use-cases ${className}`} id="use-cases">
      <div className="mobile-use-cases-content">
        <div className="mobile-use-cases-header">
          <h2 className="mobile-use-cases-title">
            Made for serious<br />engineering careers
          </h2>
          <p className="mobile-use-cases-subtitle">
            Kure Cal is shaped by the practices that distinguish focused professionals from the rest: 
            personalized discovery, effortless planning, and a commitment to career growth.
          </p>
        </div>

        <div className="mobile-use-cases-grid">
          {useCases.map((useCase, index) => (
            <article className="mobile-use-case-card" key={useCase.title}>
              <div className="mobile-use-case-graphic">
                {useCase.graphic}
              </div>
              <div className="mobile-use-case-footer">
                <h3 className="mobile-use-case-title">{useCase.title}</h3>
                <button 
                  className="mobile-use-case-plus-icon"
                  aria-label={`Learn more about ${useCase.title}`}
                >
                  <Plus size={20} weight="light" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MobileUseCasesSection;

