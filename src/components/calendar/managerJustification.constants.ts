
import { RECOMMENDATION_THRESHOLDS } from '@/config/recommendationThresholds';

export const IMPACT_LABELS = {
  HIGH: 'High Impact',
  STRONG: 'Strong Match',
  GOOD: 'Good Match',
  FAIR: 'Fair Match',
} as const;

// Derived from the shared recommendation thresholds so UI bucketing
// can't drift from the rest of the system.
export const SCORE_THRESHOLDS = {
  HIGH: RECOMMENDATION_THRESHOLDS.BUCKETS.HIGH,
  STRONG: RECOMMENDATION_THRESHOLDS.BUCKETS.MODERATE,
  GOOD: RECOMMENDATION_THRESHOLDS.BUCKETS.LOW,
} as const;

export const COST_DISPLAY = {
  NOT_LISTED: 'Cost not listed',
} as const;

export const TIME_COMMITMENT = {
  NOT_SPECIFIED: 'Duration not specified',
  MINUTES: (min: number) => `${min} minutes`,
  HOURS: (hrs: number) => Number.isInteger(hrs) ? `${hrs} hour${hrs === 1 ? '' : 's'}` : `${hrs.toFixed(1)} hours`,
} as const;

export const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Please sign in to generate this manager justification.',
  ONBOARDING_REQUIRED: 'Please complete career onboarding to generate this justification.',
  EVENT_NOT_FOUND: 'This event could not be found.',
  UNABLE_TO_GENERATE: 'Unable to generate a manager justification for this event right now.',
  TOO_MANY_REQUESTS: 'Too many requests. Please try again in a minute.',
  GENERIC_FAILURE: 'Failed to load manager justification.',
  TIMEOUT: 'Generating your report is taking longer than expected. Please try again.',
} as const;

export const EMAIL_TEMPLATE = {
  SUBJECT: 'Proposal to attend {eventName}',
  OPENING: 'Hi {managerName},\n\nThere’s an upcoming event that I believe presents an incredible opportunity for both our team\'s advancement and my personal growth.',
  EVENT_DETAILS: '{eventName} is scheduled to take place on {dateRange} at {location}.',
  REASONS_HEADER: 'Here are some key reasons why attending this conference would be highly beneficial for our team and the company:',
  CLOSING: 'I\'m confident that my participation in {eventName} will deliver substantial benefits for our team and the company. I\'m committed to maximizing this opportunity by actively engaging in all sessions, networking events, and hands-on experiences.\n\nThank you for considering my proposal. I look forward to discussing this opportunity further and addressing any questions you may have.',
} as const;

export const MARKDOWN_TEMPLATES = {
  TITLE: '# Event Attendance Request',
  GENERATED_LABEL: 'Generated:',
  PREPARED_FOR_LABEL: 'Prepared for:',
  SECTION_EXECUTIVE_SUMMARY: '## Executive Summary',
  SECTION_BUSINESS_CONTEXT: '## Context',
  SECTION_EVENT_OVERVIEW: '## Event',
  SECTION_CAREER_IMPACT: '## Impact Analysis',
  SECTION_WHY_MATTERS: '## Why This Matters',
  SECTION_SKILLS: '## Skills to Acquire',
  SECTION_GOALS: '## Goals Advanced',
  SECTION_INVESTMENT: '## Investment',
  SECTION_RISK: '## Risk Management',
  SECTION_DELIVERABLES: '## Return on Investment',
  SECTION_APPROVAL_REQUEST: '## Action',
  ROI_DEFAULT: 'Primary ROI: Direct alignment with current role progression and team goals.',
  ROI_PREFIX: 'Primary ROI:',
  EXEC_SUMMARY_TEMPLATE: 'I am requesting approval to attend {eventTitle} to advance my role as {role}. This event matches {score}/100 with my profile and directly supports our team objective: {objective}.',
  APPROVAL_REQUEST_TEMPLATE: 'I am requesting approval for the estimated budget of {cost} to attend this event. I will capture key learnings and present them to the team by {followUpDate}.',
  REGISTRATION_PREFIX: 'Registration:',
} as const;

