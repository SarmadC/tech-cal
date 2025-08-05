// This file decouples static content from the component logic.

import {
    Filter,
    SatelliteDish,
    Link as LinkIcon,
    BarChart3,
    Users,
} from 'lucide-react';

export const heroStats = [
    { number: '500+', label: 'Event Sources' },
    { number: '50K+', label: 'Developers' },
    { number: '10h', label: 'Saved/Week' },
];

export const features = [
    {
        icon: <Filter />, // Now correctly parsed as a JSX element
        title: 'Smart Filtering',
        description: "AI learns your interests and filters out noise. See ML breakthroughs, skip crypto hype. Your feed, your rules.",
    },
    {
        icon: <SatelliteDish />, // Correctly parsed
        title: 'Real-time Updates',
        description: "Schedule changes, surprise announcements, livestream links. We monitor 500+ sources so you don't have to.",
    },
    {
        icon: <LinkIcon />, // Correctly parsed
        title: 'Calendar Integration',
        description: "Syncs with Google Calendar, Outlook, and Apple Calendar. One-click to add events with all the details you need.",
    },
    {
        icon: <BarChart3 />, // Correctly parsed
        title: 'Event Analytics',
        description: "Track which events matter most to your industry. See trending topics and attendance insights.",
    },
    {
        icon: <Users />, // Correctly parsed
        title: 'Team Collaboration',
        description: "Share calendars with your team. Coordinate attendance and never double-book important events.",
    },
];

export const eventsData = [
    { title: "Google I/O 2025", company: "Google", date: "May 14", type: "Conference" },
    { title: "WWDC 2025", company: "Apple", date: "Jun 10", type: "Developer Conference" },
    { title: "Microsoft Build", company: "Microsoft", date: "May 21", type: "Developer Conference" },
    { title: "OpenAI DevDay", company: "OpenAI", date: "Mar 15", type: "AI Conference" },
    { title: "React Conf", company: "Meta", date: "Apr 22", type: "Framework Conference" },
    { title: "Next.js Conf", company: "Vercel", date: "Oct 25", type: "Framework Conference" },
    { title: "Chrome Dev Summit", company: "Google", date: "Nov 12", type: "Web Development" },
    { title: "TensorFlow Dev Summit", company: "Google", date: "Aug 30", type: "ML Conference" },
    { title: "AWS re:Invent", company: "Amazon", date: "Nov 27", type: "Cloud Conference" },
    { title: "DockerCon", company: "Docker", date: "Sep 18", type: "DevOps Conference" },
    { title: "KubeCon", company: "CNCF", date: "Oct 12", type: "Cloud Native" },
    { title: "GitHub Universe", company: "GitHub", date: "Nov 08", type: "Developer Conference" }
];