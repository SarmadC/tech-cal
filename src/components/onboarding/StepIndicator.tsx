import React from 'react';
import { motion } from 'framer-motion';
import { User, Code, Target, Check } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
    className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, className }) => {
    // We only track the 3 main steps visually for simplicity, or 6 if expanded.
    // For this design, let's stick to the 3 main ones + optional aggregation if needed.
    // Given the design, condensing to 3 main phases (Role, Skills, Goals) is cleaner.
    // But if totalSteps is 6, we might want to show them differnetly.
    // Let's stick to the main 3 for the visual indicator as per plan.

    const steps = [
        { num: 1, name: 'Role', icon: User },
        { num: 2, name: 'Skills', icon: Code },
        { num: 3, name: 'Goals', icon: Target }
    ];

    // If we are in optional steps (4,5,6), we can highlight the last one or show a "More" state.
    // Simpler: Just map them directly if totalSteps <= 3, or adapt.
    // For now, let's focus on the first 3 as the "Core" onboarding.

    return (
        <div className={twMerge("w-full mb-10", className)}>
            <div className="flex items-center relative">
                {steps.map((step, index) => {
                    const isActive = currentStep === step.num;
                    const isCompleted = currentStep > step.num;
                    const isLast = index === steps.length - 1;
                    const isFirst = index === 0;
                    const prevCompleted = index > 0 && currentStep > steps[index - 1].num;

                    return (
                        <React.Fragment key={step.num}>
                            {/* Step circle and label */}
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="flex flex-col items-center gap-2">
                                    <motion.div
                                        className={clsx(
                                            "w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 relative",
                                            isActive
                                                ? "bg-background border-border shadow-lg dark:shadow-[0_0_15px_-3px_rgba(255,255,255,0.2)]"
                                                : isCompleted
                                                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"
                                                    : "bg-secondary/50 border-border/50 text-muted-foreground"
                                        )}
                                        // Metallic shine effect for active state
                                        animate={isActive ? {
                                            borderColor: ["hsl(var(--border))", "hsl(var(--border))", "hsl(var(--border))"]
                                        } : {}}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    >
                                        {isActive && (
                                            <div className="absolute inset-0 bg-gradient-to-tr from-foreground/5 via-foreground/10 to-transparent opacity-50 rounded-full" />
                                        )}

                                        {isCompleted ? (
                                            <motion.div
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                            >
                                                <Check weight="bold" size={16} />
                                            </motion.div>
                                        ) : (
                                            <step.icon
                                                weight={isActive ? "fill" : "regular"}
                                                size={18}
                                                className={clsx(isActive ? "text-foreground" : "")}
                                            />
                                        )}
                                    </motion.div>

                                    <span className={clsx(
                                        "text-[10px] font-medium uppercase tracking-wider transition-colors",
                                        isActive ? "text-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"
                                    )}>
                                        {step.name}
                                    </span>
                                </div>
                            </div>

                            {/* Line segment connecting to next step */}
                            {!isLast && (
                                <div 
                                    className="relative flex-1 h-[1.5px] mx-2"
                                    style={{ marginTop: '-24px' }}
                                >
                                    {/* Background line segment */}
                                    <div className="absolute top-0 left-0 w-full h-full bg-border/30 dark:bg-border/40 rounded-full" />
                                    {/* Progress line segment - only show if current step is completed */}
                                    {isCompleted && (
                                        <motion.div 
                                            className="absolute top-0 left-0 h-full bg-emerald-500/60 dark:bg-emerald-500/50 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                        />
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Active Progress Line (The Metallic Bar user liked) - positioned absolutely to connect active steps? 
                Actually, let's put it BELOW strictly as a progress indicator if we want to keep that exact element.
                OR, let's make the connections between steps metallic.
             */}
        </div>
    );
};
