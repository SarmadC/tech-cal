'use client';

import React from 'react';
import { CheckCircle } from '@phosphor-icons/react';

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
                      w-10 h-10 rounded-full flex items-center justify-center
                      text-sm font-semibold transition-all duration-300
                      ${
                        isActive
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }
                    `}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isCompleted ? (
                      <CheckCircle size={20} weight="fill" />
                    ) : (
                      step.number
                    )}
                  </div>
                  
                  {/* Step Name */}
                  <div
                    className={`mt-2 text-xs font-medium text-center max-w-32 ${
                      isActive
                        ? ''
                        : isCompleted
                        ? 'opacity-80'
                        : 'opacity-60'
                    }`}
                    style={isActive ? { color: 'var(--accent-primary)' } : {}}
                  >
                    {step.name}
                  </div>
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div
                    className="w-16 md:w-24 h-0.5 mx-2 transition-colors duration-300 self-center"
                    style={{
                      backgroundColor: isCompleted
                        ? 'var(--success)'
                        : isActive && index === currentStep - 1
                        ? 'rgba(255, 255, 255, 0.3)'
                        : 'var(--border-default)'
                    }}
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
