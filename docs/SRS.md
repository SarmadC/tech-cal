# Software Requirements Specification (SRS)

## Kure-Cal: Career Operating System for Tech Events

**Version:** 1.0  
**Date:** March 19, 2026  
**Status:** Draft  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Database Requirements](#6-database-requirements)
7. [Appendices](#7-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document provides a comprehensive description of the Kure-Cal web application — a career operating system for discovering, planning, and acting on tech events that advance professional goals. This document is intended for developers, project managers, testers, and stakeholders involved in the development and maintenance of the platform.

### 1.2 Document Conventions

- ** shall** - Mandatory requirement
- ** should** - Recommended requirement
- ** may** - Optional requirement
- ** TBD** - To Be Determined

### 1.3 Intended Audience

- Software developers and engineers
- Product managers
- QA/testing teams
- DevOps and infrastructure teams
- Business stakeholders

### 1.4 Product Scope

Kure-Cal is a comprehensive career operating system that combines high-quality event curation, adaptive scoring algorithms, intelligent scheduling, and longitudinal analytics. The platform serves both individual contributors and teams, helping them focus on events that align with their career goals, skill development, and networking objectives.

### 1.5 References

- README.md - Project overview and setup instructions
- docs/COMMUNITY.md - Social features documentation
- docs/INGESTION_SETUP.md - Event ingestion pipeline documentation
- context/design-principles.md - UI/UX design guidelines

---

## 2. Overall Description

### 2.1 Product Perspective

Kure-Cal is a standalone web application built as a modern SaaS platform. It integrates with third-party services for authentication, payments, analytics, and data storage.

### 2.2 Product Functions

| Function Category | Description |
|------------------|-------------|
| **Event Discovery** | Personalized event recommendations based on career profiles, skills, and goals |
| **Calendar Management** | FullCalendar-powered scheduling with event tracking and reminders |
| **Career Dashboard** | Analytics and insights on goal progress, skill development, and networking outcomes |
| **Social Networking** | Follow/unfollow system, public profiles, and event attendance visibility |
| **Hackathon Coordination** | Team formation, matching, and participation management |
| **Event Ingestion** | Automated pipeline for collecting events from RSS, APIs, ICS, and HTML sources |
| **Administration** | Content moderation, user management, and system utilities |
| **Subscription Management** | Tiered access control with free, pro, and team plans |

### 2.3 User Classes and Characteristics

| User Class | Description | Characteristics |
|-----------|-------------|-----------------|
| **Anonymous Visitors** | Unauthenticated users browsing public content | Limited access to marketing pages, blog, and public event listings |
| **Registered Users** | Authenticated users with basic profiles | Access to discovery, calendar, and dashboard after onboarding |
| **Premium Subscribers** | Users with paid subscriptions | Full access to all features including unlimited bookmarks and calendar sync |
| **Team Members** | Users part of organizational subscriptions | Enhanced collaboration features and team analytics |
| **Administrators** | Users with elevated privileges | Access to moderation tools, ingestion pipeline, and system utilities |
| **Event Organizers** | Users submitting events to the platform | Limited admin capabilities for managing their submissions |

### 2.4 Operating Environment

| Component | Specification |
|-----------|---------------|
| **Frontend Runtime** | Next.js 15 (App Router), React 19 |
| **Server Runtime** | Node.js 20.9+ LTS |
| **Browser Support** | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| **Database** | PostgreSQL 15+ (via Supabase) |
| **Cache/Rate Limiting** | Upstash Redis, Vercel KV |
| **Hosting** | Vercel Edge/Serverless Runtime |

### 2.5 Design and Implementation Constraints

- Must maintain WCAG AA+ accessibility compliance
- All database operations must use Row Level Security (RLS)
- Third-party API rate limits must be respected
- Client bundles must be optimized for performance budgets
- Server-side rendering required for SEO-critical pages

### 2.6 Assumptions and Dependencies

| Assumption | Impact if Invalid |
|-----------|-------------------|
| Users have modern browsers with JavaScript enabled | Graceful degradation required for core functionality |
| Supabase service availability | Application requires fallback modes for auth and data |
| Paddle payment processor availability | Subscription flows would be impacted |
| Vercel infrastructure reliability | Alternative deployment strategy needed |

---

## 3. System Features

### 3.1 User Authentication and Authorization

#### 3.1.1 Authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-001 | The system shall support email/password authentication | High |
| AUTH-002 | The system shall support OAuth providers (Google, GitHub) | Medium |
| AUTH-003 | The system shall implement secure password reset flows | High |
| AUTH-004 | The system shall maintain session state with secure HTTP-only cookies | High |
| AUTH-005 | The system shall enforce email verification for new accounts | Medium |

#### 3.1.2 Authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-006 | The system shall enforce role-based access control (RBAC) | High |
| AUTH-007 | The system shall protect routes based on authentication status | High |
| AUTH-008 | The system shall enforce onboarding completion for protected features | High |
| AUTH-009 | The system shall support admin privileges for moderation | Medium |

### 3.2 Career Onboarding

#### 3.2.1 Profile Creation

| ID | Requirement | Priority |
|----|-------------|----------|
| ONB-001 | The system shall capture user's current role from predefined taxonomy | High |
| ONB-002 | The system shall collect seniority level and industry focus | High |
| ONB-003 | The system shall record company size preference | Medium |
| ONB-004 | The system shall support multi-step onboarding with progress persistence | High |

**Role Taxonomy Categories:**
- Engineering (12 roles: Software Engineer, Frontend Engineer, Backend Engineer, etc.)
- Data & AI (7 roles: Data Scientist, ML Engineer, AI Research Scientist, etc.)
- Product & Design (11 roles: Product Manager, UX Designer, Technical Program Manager, etc.)
- Leadership & Strategy (12 roles: Founder, CTO, VP of Engineering, etc.)

#### 3.2.2 Skills and Interests

| ID | Requirement | Priority |
|----|-------------|----------|
| ONB-005 | The system shall allow selection from 100+ predefined technical skills | High |
| ONB-006 | The system shall support proficiency levels (beginner, intermediate, advanced, expert) | Medium |
| ONB-007 | The system shall capture skills user wants to learn | High |
| ONB-008 | The system shall record interest areas from 30+ predefined categories | Medium |

#### 3.2.3 Career Goals

| ID | Requirement | Priority |
|----|-------------|----------|
| ONB-009 | The system shall support multiple career goal selection | High |
| ONB-010 | The system shall capture goal timeframe (immediate, short-term, medium-term, long-term) | Medium |
| ONB-011 | The system shall record target learning path track | Medium |

**Supported Career Goals:**
- skill-development, career-advancement, role-transition, leadership-growth
- entrepreneurship, consulting, specialization, generalization
- networking, industry-change, work-life-balance, salary-increase

#### 3.2.4 Learning Preferences

| ID | Requirement | Priority |
|----|-------------|----------|
| ONB-012 | The system shall capture preferred learning styles | Low |
| ONB-013 | The system shall record available time commitment | Medium |
| ONB-014 | The system shall capture budget range for events | Medium |

#### 3.2.5 Networking Preferences

| ID | Requirement | Priority |
|----|-------------|----------|
| ONB-015 | The system shall record networking goals | Medium |
| ONB-016 | The system shall capture preferred event types | High |

### 3.3 Event Discovery and Recommendations

#### 3.3.1 Event Database

| ID | Requirement | Priority |
|----|-------------|----------|
| DSC-001 | The system shall store comprehensive event information | High |
| DSC-002 | The system shall support multi-day events with agendas | High |
| DSC-003 | The system shall track speaker lineups with bio information | Medium |
| DSC-004 | The system shall categorize events by type, topic, and format | High |

**Event Data Model:**
- Core: id, title, description, organizer, location, status
- Timing: startTime, endTime, timezone
- URLs: sourceUrl, livestreamUrl, registrationUrl
- Categorization: eventTypeId, tags, category
- Visual: color, eventImageUrl
- Metadata: priceRange, capacity, attendeeCount, difficulty, eventFormat
- Agenda: speakerLineup, agendaItems

#### 3.3.2 Scoring and Recommendations

| ID | Requirement | Priority |
|----|-------------|----------|
| DSC-005 | The system shall calculate career impact scores for all events | High |
| DSC-006 | The system shall consider skill relevance in scoring | High |
| DSC-007 | The system shall factor in career stage matching | Medium |
| DSC-008 | The system shall evaluate networking value | Medium |
| DSC-009 | The system shall apply timing relevance bonuses | Medium |
| DSC-010 | The system shall support multiple scoring strategies (legacy, server, shadow) | Medium |
| DSC-011 | The system shall implement behavioral reranking based on interaction history | Medium |
| DSC-012 | The system shall ensure recommendation diversity | Medium |

**Career Impact Score Components:**
- overall: 0-100 composite score
- confidence: reliability indicator
- components: skillRelevance, careerStageMatch, networkingValue, industryRelevance, timingBonus
- explanation: reasons, matchedSkills, speakerHighlights, careerImpactCategory

#### 3.3.3 Filtering and Search

| ID | Requirement | Priority |
|----|-------------|----------|
| DSC-013 | The system shall support server-driven filtering | High |
| DSC-014 | The system shall allow filtering by date range, location, format | High |
| DSC-015 | The system shall support filtering by event type and difficulty | Medium |
| DSC-016 | The system shall provide text-based search | High |
| DSC-017 | The system shall support tag-based discovery | Medium |

#### 3.3.4 Event Details

| ID | Requirement | Priority |
|----|-------------|----------|
| DSC-018 | The system shall display comprehensive event information | High |
| DSC-019 | The system shall show personalized match explanations | High |
| DSC-020 | The system shall display who's attending from user's network | Medium |
| DSC-021 | The system shall support bookmarking and attendance tracking | High |

### 3.4 Calendar Integration

#### 3.4.1 Calendar Views

| ID | Requirement | Priority |
|----|-------------|----------|
| CAL-001 | The system shall provide monthly, weekly, and daily calendar views | High |
| CAL-002 | The system shall support list view for agenda-style browsing | Medium |
| CAL-003 | The system shall display events with color-coded categories | High |
| CAL-004 | The system shall handle multi-day event display | High |

#### 3.4.2 Event Management

| ID | Requirement | Priority |
|----|-------------|----------|
| CAL-005 | The system shall allow users to bookmark events | High |
| CAL-006 | The system shall track attendance status (attending, attended, cancelled) | High |
| CAL-007 | The system shall support adding private notes to tracked events | Medium |
| CAL-008 | The system shall provide quick filters for bookmarked/attending events | Medium |

#### 3.4.3 External Calendar Sync

| ID | Requirement | Priority |
|----|-------------|----------|
| CAL-009 | The system shall support Google Calendar integration | Medium |
| CAL-010 | The system shall allow export to ICS format | Low |
| CAL-011 | The system shall sync event updates bidirectionally | Low |

### 3.5 Career Dashboard

#### 3.5.1 Analytics Overview

| ID | Requirement | Priority |
|----|-------------|----------|
| DSB-001 | The system shall display goal progress metrics | High |
| DSB-002 | The system shall show skill development tracking | Medium |
| DSB-003 | The system shall provide networking insights | Medium |
| DSB-004 | The system shall display event timeline/history | Medium |

#### 3.5.2 Personalization

| ID | Requirement | Priority |
|----|-------------|----------|
| DSB-005 | The system shall adapt dashboard content based on career profile | High |
| DSB-006 | The system shall highlight recommended upcoming events | High |
| DSB-007 | The system shall show streaks and engagement metrics | Low |

### 3.6 Social and Community Features

#### 3.6.1 User Profiles

| ID | Requirement | Priority |
|----|-------------|----------|
| SOC-001 | The system shall support customizable public profiles at `/u/username` | High |
| SOC-002 | The system shall allow username selection (3-30 chars, alphanumeric + _/-) | High |
| SOC-003 | The system shall support headline/bio (max 120 characters) | Medium |
| SOC-004 | The system shall provide profile visibility controls (private/public) | High |
| SOC-005 | The system shall display follower/following counts | Medium |

#### 3.6.2 Follow System

| ID | Requirement | Priority |
|----|-------------|----------|
| SOC-006 | The system shall support follow/unfollow functionality | High |
| SOC-007 | The system shall implement trust levels for follow permissions | High |
| SOC-008 | The system shall prevent self-following | High |
| SOC-009 | The system shall enforce rate limiting on follow actions | Medium |
| SOC-010 | The system shall provide paginated followers/following lists | Medium |

**Trust Levels:**
- Level 0 (New): Default, cannot follow
- Level 1 (Basic): 7+ days + completed onboarding → Can follow
- Level 2+ (Member/Advanced): Reserved for future features

#### 3.6.3 Block System

| ID | Requirement | Priority |
|----|-------------|----------|
| SOC-011 | The system shall support blocking users | High |
| SOC-012 | The system shall enforce mutual invisibility for blocked users | High |
| SOC-013 | The system shall delete existing follow relationships on block | High |
| SOC-014 | The system shall prevent new follows between blocked users | High |

#### 3.6.4 Event Attendance Visibility

| ID | Requirement | Priority |
|----|-------------|----------|
| SOC-015 | The system shall allow users to control attendance visibility | High |
| SOC-016 | The system shall display "Who's Going" with network context | Medium |
| SOC-017 | The system shall show relationship badges (mutual, following, follows you) | Medium |
| SOC-018 | The system shall filter blocked users from attendee lists | High |

#### 3.6.5 Community Directory

| ID | Requirement | Priority |
|----|-------------|----------|
| SOC-019 | The system shall provide searchable user directory | Medium |
| SOC-020 | The system shall support filtering by headline availability | Low |
| SOC-021 | The system shall implement cursor-based pagination | Medium |

### 3.7 Hackathon Coordination

#### 3.7.1 Hackathon Discovery

| ID | Requirement | Priority |
|----|-------------|----------|
| HCK-001 | The system shall display hackathon listings separate from regular events | Medium |
| HCK-002 | The system shall calculate hackathon match scores based on user profile | Medium |
| HCK-003 | The system shall show hackathon details including prizes, rules, and timeline | Medium |

#### 3.7.2 Team Management

| ID | Requirement | Priority |
|----|-------------|----------|
| HCK-004 | The system shall support team creation with name and description | Medium |
| HCK-005 | The system shall enforce team size limits (min/max) | Medium |
| HCK-006 | The system shall allow team recruitment status (looking for members) | Low |
| HCK-007 | The system shall support team joining via invite or open enrollment | Medium |

#### 3.7.3 Participant Profiles

| ID | Requirement | Priority |
|----|-------------|----------|
| HCK-008 | The system shall capture participant skills and proficiencies | Medium |
| HCK-009 | The system shall record preferred team roles | Medium |
| HCK-010 | The system shall track collaboration style preferences | Low |
| HCK-011 | The system shall support team matching based on compatibility | Low |

### 3.8 Event Ingestion Pipeline

#### 3.8.1 Data Collection

| ID | Requirement | Priority |
|----|-------------|----------|
| ING-001 | The system shall support RSS feed ingestion | High |
| ING-002 | The system shall support API-based event collection | High |
| ING-003 | The system shall support ICS calendar file parsing | Medium |
| ING-004 | The system shall support HTML scraping with selectors | Medium |

#### 3.8.2 Quality Control

| ID | Requirement | Priority |
|----|-------------|----------|
| ING-005 | The system shall calculate quality scores for ingested events | High |
| ING-006 | The system shall auto-publish events with 75%+ quality score | High |
| ING-007 | The system shall queue events with <50% quality score for moderation | High |
| ING-008 | The system shall implement fuzzy deduplication matching | High |
| ING-009 | The system shall verify speaker URLs if configured | Medium |

#### 3.8.3 Moderation

| ID | Requirement | Priority |
|----|-------------|----------|
| ING-010 | The system shall provide admin moderation dashboard | Medium |
| ING-011 | The system shall support approve/reject/edit actions | Medium |
| ING-012 | The system shall maintain ingestion audit trail | Low |

#### 3.8.4 Automation

| ID | Requirement | Priority |
|----|-------------|----------|
| ING-013 | The system shall run ingestion on scheduled cron (hourly) | High |
| ING-014 | The system shall support manual trigger via API | Medium |
| ING-015 | The system shall handle race conditions for batch processing | Medium |

### 3.9 Subscription and Billing

#### 3.9.1 Subscription Tiers

| ID | Requirement | Priority |
|----|-------------|----------|
| SUB-001 | The system shall support Free tier with limited features | High |
| SUB-002 | The system shall support Pro tier with full access | High |
| SUB-003 | The system shall support Team tier for organizations | Medium |

**Feature Entitlements:**
| Feature | Free | Pro | Team |
|---------|------|-----|------|
| Calendar Sync | ❌ | ✅ | ✅ |
| Full History | ❌ | ✅ | ✅ |
| Full Recommendations | ❌ | ✅ | ✅ |
| Unlimited Bookmarks | ❌ (max 5) | ✅ | ✅ |
| History Retention | 30 days | Unlimited | Unlimited |

#### 3.9.2 Trial Management

| ID | Requirement | Priority |
|----|-------------|----------|
| SUB-004 | The system shall provide trial periods for new subscribers | High |
| SUB-005 | The system shall track trial days remaining | High |
| SUB-006 | The system shall handle trial expiration gracefully | High |

#### 3.9.3 Payment Processing

| ID | Requirement | Priority |
|----|-------------|----------|
| SUB-007 | The system shall integrate with Paddle for payment processing | High |
| SUB-008 | The system shall handle subscription lifecycle webhooks | High |
| SUB-009 | The system shall provide grace period for past-due subscriptions (7 days) | Medium |
| SUB-010 | The system shall allow subscription cancellation with period completion | Medium |

#### 3.9.4 Access Control

| ID | Requirement | Priority |
|----|-------------|----------|
| SUB-011 | The system shall enforce feature gates based on subscription tier | High |
| SUB-012 | The system shall provide clear upgrade prompts for limited features | Medium |
| SUB-013 | The system shall handle subscription status transitions gracefully | High |

### 3.10 Administration

#### 3.10.1 Content Management

| ID | Requirement | Priority |
|----|-------------|----------|
| ADM-001 | The system shall provide event management interface | Medium |
| ADM-002 | The system shall support blog post creation and editing | Low |
| ADM-003 | The system shall allow manual event submission | Medium |

#### 3.10.2 User Management

| ID | Requirement | Priority |
|----|-------------|----------|
| ADM-004 | The system shall support user role assignment | Medium |
| ADM-005 | The system shall provide activity monitoring | Low |
| ADM-006 | The system shall support user report handling | Low |

#### 3.10.3 System Utilities

| ID | Requirement | Priority |
|----|-------------|----------|
| ADM-007 | The system shall provide analytics validation tools | Low |
| ADM-008 | The system shall support database maintenance operations | Low |
| ADM-009 | The system shall provide ingestion monitoring dashboard | Medium |

### 3.11 Circles (Community Groups)

#### 3.11.1 Circle Management

| ID | Requirement | Priority |
|----|-------------|----------|
| CIR-001 | The system shall support interest-based circles/groups | Medium |
| CIR-002 | The system shall allow users to join/leave circles | Medium |
| CIR-003 | The system shall display circle-specific event recommendations | Low |
| CIR-004 | The system shall support circle discussions | Low |

#### 3.11.2 Circle Discovery

| ID | Requirement | Priority |
|----|-------------|----------|
| CIR-005 | The system shall provide circle directory | Low |
| CIR-006 | The system shall recommend circles based on interests | Low |

---

## 4. External Interface Requirements

### 4.1 User Interfaces

#### 4.1.1 Responsive Design

| ID | Requirement | Priority |
|----|-------------|----------|
| UI-001 | The system shall provide responsive layouts for desktop, tablet, and mobile | High |
| UI-002 | The system shall optimize navigation for touch interfaces on mobile | High |
| UI-003 | The system shall maintain feature parity across device sizes | Medium |

#### 4.1.2 Design System

| ID | Requirement | Priority |
|----|-------------|----------|
| UI-004 | The system shall use consistent color palette with semantic colors | High |
| UI-005 | The system shall maintain typographic hierarchy | High |
| UI-006 | The system shall provide dark mode support | Medium |
| UI-007 | The system shall use consistent spacing scale (8px base) | Medium |
| UI-008 | The system shall provide clear focus states for accessibility | High |

#### 4.1.3 Component Standards

| ID | Requirement | Priority |
|----|-------------|----------|
| UI-009 | The system shall use consistent button variants (primary, secondary, ghost, destructive) | High |
| UI-010 | The system shall provide form inputs with clear labels and validation | High |
| UI-011 | The system shall use modals for confirmations and detailed views | Medium |
| UI-012 | The system shall provide loading states (skeletons, spinners) | High |
| UI-013 | The system shall use toast notifications for action feedback | Medium |

### 4.2 Hardware Interfaces

Not applicable - Kure-Cal is a web-based SaaS platform with no direct hardware interfaces.

### 4.3 Software Interfaces

| Interface | Purpose | Protocol |
|-----------|---------|----------|
| **Supabase** | Database, Auth, Storage | REST API, Realtime WebSocket |
| **Paddle** | Payment processing | Webhook API |
| **Google Calendar** | Calendar sync | OAuth 2.0, REST API |
| **Sentry** | Error tracking | SDK Integration |
| **PostHog** | Product analytics | SDK Integration |
| **Upstash Redis** | Rate limiting, caching | Redis Protocol |
| **Vercel KV** | Edge caching | REST API |
| **Linear** | Bug reporting | REST API |

### 4.4 Communications Interfaces

| ID | Requirement | Priority |
|----|-------------|----------|
| COM-001 | The system shall use HTTPS for all communications | High |
| COM-002 | The system shall implement proper CORS policies | High |
| COM-003 | The system shall support WebSocket for real-time features | Low |
| COM-004 | The system shall implement request rate limiting | High |

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| PERF-001 | Initial page load time shall be < 3 seconds | < 3s | High |
| PERF-002 | Time to First Contentful Paint (FCP) shall be < 1.5s | < 1.5s | High |
| PERF-003 | API response time (p95) shall be < 500ms | < 500ms | High |
| PERF-004 | Search/filter results shall display within 2 seconds | < 2s | Medium |
| PERF-005 | Calendar interactions shall be < 100ms | < 100ms | Medium |
| PERF-006 | Scoring calculation shall complete within 200ms per event | < 200ms | High |
| PERF-007 | The system shall support 1000+ concurrent users | 1000+ | Medium |

### 5.2 Safety Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SAF-001 | The system shall prevent SQL injection through parameterized queries | High |
| SAF-002 | The system shall sanitize all user inputs to prevent XSS | High |
| SAF-003 | The system shall implement CSRF protection for state-changing operations | High |
| SAF-004 | The system shall validate all API inputs with Zod schemas | High |
| SAF-005 | The system shall log security-relevant events | Medium |

### 5.3 Security Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SEC-001 | The system shall enforce Row Level Security (RLS) on all database tables | High |
| SEC-002 | The system shall use secure HTTP-only cookies for session management | High |
| SEC-003 | The system shall implement rate limiting on authentication endpoints | High |
| SEC-004 | The system shall encrypt sensitive data at rest | High |
| SEC-005 | The system shall never expose service role keys to clients | High |
| SEC-006 | The system shall implement proper secret management | High |
| SEC-007 | The system shall provide audit logging for admin actions | Medium |

### 5.4 Software Quality Attributes

#### 5.4.1 Availability

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| AVAIL-001 | System uptime shall be 99.9% | 99.9% | High |
| AVAIL-002 | The system shall implement graceful degradation for third-party failures | Medium |

#### 5.4.2 Maintainability

| ID | Requirement | Priority |
|----|-------------|----------|
| MAINT-001 | The system shall use TypeScript for type safety | High |
| MAINT-002 | The system shall maintain test coverage > 70% | Medium |
| MAINT-003 | The system shall follow consistent code style (ESLint) | High |
| MAINT-004 | The system shall use service-oriented architecture | Medium |
| MAINT-005 | The system shall document complex algorithms | Medium |

#### 5.4.3 Portability

| ID | Requirement | Priority |
|----|-------------|----------|
| PORT-001 | The system shall run on Node.js 20.9+ | High |
| PORT-002 | The system shall be deployable to Vercel | High |
| PORT-003 | The system shall use environment-based configuration | High |

#### 5.4.4 Usability

| ID | Requirement | Priority |
|----|-------------|----------|
| USE-001 | The system shall meet WCAG AA accessibility standards | High |
| USE-002 | The system shall support keyboard navigation | High |
| USE-003 | The system shall provide clear error messages | High |
| USE-004 | The system shall maintain consistent navigation patterns | High |
| USE-005 | The system shall provide help text for complex features | Medium |

### 5.5 Scalability Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SCALE-001 | The system shall support 100,000+ events in database | High |
| SCALE-002 | The system shall support 50,000+ registered users | Medium |
| SCALE-003 | The system shall implement database indexing for query performance | High |
| SCALE-004 | The system shall use caching for frequently accessed data | Medium |
| SCALE-005 | The system shall support horizontal scaling via serverless architecture | Medium |

---

## 6. Database Requirements

### 6.1 Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **profiles** | User profiles and career data | id, full_name, avatar_url, username, headline, profile_visibility, show_attendance, career_data, is_admin |
| **events** | Event information | id, title, description, organizer, location, start_time, end_time, status, event_type_id |
| **tracked_events** | User-event relationships | id, user_id, event_id, status, is_bookmarked, notes |
| **subscriptions** | Subscription management | id, user_id, tier, status, entitlements, current_period_end |

### 6.2 Social Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **follows** | Follow relationships | id, follower_id, following_id, created_at |
| **blocks** | Block relationships | blocker_id, blocked_id, created_at |
| **user_social_stats** | Counter cache | user_id, follower_count, following_count |
| **trust_levels** | Progressive unlocks | user_id, level, last_evaluated_at |

### 6.3 Hackathon Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **hackathons** | Hackathon events | id, title, description, start_date, end_date, status, min_team_size, max_team_size |
| **hackathon_teams** | Team information | id, hackathon_id, name, description, looking_for_members, created_by |
| **hackathon_participants** | User participation | id, hackathon_id, user_id, team_id, status, skills |

### 6.4 Ingestion Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **ingestion_sources** | Data sources | id, name, type, config, is_active |
| **ingestion_runs** | Processing history | id, source_id, status, started_at, completed_at |
| **ingestion_events** | Pending events | id, source_id, raw_data, quality_score, status |

### 6.5 RLS Requirements

| Table | Policy | Description |
|-------|--------|-------------|
| profiles | Users can read public profiles, update own | Visibility-based access |
| follows | Users can read all, insert own (not blocked), delete own | Block-aware writes |
| blocks | Users can read own, manage own | Privacy enforcement |
| tracked_events | Users can read/write own only | User isolation |
| subscriptions | Users can read own, system writes | Protected billing |

---

## 7. Appendices

### Appendix A: Data Dictionary

#### A.1 Career Profile Schema

```typescript
interface CareerProfile {
  userId: string;
  profileId: string;
  lastUpdated: string;
  
  // Current Role
  currentRole: string;
  seniority: SeniorityLevel;
  industry: string;
  companySize: CompanySize;
  
  // Skills
  primarySkills: string[];
  skillsToLearn: string[];
  interests: string[];
  skillTags?: SkillTag[];
  
  // Goals
  careerGoals: CareerGoal[];
  timeframe: CareerTimeframe;
  targetPath?: LearningPathTrack;
  
  // Preferences
  learningStyle: LearningStyle[];
  availableTime: AvailableTime;
  budget: BudgetRange;
  networkingGoals: NetworkingGoal[];
  preferredEventTypes: CareerEventType[];
}
```

#### A.2 Event Schema

```typescript
interface Event {
  id: string;
  createdAt: string;
  updatedAt?: string;
  
  // Info
  title: string;
  description: string;
  organizer: string;
  location: string;
  status: string;
  
  // Timing
  startTime: string;
  endTime: string | null;
  timezone?: string;
  
  // URLs
  sourceUrl: string;
  livestreamUrl: string | null;
  registrationUrl?: string;
  
  // Categorization
  eventTypeId: string;
  category?: EventType;
  tags?: EventTag[];
  
  // Visual
  color?: string;
  eventImageUrl?: string;
  
  // Metadata
  priceRange?: string;
  priceMin?: number;
  capacity?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  eventFormat?: 'Online' | 'In-person' | 'Hybrid';
  
  // Content
  speakerLineup?: Speaker[];
  agenda?: AgendaItem[];
  
  // Recommendations
  recommendationMetadata?: RecommendationMetadata;
}
```

### Appendix B: API Summary

#### B.1 Event APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events/filtered` | GET | Get filtered events with scoring |
| `/api/events/recommendations` | GET | Get personalized recommendations |
| `/api/events/[id]/attendees` | GET | Get event attendees |
| `/api/events/network-counts` | GET | Batch network counts |

#### B.2 Social APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/follows` | POST | Follow a user |
| `/api/follows/[userId]` | DELETE | Unfollow a user |
| `/api/follows/status/[userId]` | GET | Check follow status |
| `/api/follows/followers` | GET | Get followers list |
| `/api/follows/following` | GET | Get following list |
| `/api/blocks` | POST | Block a user |
| `/api/blocks/[userId]` | DELETE | Unblock a user |
| `/api/users/search` | GET | Search public profiles |

#### B.3 Subscription APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/billing/subscription` | GET | Get subscription status |
| `/api/billing/checkout` | POST | Create checkout session |
| `/api/billing/portal` | POST | Access customer portal |
| `/api/webhooks/paddle` | POST | Paddle webhook handler |

### Appendix C: Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=

# Optional - Features
NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST=true
NEXT_PUBLIC_ENABLE_DIVERSITY_ENHANCEMENT=true
DISCOVERY_SCORING=server
DISCOVERY_RERANK=advanced

# Optional - Integrations
NEXT_PUBLIC_SENTRY_DSN=
LINEAR_API_KEY=
LINEAR_TEAM_ID=

# Optional - Configuration
INGESTION_VERIFY_SPEAKERS=true
NEXT_PUBLIC_SHOW_BUDGET_HINT=false
```

### Appendix D: Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 15.x |
| Runtime | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.4.x |
| UI Components | Radix UI | Latest |
| Charts | MUI X-Charts, Recharts | Latest |
| Calendar | FullCalendar | 6.x |
| Animation | Framer Motion, GSAP | Latest |
| Database | Supabase (Postgres) | 15+ |
| Auth | Supabase Auth | Latest |
| Storage | Supabase Storage | Latest |
| Cache | Upstash Redis, Vercel KV | Latest |
| Payments | Paddle | Latest |
| Testing | Vitest, Playwright | Latest |
| Linting | ESLint | 9.x |

### Appendix E: Testing Requirements

| Test Type | Tool | Coverage Target |
|-----------|------|-----------------|
| Unit Tests | Vitest | > 70% |
| Integration Tests | Vitest | Core flows |
| E2E Tests | Playwright | Critical paths |
| Performance | Custom benchmarks | < 200ms scoring |
| Accessibility | axe-core | WCAG AA |

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-03-19 | Kimi Code | Initial SRS document |

---

*End of Software Requirements Specification*
