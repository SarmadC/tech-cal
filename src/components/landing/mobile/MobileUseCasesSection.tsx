'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { DiscoveryGraphic, CalendarSyncGraphic, InsightsGraphic } from '../UseCaseGraphics';

export interface MobileUseCasesSectionProps {
  className?: string;
}

type UseCase = {
  id: string;
  title: string;
  description: string;
  features: string[];
  graphic: React.ReactNode;
};

const useCases: UseCase[] = [
  {
    id: 'discovery',
    title: "Personalized discovery that matches your career goals",
    description: "Our intelligent matching algorithm analyzes your skills, interests, and career trajectory to surface the most relevant tech events, conferences, and workshops. No more endless scrolling through irrelevant content.",
    features: [
      "AI-powered event recommendations based on your profile",
      "Filter by technology stack, skill level, and career stage",
      "Match score showing event relevance to your goals",
      "Save and organize events into custom collections"
    ],
    graphic: <DiscoveryGraphic />,
  },
  {
    id: 'calendar-sync',
    title: "One-tap planning that syncs with Google calendar",
    description: "Seamlessly integrate your tech event schedule with Google Calendar. One tap is all it takes to block time, set reminders, and ensure you never miss an important session or networking opportunity.",
    features: [
      "Instant sync with Google Calendar",
      "Smart conflict detection and resolution",
      "Automatic timezone adjustments",
      "Custom reminder notifications before events"
    ],
    graphic: <CalendarSyncGraphic />,
  },
  {
    id: 'insights',
    title: "Career insights that track your growth",
    description: "Visualize your professional development journey with comprehensive analytics. Track events attended, skills developed, and connections made to understand how each experience contributes to your career growth.",
    features: [
      "Attendance history and engagement metrics",
      "Skill progression tracking over time",
      "Networking impact analysis",
      "Personalized growth recommendations"
    ],
    graphic: <InsightsGraphic />,
  },
];

const MobileUseCasesSection: React.FC<MobileUseCasesSectionProps> = ({ className = '' }) => {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const expandedCard = useCases.find(uc => uc.id === expandedCardId);

  const openCard = useCallback((id: string) => {
    setExpandedCardId(id);
    setIsClosing(false);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeCard = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setExpandedCardId(null);
      setIsClosing(false);
      document.body.style.overflow = '';
    }, 250);
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedCardId) {
        closeCard();
      }
    };

    if (expandedCardId) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedCardId, closeCard]);

  // Cleanup body overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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
          {useCases.map((useCase) => (
            <article 
              className="mobile-use-case-card" 
              key={useCase.id}
              onClick={() => openCard(useCase.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openCard(useCase.id);
                }
              }}
            >
              <div className="mobile-use-case-graphic">
                {useCase.graphic}
              </div>
              <div className="mobile-use-case-footer">
                <h3 className="mobile-use-case-title">{useCase.title}</h3>
                <button 
                  className="mobile-use-case-plus-icon"
                  aria-label={`Learn more about ${useCase.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openCard(useCase.id);
                  }}
                >
                  <Plus size={20} weight="light" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Popover Modal */}
        {expandedCardId && expandedCard && (
          <div 
            className={`mobile-use-case-popover-backdrop ${isClosing ? 'mobile-use-case-popover-closing' : ''}`}
            onClick={closeCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-popover-title"
          >
            <div 
              className={`mobile-use-case-popover-modal ${isClosing ? 'mobile-use-case-popover-closing' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="mobile-use-case-popover-close-button"
                onClick={closeCard}
                aria-label="Close details"
              >
                <X size={20} weight="regular" />
              </button>

              <div className="mobile-use-case-popover-content">
                <div className="mobile-use-case-popover-graphic">
                  {expandedCard.graphic}
                </div>
                
                <div className="mobile-use-case-popover-details">
                  <h3 id="mobile-popover-title" className="mobile-use-case-popover-title">
                    {expandedCard.title}
                  </h3>
                  <p className="mobile-use-case-popover-description">
                    {expandedCard.description}
                  </p>
                  <ul className="mobile-use-case-popover-features">
                    {expandedCard.features.map((feature, index) => (
                      <li key={index} className="mobile-use-case-popover-feature-item">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MobileUseCasesSection;



