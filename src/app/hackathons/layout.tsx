// src/app/hackathons/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hackathons - TechCal',
  description: 'Discover and participate in exciting hackathons. Find teams, register for events, and showcase your coding skills.',
  keywords: ['hackathons', 'coding competitions', 'tech events', 'programming contests', 'developers'],
  openGraph: {
    title: 'Hackathons - TechCal',
    description: 'Discover and participate in exciting hackathons. Find teams, register for events, and showcase your coding skills.',
    type: 'website',
  },
};

export default function HackathonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}