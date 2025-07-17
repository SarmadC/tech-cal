// src/app/dashboard/page.tsx (Updated)

'use client';

import { useState } from 'react';
import Link from 'next/link';
import GrowthDashboardPage from './growth/page'; // Import the new component

const mockUserData = {
  name: 'Sarah Chen',
  email: 'sarah@example.com',
  plan: 'Pro',
  eventsTracked: 47,
  upcomingEvents: 12,
  apiCalls: 3420,
  apiLimit: 10000
};

const recentEvents = [
  { id: 1, title: 'Google I/O 2024', date: '2024-05-14', category: 'Conference', color: '#4285F4' },
  { id: 2, title: 'WWDC 2024', date: '2024-06-10', category: 'Conference', color: '#007AFF' },
  { id: 3, title: 'GitHub Universe', date: '2024-11-08', category: 'Conference', color: '#24292e' },
  { id: 4, title: 'React 19 Release', date: '2024-03-15', category: 'Release', color: '#61DAFB' },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-background-main pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground-primary mb-2">
            Welcome back, {mockUserData.name.split(' ')[0]}
          </h1>
          <p className="text-foreground-secondary">
            Manage your calendar preferences and track your tech events
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground-tertiary">Events Tracked</h3>
              <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-foreground-primary">{mockUserData.eventsTracked}</p>
            <p className="text-xs text-foreground-tertiary mt-1">This month</p>
          </div>

          <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground-tertiary">Upcoming Events</h3>
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-foreground-primary">{mockUserData.upcomingEvents}</p>
            <p className="text-xs text-foreground-tertiary mt-1">Next 30 days</p>
          </div>

          <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground-tertiary">API Usage</h3>
              <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-foreground-primary">
              {mockUserData.apiCalls.toLocaleString()}
            </p>
            <p className="text-xs text-foreground-tertiary mt-1">
              of {mockUserData.apiLimit.toLocaleString()} limit
            </p>
          </div>

          <div className="bg-accent-primary rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white/80">Current Plan</h3>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-2xl font-bold">{mockUserData.plan}</p>
            <Link href="/pricing" className="text-xs text-white/80 hover:text-white mt-1 inline-block">
              Upgrade plan →
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border-color mb-6">
          <nav className="flex space-x-8">
            {['overview', 'growth', 'settings', 'api-keys', 'billing'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-transparent text-foreground-tertiary hover:text-foreground-primary'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Events */}
            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
              <h2 className="text-lg font-semibold text-foreground-primary mb-4">
                Recently Added Events
              </h2>
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-background-main rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground-primary">{event.title}</p>
                        <p className="text-xs text-foreground-tertiary">{event.date}</p>
                      </div>
                    </div>
                    <span className="text-xs text-foreground-tertiary bg-background-tertiary px-2 py-1 rounded">
                      {event.category}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/calendar" className="block text-center text-sm text-accent-primary hover:underline mt-4">
                View all events →
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
              <h2 className="text-lg font-semibold text-foreground-primary mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link href="/calendar" className="flex items-center justify-between p-4 bg-background-main rounded-lg hover:bg-background-tertiary transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground-primary">Browse Calendar</p>
                      <p className="text-xs text-foreground-tertiary">View and filter tech events</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-foreground-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link href="/api-docs" className="flex items-center justify-between p-4 bg-background-main rounded-lg hover:bg-background-tertiary transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground-primary">API Documentation</p>
                      <p className="text-xs text-foreground-tertiary">Integrate with your apps</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-foreground-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'growth' && (
          <GrowthDashboardPage />
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
              <h2 className="text-lg font-semibold text-foreground-primary mb-6">
                Notification Preferences
              </h2>
              <div className="space-y-4">
                {[
                  { id: 'email', label: 'Email notifications', description: 'Receive updates about new events' },
                  { id: 'browser', label: 'Browser notifications', description: 'Get instant alerts' },
                  { id: 'weekly', label: 'Weekly digest', description: 'Summary of upcoming events' },
                ].map((setting) => (
                  <label key={setting.id} className="flex items-center justify-between p-4 bg-background-main rounded-lg cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-foreground-primary">{setting.label}</p>
                      <p className="text-xs text-foreground-tertiary">{setting.description}</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 text-accent-primary rounded focus:ring-accent-primary"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div className="max-w-4xl">
            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground-primary">
                  API Keys
                </h2>
                <button className="bg-accent-primary hover:bg-accent-primary-hover text-white font-medium py-2 px-4 rounded-lg transition-all text-sm">
                  Generate New Key
                </button>
              </div>
              <div className="bg-background-main rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground-primary">Production API Key</p>
                    <p className="text-xs text-foreground-tertiary mt-1">Created on Jan 15, 2024</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm font-mono text-foreground-secondary bg-background-tertiary px-3 py-1 rounded">
                      tc_live_a1b2c3d4...
                    </code>
                    <button className="text-accent-primary hover:text-accent-primary-hover">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="max-w-4xl">
            <div className="bg-background-secondary rounded-xl p-6 border border-border-color mb-6">
              <h2 className="text-lg font-semibold text-foreground-primary mb-4">
                Current Subscription
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground-primary">Pro Plan</p>
                  <p className="text-foreground-secondary">$9/month • Renews on Feb 15, 2024</p>
                </div>
                <Link href="/pricing" className="bg-accent-primary hover:bg-accent-primary-hover text-white font-medium py-2 px-4 rounded-lg transition-all text-sm">
                  Change Plan
                </Link>
              </div>
            </div>

            <div className="bg-background-secondary rounded-xl p-6 border border-border-color">
              <h3 className="text-lg font-semibold text-foreground-primary mb-4">
                Billing History
              </h3>
              <div className="space-y-3">
                {[
                  { date: 'Jan 15, 2024', amount: '$9.00', status: 'Paid' },
                  { date: 'Dec 15, 2023', amount: '$9.00', status: 'Paid' },
                  { date: 'Nov 15, 2023', amount: '$9.00', status: 'Paid' },
                ].map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-background-main rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground-primary">{invoice.date}</p>
                      <p className="text-xs text-foreground-tertiary">Pro Plan</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-foreground-primary">{invoice.amount}</span>
                      <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}