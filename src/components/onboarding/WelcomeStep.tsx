import React from 'react';
import { Sparkle, Target, Clock, Lock } from '@phosphor-icons/react';
import { motion } from './shared/StaticMotion';

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const staggerItem = {
    hidden: { opacity: 0, y: 10 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring" as const, stiffness: 400, damping: 30 }
    }
};

interface WelcomeStepProps {
    onStart: () => void;
    onSkip?: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStart, onSkip }) => {
    return (
        <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-12 text-center py-8"
        >
            {/* Hero Section */}
            <motion.div variants={staggerItem} className="space-y-6">
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring" as const, stiffness: 260, damping: 20, delay: 0.1 }}
                    className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 flex items-center justify-center border border-border/50 shadow-lg dark:shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)]"
                >
                    <Sparkle weight="fill" className="text-emerald-400 w-10 h-10" />
                </motion.div>

                <div className="space-y-3 max-w-lg mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
                        Let&apos;s personalize your experience
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        We&apos;ll help you discover events tailored to your career goals.
                    </p>
                </div>
            </motion.div>

            {/* Value Propositions */}
            <motion.div
                variants={staggerItem}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto"
            >
                {[
                    { icon: Target, title: "Personalized", desc: "Events matched to goals" },
                    { icon: Clock, title: "2 minutes", desc: "Quick and easy setup" },
                    { icon: Lock, title: "Private", desc: "Your data stays secure" }
                ].map((item) => (
                    <motion.div
                        key={item.title}
                        whileHover={{ y: -2 }}
                        className="p-5 rounded-2xl bg-card border border-border/50 backdrop-blur-sm transition-colors hover:bg-secondary/50"
                    >
                        <item.icon size={24} className="text-emerald-400 mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground/80">{item.desc}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* CTA */}
            <motion.div variants={staggerItem} className="pt-4 space-y-4">
                <button
                    onClick={onStart}
                    className="rounded-xl bg-primary px-10 py-4 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 dark:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                >
                    Get Started
                </button>

                {onSkip && (
                    <div>
                        <button
                            onClick={onSkip}
                            className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors"
                        >
                            Skip for now
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};
