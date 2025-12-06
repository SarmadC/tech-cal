'use client';

import React from 'react';
import { Check } from '@phosphor-icons/react';

interface Step {
  number: number;
  name: string;
}

interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
  steps: Step[];
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStep,
  steps
}) => {

  return (
    <div className="mb-8">
      {/* Stepper Indicators */}
      <div className="flex items-center justify-center">
        {steps.map((step, index) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.number}>
              <div className="flex items-center">
                {/* Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      text-sm font-medium transition-all duration-200 border
                      ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary'
                          : isCompleted
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border'
                      }
                    `}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isCompleted ? (
                      <Check size={16} weight="bold" />
                    ) : (
                      step.number
                    )}
                  </div>

                  {/* Step Name */}
                  <div
                    className={`mt-2 text-xs font-medium text-center max-w-24 ${
                      isActive
                        ? 'text-foreground'
                        : isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.name}
                  </div>
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={`w-12 md:w-20 h-px mx-3 transition-colors duration-200 self-center -mt-6 ${
                      isCompleted ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
