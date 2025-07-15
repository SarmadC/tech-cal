'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: 'Unified Tech Events',
    description: 'All major tech conferences, keynotes, and releases in one place. Never miss Apple, Google, Microsoft, or startup events.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
    title: 'Smart Filtering',
    description: 'Filter by categories like AI/ML, Web Dev, Mobile, Cloud, Security, and more. See only what matters to you.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: 'Real-time Updates',
    description: 'Get notified about schedule changes, new events, and livestream links. Stay ahead of the curve.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    title: 'Personalized Experience',
    description: 'AI-powered recommendations based on your interests. Discover events you didn\'t know you needed.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Calendar Integration',
    description: 'Export to Google Calendar, Outlook, or download .ics files. Seamlessly integrate with your workflow.'
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Multi-platform',
    description: 'Access from web, mobile, or desktop. Your tech calendar follows you everywhere.'
  }
];

const testimonials = [
  {
    quote: "TechCalendar has completely changed how I stay updated with the tech world. I haven't missed a major announcement since I started using it.",
    author: "Sarah Chen",
    role: "Senior Developer at Meta",
    avatar: "SC"
  },
  {
    quote: "As a startup founder, keeping track of industry events is crucial. TechCalendar makes it effortless. It's become an essential tool for our team.",
    author: "Marcus Rodriguez",
    role: "CEO at TechFlow",
    avatar: "MR"
  },
  {
    quote: "The filtering and personalization features are incredible. I only see events relevant to AI/ML, saving me hours of research time each week.",
    author: "Priya Patel",
    role: "ML Engineer at Google",
    avatar: "PP"
  }
];

const stats = [
  { number: '500+', label: 'Tech Events' },
  { number: '50K+', label: 'Active Users' },
  { number: '99.9%', label: 'Uptime' },
  { number: '4.9/5', label: 'User Rating' }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="h-16 bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-gray-900">TechCalendar</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-sm text-gray-600 hover:text-blue-600">Features</Link>
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-blue-600">Pricing</Link>
            <Link href="/blog" className="text-sm text-gray-600 hover:text-blue-600">Blog</Link>
            <Link href="/api-docs" className="text-sm text-gray-600 hover:text-blue-600">API</Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-blue-600"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all text-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Never Miss a
              <span className="text-blue-600"> Tech Event</span>
              <br />Again
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              The world of tech moves fast. TechCalendar brings together conferences, keynotes, 
              product launches, and developer events from across the industry into one beautiful, 
              intuitive calendar.
            </p>
            
            {/* Hero Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/calendar"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all"
              >
                Launch Calendar
              </Link>
              <Link
                href="#features"
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-4 px-8 rounded-xl transition-all border border-gray-200"
              >
                Learn More
              </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="text-3xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-500 mt-2">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-20">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Stay Connected
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built for developers, designers, founders, and tech enthusiasts who want to stay ahead.
            </p>
          </div>

          {/* Features Grid - Exactly 6 items in 3x2 layout */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-blue-300 transition-all hover:shadow-lg group"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Built by Tech Enthusiasts,
                <br />For Tech Enthusiasts
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                We understand the struggle of keeping up with the fast-paced tech world. 
                That's why we built TechCalendar – to create a single source of truth for 
                all tech events globally.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                Our team continuously curates and verifies events from hundreds of sources, 
                ensuring you have access to accurate, up-to-date information about conferences, 
                product launches, hackathons, and developer meetups.
              </p>
              <div className="flex items-center space-x-8">
                <div>
                  <div className="text-2xl font-bold text-blue-600">2021</div>
                  <div className="text-sm text-gray-500">Founded</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">24/7</div>
                  <div className="text-sm text-gray-500">Monitoring</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">100+</div>
                  <div className="text-sm text-gray-500">Sources</div>
                </div>
              </div>
            </div>
            
            {/* Image/Visual */}
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-50 rounded-3xl flex items-center justify-center">
                <div className="w-3/4 h-3/4 bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
                  <div className="h-full bg-gray-50 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-20">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loved by Tech Professionals
            </h2>
            <p className="text-lg text-gray-600">
              Join thousands who never miss important tech events
            </p>
          </div>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl border border-gray-200"
              >
                <p className="text-gray-600 mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Stay Ahead?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 50,000+ tech professionals who trust TechCalendar
          </p>
          <Link
            href="/calendar"
            className="inline-block bg-white hover:bg-gray-100 text-blue-600 font-semibold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}