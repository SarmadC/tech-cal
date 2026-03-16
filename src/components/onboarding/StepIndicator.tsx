import React from 'react';
import { User, Code, Target, Check } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from './shared/StaticMotion';

interface StepIndicatorProps {
    currentStep: number;
    className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, className }) => {
    const steps = [
        { num: 1, name: 'Role', icon: User },
        { num: 2, name: 'Skills', icon: Code },
        { num: 3, name: 'Goals', icon: Target }
    ];

    return (
        <div className={twMerge('mb-6 w-full', className)}>
            <div className="flex items-center relative">
                {steps.map((step, index) => {
                    const isActive = currentStep === step.num;
                    const isCompleted = currentStep > step.num;
                    const isLast = index === steps.length - 1;

                    return (
                        <React.Fragment key={step.num}>
                            {/* Step circle and label */}
                            <div
                                className="relative z-10 flex flex-col items-center min-w-0"
                                aria-current={isActive ? 'step' : undefined}
                                aria-label={`Step ${step.num}: ${step.name}`}
                            >
                                <div className="flex flex-col items-center gap-1.5">
                                    <motion.div
                                        className={clsx(
                                            'relative flex h-7 w-7 items-center justify-center rounded-full border transition-colors duration-200',
                                            isActive
                                                ? 'border-white/[0.22] bg-white/[0.045] text-foreground'
                                                : isCompleted
                                                    ? 'border-emerald-500/55 bg-emerald-500/10 text-emerald-300'
                                                    : 'border-white/[0.14] bg-white/[0.02] text-muted-foreground/76'
                                        )}
                                    >
                                        {isCompleted ? (
                                            <motion.div
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                            >
                                                <Check weight="bold" size={13} />
                                            </motion.div>
                                        ) : (
                                            <step.icon
                                                weight={isActive ? "fill" : "regular"}
                                                size={14}
                                                className={clsx(isActive ? "text-foreground" : "")}
                                            />
                                        )}
                                    </motion.div>

                                    <span className={clsx(
                                        'text-[10px] font-medium tracking-[0.08em] transition-colors',
                                        isActive ? 'text-foreground/95' : isCompleted ? 'text-muted-foreground/86' : 'text-muted-foreground/68'
                                    )}>
                                        {step.name}
                                    </span>
                                </div>
                            </div>

                            {/* Line segment connecting to next step */}
                            {!isLast && (
                                <div 
                                    className="relative mx-2 flex-1"
                                    style={{ marginTop: '-18px' }}
                                >
                                    <div className="absolute left-0 top-0 h-px w-full rounded-full bg-white/[0.14]" />
                                    {isCompleted && (
                                        <motion.div 
                                            className="absolute left-0 top-0 h-px w-full rounded-full bg-emerald-400/70"
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 0.3, ease: 'easeOut' }}
                                        />
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
