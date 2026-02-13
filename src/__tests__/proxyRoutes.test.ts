import {
  isAuthRoute,
  isCrawlablePublicRoute,
  isProtectedRoute,
  pathMatchesPrefix,
} from '@/proxy';

describe('proxy route guards', () => {
  it('matches route prefixes on segment boundaries', () => {
    expect(pathMatchesPrefix('/dashboard', '/dashboard')).toBe(true);
    expect(pathMatchesPrefix('/dashboard/settings', '/dashboard')).toBe(true);
    expect(pathMatchesPrefix('/dashboarding', '/dashboard')).toBe(false);
  });

  it('keeps only intended routes protected', () => {
    expect(isProtectedRoute('/discover')).toBe(true);
    expect(isProtectedRoute('/calendar')).toBe(true);
    expect(isProtectedRoute('/dashboard')).toBe(true);
    expect(isProtectedRoute('/hackathons')).toBe(true);
    expect(isProtectedRoute('/settings/profile')).toBe(true);
    expect(isProtectedRoute('/events')).toBe(false);
    expect(isProtectedRoute('/resources/cfp-calendar')).toBe(false);
  });

  it('treats SEO landing routes as explicitly crawlable', () => {
    expect(isCrawlablePublicRoute('/events')).toBe(true);
    expect(isCrawlablePublicRoute('/events/category/conferences')).toBe(true);
    expect(isCrawlablePublicRoute('/resources/tech-events-calendar-2026')).toBe(true);
    expect(isCrawlablePublicRoute('/embed/devcon-2026')).toBe(true);
    expect(isCrawlablePublicRoute('/api/events')).toBe(false);
  });

  it('recognizes auth-only routes', () => {
    expect(isAuthRoute('/login')).toBe(true);
    expect(isAuthRoute('/signup')).toBe(true);
    expect(isAuthRoute('/events')).toBe(false);
  });
});