export const UI_STRINGS = {
  TITLE_REQUEST: 'Approval Request',
  LOADING: 'Generating approval brief...',
  TRY_AGAIN: 'Try Again',
  // Section Headers (Manager Centric)
  APPROVAL_CONTEXT: 'Approval Context',
  MANAGER_NAME: 'Manager Name',
  FOLLOW_UP_DATE: 'Share-out Date',
  TEAM_OBJECTIVE: 'Team Goal Alignment',
  TEAM_OBJECTIVE_PLACEHOLDER: 'Which team goal does this training support?',
  DELIVERABLES: 'What you will bring back',
  DELIVERABLES_PLACEHOLDER: 'Key artifacts (e.g., "Strategy document", "Team demo")',
  RISK_MITIGATION: 'Coverage Plan',
  RISK_MITIGATION_PLACEHOLDER: 'Who covers your work while away?',

  EXECUTIVE_SUMMARY: 'Summary Pitch',

  LABEL_EVENT: 'Event',
  LABEL_DATE: 'Date',
  LABEL_LOCATION: 'Location',
  LABEL_ORGANIZER: 'Organizer',
  LABEL_FORMAT: 'Format',
  LABEL_COST: 'Cost',

  CAREER_IMPACT_SCORE: 'Impact Score',
  BUSINESS_ALIGNMENT: 'Strategic Value',
  SKILLS_DEVELOPMENT: 'Skills to Acquire',
  GOALS_ALIGNMENT: 'Growth Alignment',
  ESTIMATED_COST: 'Budget',
  ESTIMATED_TIME: 'Time Away',
  WHY_MATTERS: 'Strategic Value',
  
  COPY_CLIPBOARD: 'Copy Brief',
  COPIED: 'Copied',
  DOWNLOAD_PDF: 'Download PDF',
  NOT_SPECIFIED: 'TBD',
  DIALOG_DESCRIPTION: 'Build a data-backed business case for your attendance.',
} as const;

export const PRINT_STYLES = `
  @page {
    margin: 0;
    size: auto;
  }
  @media print {
    button, nav, .pagination, .no-print, header, footer { display: none !important; }
    body { 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
        margin: 1in 1.25in !important;
    }
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0 auto;
    color: #111827; /* Darker main text based on CV contrast */
    line-height: 1.5;
    background: #fff;
    -webkit-font-smoothing: antialiased;
    max-width: 760px; /* Slightly wider for the 2-col layout */
    padding: 60px 40px;
  }

  /* CV Grid System */
  .cv-row {
    display: grid;
    grid-template-columns: 140px 1fr; /* Left Header Col, Right Content Col */
    gap: 32px;
    margin-bottom: 40px; /* Generous spacing between sections */
    page-break-inside: avoid;
  }

  .cv-label {
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6b7280; /* Muted label */
    text-align: left; /* Left align to match header */
    padding-top: 4px; /* Optical alignment with body text */
  }

  .cv-content {
    font-size: 13px;
    color: #111827;
  }

  /* Typography */
  h1 {
    font-size: 16px; /* Much smaller, CV name style */
    font-weight: 700;
    color: #111827;
    margin: 0 0 4px 0;
    letter-spacing: -0.2px;
  }

  h2 {
    /* Used for sub-headers within the content column if needed */
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 8px 0;
  }

  p { margin: 0 0 12px 0; opacity: 0.9; }
  p:last-child { margin-bottom: 0; }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  
  li {
    position: relative;
    padding-left: 0;
    margin-bottom: 6px;
    color: #374151;
  }
  /* Remove bullets for the sleek CV look, or keep them very subtle? 
     The CV image has paragraphs. Let's keep subtle bullets for lists but cleaner */
  li.bulleted {
    padding-left: 14px;
  }
  li.bulleted::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #9ca3af;
  }

  a { 
    color: #111827; 
    text-decoration: none; 
    border-bottom: 1px solid #e5e7eb; 
  }

  /* Header Section special case */
  .header-bg {
    margin-bottom: 60px;
    padding-bottom: 20px;
    border-bottom: 1px solid #f3f4f6; /* Very subtle separation */
  }
  
  .header-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: flex-end;
  }

  .header-name {
    font-size: 24px; 
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #111827;
    margin-bottom: 4px;
  }

  .header-title {
    font-size: 13px;
    color: #6b7280;
    font-weight: 400;
  }

  .header-contact {
    text-align: right;
    font-size: 11px;
    color: #6b7280;
    line-height: 1.6;
  }

  /* Sub-grids for content (e.g. Event Details) */
  .data-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px 24px;
  }

  .data-item {
     margin-bottom: 8px;
  }
  
  .data-label {
    font-size: 10px;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 2px;
    letter-spacing: 0.5px;
  }

  .data-value {
    font-size: 13px;
    font-weight: 500;
    color: #111827;
  }

  /* Impact Score - Integrated into the flow */
  .score-large {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
  }
  .score-meta {
    font-size: 11px;
    color: #6b7280;
    margin-left: 8px;
  }

  /* Email Section Styles */
  .email-container {
    padding-bottom: 40px;
    margin-bottom: 40px;
    border-bottom: 2px dashed #e5e7eb;
  }
  
  .email-header {
    background: #f9fafb;
    padding: 16px;
    border-radius: 6px;
    margin-bottom: 24px;
    border: 1px solid #e5e7eb;
  }

  .email-meta {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
    font-family: monospace; /* Tech feel for email headers */
  }

  .email-body {
    font-size: 14px;
    line-height: 1.6;
    color: #374151;
    white-space: pre-wrap; /* Preserve whitespace from templates */
  }

  .email-body p {
    margin-bottom: 16px;
  }

  .cut-line {
    text-align: center;
    font-size: 10px;
    color: #9ca3af;
    margin-top: -10px;
    background: #fff;
    width: max-content;
    padding: 0 12px;
    margin-left: auto;
    margin-right: auto;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;
