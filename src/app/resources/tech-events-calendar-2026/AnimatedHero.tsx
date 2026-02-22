"use client";

import { motion } from "motion/react";
import Link from 'next/link';
import { ArrowRightIcon } from '@phosphor-icons/react';

interface AnimatedHeroProps {
    totalCount: number | null;
}

export function AnimatedHero({ totalCount }: AnimatedHeroProps) {
    return (
        <div className="h-[38vh] min-h-[300px] max-h-[420px] flex items-end justify-center pb-10 sm:pb-14">
            <div className="max-w-[1600px] px-6 sm:px-8 w-full mx-auto">
                <div className="max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-foreground-primary/5 text-foreground-secondary text-xs font-medium tracking-wide uppercase mb-6 border border-foreground-primary/10">
                            2026 Resource
                        </span>
                    </motion.div>

                    <motion.h1
                        className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-foreground-primary tracking-tight leading-[1.08] mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                    >
                        The Complete <br />
                        Tech Calendar for 2026
                    </motion.h1>

                    <motion.p
                        className="text-base md:text-lg text-foreground-secondary max-w-2xl leading-relaxed mb-6"
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
                        className="flex items-center gap-3"
                    >
                        <Link
                            href="/events"
                            className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-foreground-primary text-background-main text-[15px] font-medium hover:opacity-90 hover:scale-[1.02] transition-all duration-200"
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
