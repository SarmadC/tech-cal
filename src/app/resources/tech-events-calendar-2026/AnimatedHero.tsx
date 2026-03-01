"use client";

import { motion } from "motion/react";
import Link from 'next/link';
import { ArrowRightIcon } from '@phosphor-icons/react';

interface AnimatedHeroProps {
    totalCount: number | null;
}

export function AnimatedHero({ totalCount }: AnimatedHeroProps) {
    return (
        <div className="flex items-end justify-center px-0 pt-20 pb-8 sm:h-[30vh] sm:min-h-[230px] sm:max-h-[320px] sm:pt-0 sm:pb-10">
            <div className="max-w-[1600px] px-6 sm:px-8 w-full mx-auto">
                <div className="max-w-5xl">
                    <motion.h1
                        className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground-primary tracking-tight leading-[1.08] mb-4 whitespace-normal"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                    >
                        The Complete Tech Calendar for 2026
                    </motion.h1>

                    <motion.p
                        className="text-base md:text-lg text-foreground-secondary max-w-2xl lg:max-w-none leading-relaxed mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                    >
                        Browse {totalCount ? `${totalCount}+` : 'hundreds of'} conferences, hackathons, and meetups.
                        The definitive directory for developer events.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                        className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
                    >
                        <Link
                            href="/events"
                            className="inline-flex w-full sm:w-auto justify-center items-center gap-2 h-12 px-8 rounded-full bg-accent-primary text-accent-primary-foreground text-[15px] font-medium hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
                        >
                            Explore All Events
                            <ArrowRightIcon size={16} weight="bold" />
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
