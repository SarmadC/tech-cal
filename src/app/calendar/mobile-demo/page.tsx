'use client';

import React, { useState } from 'react';
import { Event, EventType, AppProfile } from '@/types';
import MobileCalendarApp from '@/components/calendar/mobile/MobileCalendarApp';

// Mock data for demonstration
const mockEvents: Event[] = [
  {
    id: '1',
    createdAt: new Date().toISOString(),
    title: 'Tech Conference 2024',
    description: 'Annual technology conference featuring the latest innovations',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
    location: 'San Francisco, CA',
    eventTypeId: 'conference',
    organizer: 'Tech Events Inc',
    status: 'confirmed',
    sourceUrl: 'https://example.com/event1',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/register',
    tags: [],
    color: '#3b82f6'
  },
  {
    id: '2',
    createdAt: new Date().toISOString(),
    title: 'React Workshop',
    description: 'Learn React fundamentals and best practices',
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
    location: 'Virtual',
    eventTypeId: 'workshop',
    organizer: 'React Academy',
    status: 'confirmed',
    sourceUrl: 'https://example.com/event2',
    livestreamUrl: 'https://zoom.us/j/123456789',
    registrationUrl: 'https://example.com/register',
    tags: [],
    color: '#10b981'
  },
  {
    id: '3',
    createdAt: new Date().toISOString(),
    title: 'Design System Workshop',
    description: 'Building consistent design systems',
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    location: 'New York, NY',
    eventTypeId: 'workshop',
    organizer: 'Design Co',
    status: 'confirmed',
    sourceUrl: 'https://example.com/event3',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/register',
    tags: [],
    color: '#8b5cf6'
  },
  {
    id: '4',
    createdAt: new Date().toISOString(),
    title: 'Product Management Summit',
    description: 'Advanced product management strategies',
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
    location: 'Austin, TX',
    eventTypeId: 'conference',
    organizer: 'PM Institute',
    status: 'confirmed',
    sourceUrl: 'https://example.com/event4',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/register',
    tags: [],
    color: '#f59e0b'
  },
  {
    id: '5',
    createdAt: new Date().toISOString(),
    title: 'AI & Machine Learning Meetup',
    description: 'Latest trends in AI and ML',
    startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    location: 'Seattle, WA',
    eventTypeId: 'meetup',
    organizer: 'AI Community',
    status: 'confirmed',
    sourceUrl: 'https://example.com/event5',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/register',
    tags: [],
    color: '#ef4444'
  }
];

const mockCategories: EventType[] = [
  {
    id: 'conference',
    name: 'Conference',
    color: '#3b82f6',
    description: 'Large-scale professional events'
  },
  {
    id: 'workshop',
    name: 'Workshop',
    color: '#10b981',
    description: 'Hands-on learning sessions'
  },
  {
    id: 'meetup',
    name: 'Meetup',
    color: '#8b5cf6',
    description: 'Community gatherings'
  }
];

const mockProfile: AppProfile = {
  id: 'demo-user',
  fullName: 'Demo User',
  avatarUrl: null,
  timezone: 'America/New_York',
  preferences: {
    theme: 'light',
    notifications: true
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export default function MobileDemoPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handleEventSelect = (event: Event) => {
    console.log('Event selected:', event);
    // In a real app, this would open an event detail modal or navigate to event page
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  return (
    <div className="mobile-demo-container">
      <div className="mobile-demo-header">
        <h1>Mobile Calendar Demo</h1>
        <p>Experience the enhanced mobile month view with touch interactions</p>
      </div>
      
      <div className="mobile-demo-device">
        <div className="mobile-device-frame">
          <div className="mobile-device-screen">
            <MobileCalendarApp
              events={mockEvents}
              currentDate={currentDate}
              categories={mockCategories}
              profile={mockProfile}
              onEventSelect={handleEventSelect}
              onDateChange={handleDateChange}
            />
          </div>
        </div>
      </div>
      
      <div className="mobile-demo-features">
        <h2>Features Demonstrated</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>📱 Mobile-First Design</h3>
            <p>Optimized for touch interactions with responsive layouts</p>
          </div>
          <div className="feature-card">
            <h3>🗓️ Month View</h3>
            <p>Complete monthly calendar with event indicators and navigation</p>
          </div>
          <div className="feature-card">
            <h3>👆 Touch Gestures</h3>
            <p>Swipe navigation, pull-to-refresh, and tap interactions</p>
          </div>
          <div className="feature-card">
            <h3>🎨 Modern UI</h3>
            <p>Clean design with smooth animations and visual feedback</p>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .mobile-demo-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
        }
        
        .mobile-demo-header {
          text-align: center;
          color: white;
        }
        
        .mobile-demo-header h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        
        .mobile-demo-header p {
          font-size: 1.125rem;
          opacity: 0.9;
        }
        
        .mobile-demo-device {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .mobile-device-frame {
          width: 375px;
          height: 812px;
          background: #1a1a1a;
          border-radius: 40px;
          padding: 8px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          position: relative;
        }
        
        .mobile-device-frame::before {
          content: '';
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 4px;
          background: #333;
          border-radius: 2px;
        }
        
        .mobile-device-screen {
          width: 100%;
          height: 100%;
          background: white;
          border-radius: 32px;
          overflow: hidden;
          position: relative;
        }
        
        .mobile-demo-features {
          max-width: 1200px;
          width: 100%;
          background: white;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        .mobile-demo-features h2 {
          text-align: center;
          margin-bottom: 2rem;
          color: #1a1a1a;
        }
        
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        
        .feature-card {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        
        .feature-card h3 {
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }
        
        .feature-card p {
          color: #64748b;
          line-height: 1.6;
        }
        
        @media (max-width: 768px) {
          .mobile-demo-container {
            padding: 1rem;
          }
          
          .mobile-device-frame {
            width: 320px;
            height: 640px;
          }
          
          .mobile-demo-header h1 {
            font-size: 2rem;
          }
          
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}