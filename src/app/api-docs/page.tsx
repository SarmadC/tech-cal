// src/app/api-docs/page.tsx (Updated with Coming Soon message)

'use client';

import Link from 'next/link';
import { Code2, Calendar, Bell, Zap } from 'lucide-react';

export default function ApiDocsPage() {
    return (
        <div className="min-h-screen bg-background-main pt-20">
            {/* Header */}
            <section className="py-16 px-4 bg-background-secondary">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground-primary mb-6">
                        API Coming Soon
                    </h1>
                    <p className="text-xl text-foreground-secondary max-w-3xl mx-auto">
                        We are building a powerful API to help you access our curated tech event data programmatically. Stay tuned for updates!
                    </p>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Coming Soon Content */}
                <div className="text-center mb-16">
                    <div className="w-32 h-32 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Code2 className="w-16 h-16 text-accent-primary" />
                    </div>

                    <h2 className="text-3xl font-bold text-foreground-primary mb-4">
                        API in Development
                    </h2>
                    <p className="text-lg text-foreground-secondary mb-8 max-w-2xl mx-auto">
                        Our development team is working hard to create a comprehensive API that will
                        allow you to access our curated tech event data programmatically.
                    </p>

                    {/* Email Signup for API Updates */}
                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-color max-w-md mx-auto">
                        <h3 className="text-xl font-semibold text-foreground-primary mb-4">
                            Get notified when it is ready
                        </h3>
                        <div className="flex flex-col space-y-3">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="w-full px-4 py-3 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary"
                            />
                            <button className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all">
                                Notify Me
                            </button>
                        </div>
                    </div>
                </div>

                {/* Planned Features */}
                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    <div className="bg-background-secondary rounded-xl p-6 border border-border-color text-center">
                        <Calendar className="w-12 h-12 text-accent-primary mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground-primary mb-2">
                            Event Data Access
                        </h3>
                        <p className="text-foreground-secondary">
                            Retrieve comprehensive tech event information including schedules, locations, and organizers.
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-xl p-6 border border-border-color text-center">
                        <Bell className="w-12 h-12 text-accent-primary mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground-primary mb-2">
                            Real-time Webhooks
                        </h3>
                        <p className="text-foreground-secondary">
                            Get instant notifications when new events are added or when existing events are updated.
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-xl p-6 border border-border-color text-center">
                        <Zap className="w-12 h-12 text-accent-primary mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground-primary mb-2">
                            Fast & Reliable
                        </h3>
                        <p className="text-foreground-secondary">
                            High-performance API with 99.9% uptime SLA and comprehensive rate limiting.
                        </p>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-foreground-primary mb-4">
                        In the meantime, explore TechCalendar
                    </h3>
                    <p className="text-foreground-secondary mb-8">
                        Start using our platform today to discover and track the tech events that matter to you.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/calendar"
                            className="bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-6 rounded-lg transition-all"
                        >
                            Browse Events
                        </Link>
                        <Link
                            href="/signup"
                            className="bg-background-secondary hover:bg-background-tertiary text-foreground-primary font-semibold py-3 px-6 rounded-lg transition-all border border-border-color"
                        >
                            Create Account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}