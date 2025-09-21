// src/services/adapters/eventSourceAdapters.ts

import type { 
  SourceAdapter, 
  RawEvent, 
  SourceConfig, 
  EventSource
} from '@/types/eventImport';
import { EventImportError, RateLimitError } from '@/types/eventImport';

/**
 * Event Source Adapters
 * Each adapter handles API-specific logic only
 * Follows existing error handling and rate limiting patterns
 */

// ============================================
// BASE ADAPTER CLASS (DRY)
// ============================================

abstract class BaseSourceAdapter implements SourceAdapter {
  abstract readonly source: EventSource;
  
  protected rateLimitInfo = {
    remaining: 1000,
    resetTime: new Date(Date.now() + 3600000) // 1 hour from now
  };

  abstract fetchEvents(config: SourceConfig): Promise<RawEvent[]>;

  getRateLimit() {
    return { ...this.rateLimitInfo };
  }

  async testConnection(): Promise<boolean> {
    try {
      // Each adapter implements this differently
      return await this.performConnectionTest();
    } catch (error) {
      console.error(`Connection test failed for ${this.source}:`, error);
      return false;
    }
  }

  protected abstract performConnectionTest(): Promise<boolean>;

  // Shared error handling (DRY)
  protected handleApiError(error: unknown, context: string): never {
    if (error instanceof Error) {
      throw new EventImportError(
        `${this.source} API error in ${context}: ${error.message}`,
        this.source,
        undefined,
        error
      );
    }
    throw new EventImportError(
      `Unknown ${this.source} API error in ${context}`,
      this.source
    );
  }

  // Shared rate limit handling (DRY)
  protected handleRateLimit(resetTime: Date, remaining: number = 0): never {
    this.rateLimitInfo = { remaining, resetTime };
    throw new RateLimitError(this.source, resetTime, remaining);
  }

  // Shared request helper (DRY) - Enhanced with better rate limiting
  protected async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Kure-Cal/1.0',
          ...options.headers
        }
      });

      // Update rate limit info from headers (works for most APIs)
      this.updateRateLimitFromHeaders(response.headers);

      // Handle rate limiting
      if (response.status === 429) {
        const resetTime = this.parseResetTime(response.headers);
        const remaining = this.parseRemaining(response.headers);
        this.handleRateLimit(resetTime || new Date(Date.now() + 3600000), remaining || 0);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      this.handleApiError(error, 'makeRequest');
    }
  }

  // Shared authentication header builder (DRY)
  protected buildAuthHeaders(): Record<string, string> {
    const token = this.getApiToken();
    if (!token) {
      throw new EventImportError(`${this.source} API token not configured`, this.source);
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Abstract method for getting API token (each adapter implements differently)
  protected abstract getApiToken(): string | undefined;

  // Shared transformation helper (DRY)
  protected createBaseRawEvent(
    externalId: string,
    title: string,
    description: string,
    sourceUrl: string,
    organizerName: string
  ): Partial<RawEvent> {
    return {
      externalId,
      source: this.source,
      sourceUrl,
      title: title.trim(),
      description: description.trim(),
      organizer: {
        name: organizerName,
        verified: false // Default, can be overridden
      }
    };
  }

  // Shared date parsing helper (DRY)
  protected parseEventDate(dateInput: string | number | Date): string {
    try {
      if (typeof dateInput === 'number') {
        // Unix timestamp (Meetup style)
        return new Date(dateInput).toISOString();
      }
      if (typeof dateInput === 'string') {
        // ISO string (Eventbrite style)
        return new Date(dateInput).toISOString();
      }
      if (dateInput instanceof Date) {
        return dateInput.toISOString();
      }
      return new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  // Shared rate limit parsing (DRY)
  private updateRateLimitFromHeaders(headers: Headers): void {
    const remaining = this.parseRemaining(headers);
    const resetTime = this.parseResetTime(headers);
    
    if (remaining !== undefined || resetTime) {
      this.rateLimitInfo = {
        remaining: remaining ?? this.rateLimitInfo.remaining,
        resetTime: resetTime ?? this.rateLimitInfo.resetTime
      };
    }
  }

  private parseRemaining(headers: Headers): number | undefined {
    const remaining = headers.get('X-RateLimit-Remaining') || 
                     headers.get('X-Rate-Limit-Remaining') ||
                     headers.get('RateLimit-Remaining');
    return remaining ? parseInt(remaining) : undefined;
  }

  private parseResetTime(headers: Headers): Date | undefined {
    const reset = headers.get('X-RateLimit-Reset') || 
                  headers.get('X-Rate-Limit-Reset') ||
                  headers.get('RateLimit-Reset');
    
    if (reset) {
      // Try Unix timestamp first, then ISO string
      const timestamp = parseInt(reset);
      return isNaN(timestamp) ? new Date(reset) : new Date(timestamp * 1000);
    }
    
    return new Date(Date.now() + 3600000); // Default: 1 hour from now
  }
}

// ============================================
// EVENTBRITE ADAPTER
// ============================================

interface EventbriteEvent {
  id: string;
  name: { text: string; html: string };
  summary?: string;
  description?: { text: string; html: string };
  start: { utc: string; timezone: string; local: string };
  end: { utc: string; timezone: string; local: string };
  url: string;
  status: string;
  currency: string;
  online_event: boolean;
  capacity?: number;
  venue?: {
    id: string;
    name: string;
    address?: {
      address_1?: string;
      city?: string;
      region?: string;
      country?: string;
      localized_address_display?: string;
    };
  };
  organizer?: {
    id: string;
    name: string;
    description?: { text: string; html: string };
    url?: string;
    logo?: { url: string };
  };
  logo?: { url: string };
  listed: boolean;
  shareable: boolean;
}

interface EventbriteResponse {
  events: EventbriteEvent[];
  pagination: {
    page_number: number;
    page_count: number;
    has_more_items: boolean;
  };
}

export class EventbriteAdapter extends BaseSourceAdapter {
  readonly source: EventSource = 'eventbrite';
  private readonly baseUrl = 'https://www.eventbriteapi.com/v3';

  protected getApiToken(): string | undefined {
    return process.env.EVENTBRITE_API_TOKEN;
  }

  async fetchEvents(config: SourceConfig): Promise<RawEvent[]> {
    try {
      console.log('Step 1: Getting user organizations...');
      
      // Step 1: Get user's organizations using shared auth headers
      const orgsResponse = await this.makeRequest<{
        organizations: Array<{ id: string; name: string }>;
        pagination: { has_more_items: boolean };
      }>(`${this.baseUrl}/users/me/organizations/`, {
        headers: this.buildAuthHeaders()
      });

      if (!orgsResponse.organizations || orgsResponse.organizations.length === 0) {
        console.log('No organizations found for this user');
        return [];
      }

      console.log(`Found ${orgsResponse.organizations.length} organizations`);

      // Step 2: Get events for each organization
      const allEvents: RawEvent[] = [];
      
      for (const org of orgsResponse.organizations) {
        if (allEvents.length >= config.batchSize) break;
        
        try {
          console.log(`Getting events for organization: ${org.name}`);
          const eventsUrl = this.buildEventsUrl(org.id, config);
          
          const eventsResponse = await this.makeRequest<EventbriteResponse>(eventsUrl, {
            headers: this.buildAuthHeaders()
          });

          if (eventsResponse.events && Array.isArray(eventsResponse.events)) {
            const events = eventsResponse.events.map(event => this.transformEventbriteEvent(event));
            allEvents.push(...events);
            console.log(`Added ${events.length} events from ${org.name}`);
          }
        } catch (error) {
          console.warn(`Failed to get events for organization ${org.name}:`, error);
          // Continue with other organizations
        }
      }

      console.log(`Eventbrite: Total fetched ${allEvents.length} events`);
      return allEvents.slice(0, config.batchSize);

    } catch (error) {
      console.error('Eventbrite fetch error:', error);
      this.handleApiError(error, 'fetchEvents');
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      console.log('Testing Eventbrite connection...');
      await this.makeRequest(`${this.baseUrl}/users/me/`, {
        headers: this.buildAuthHeaders()
      });
      console.log('Eventbrite connection test successful');
      return true;
    } catch (error) {
      console.error('Eventbrite connection test failed:', error);
      return false;
    }
  }

  private buildEventsUrl(organizationId: string, config: SourceConfig): string {
    // Use the correct organization events endpoint from API docs (line 1956)
    const params = new URLSearchParams({
      'expand': 'organizer,venue',
      'status': 'live',
      'order_by': 'start_asc',
      'page_size': Math.min(config.batchSize, 50).toString(), // API limit
      'time_filter': 'current_future'
    });

    // Add date filtering if specified
    if (config.filters.dateRange) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + config.filters.dateRange.startDays);
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + config.filters.dateRange.endDays);
      
      // Use the correct parameter names from API docs
      params.set('start_date.range_start', startDate.toISOString());
      params.set('start_date.range_end', endDate.toISOString());
    }

    // Use the organization events endpoint (line 1956 in API docs)
    return `${this.baseUrl}/organizations/${organizationId}/events/?${params.toString()}`;
  }

  private transformEventbriteEvent(event: EventbriteEvent): RawEvent {
    // Use shared base transformation
    const baseEvent = this.createBaseRawEvent(
      event.id,
      event.name?.text || 'Untitled Event',
      event.summary || event.description?.text || '',
      event.url,
      event.organizer?.name || 'Unknown Organizer'
    );

    return {
      ...baseEvent,
      startTime: this.parseEventDate(event.start?.utc),
      endTime: event.end?.utc ? this.parseEventDate(event.end.utc) : undefined,
      timezone: event.start?.timezone || 'UTC',
      organizer: {
        ...baseEvent.organizer!,
        verified: true, // Eventbrite events are verified
        website: event.organizer?.url,
        logo: event.organizer?.logo?.url || event.logo?.url
      },
      location: event.online_event ? {
        isOnline: true
      } : {
        name: event.venue?.name,
        address: event.venue?.address?.localized_address_display,
        city: event.venue?.address?.city,
        country: event.venue?.address?.country,
        isOnline: false
      },
      registrationUrl: event.url,
      capacity: event.capacity,
      priceRange: 'Unknown', // Will be determined by ticket classes
      rawData: event
    } as RawEvent;
  }
}

// ============================================
// MEETUP ADAPTER
// ============================================

interface MeetupEvent {
  id: string;
  name: string;
  description?: string;
  time: number; // Unix timestamp
  duration?: number;
  link: string;
  venue?: {
    name: string;
    address_1?: string;
    city?: string;
    country?: string;
  };
  group: {
    name: string;
    urlname: string;
    link: string;
    members: number;
  };
  yes_rsvp_count: number;
  rsvp_limit?: number;
  fee?: { amount: number; currency: string };
}

export class MeetupAdapter extends BaseSourceAdapter {
  readonly source: EventSource = 'meetup';
  private readonly baseUrl = 'https://api.meetup.com';

  protected getApiToken(): string | undefined {
    return process.env.MEETUP_API_KEY;
  }

  async fetchEvents(config: SourceConfig): Promise<RawEvent[]> {
    try {
      const url = this.buildSearchUrl(config);
      const events = await this.makeRequest<MeetupEvent[]>(url, {
        headers: this.buildAuthHeaders()
      });

      return events
        .slice(0, config.batchSize)
        .map(event => this.transformMeetupEvent(event));
    } catch (error) {
      this.handleApiError(error, 'fetchEvents');
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      await this.makeRequest(`${this.baseUrl}/members/self`, {
        headers: this.buildAuthHeaders()
      });
      return true;
    } catch {
      return false;
    }
  }

  private buildSearchUrl(config: SourceConfig): string {
    const params = new URLSearchParams({
      'category': '34', // Tech category
      'status': 'upcoming',
      'page': config.batchSize.toString(),
    });

    if (config.filters.keywords?.length) {
      params.set('text', config.filters.keywords.join(' '));
    }

    if (config.filters.locations?.length) {
      params.set('city', config.filters.locations[0]);
    }

    return `${this.baseUrl}/find/upcoming_events?${params.toString()}`;
  }

  private transformMeetupEvent(event: MeetupEvent): RawEvent {
    // Use shared base transformation
    const baseEvent = this.createBaseRawEvent(
      event.id,
      event.name,
      event.description || '',
      event.link,
      event.group.name
    );

    return {
      ...baseEvent,
      startTime: this.parseEventDate(event.time),
      endTime: event.duration ? this.parseEventDate(event.time + event.duration) : undefined,
      organizer: {
        ...baseEvent.organizer!,
        verified: event.group.members > 100, // Groups with 100+ members are more credible
        website: event.group.link
      },
      location: event.venue ? {
        name: event.venue.name,
        address: event.venue.address_1,
        city: event.venue.city,
        country: event.venue.country,
        isOnline: false
      } : { isOnline: true },
      registrationUrl: event.link,
      attendeeCount: event.yes_rsvp_count,
      capacity: event.rsvp_limit,
      priceRange: event.fee ? `${event.fee.amount} ${event.fee.currency}` : 'Free',
      rawData: event
    } as RawEvent;
  }
}

// ============================================
// GITHUB ADAPTER (For developer events)
// ============================================

interface GitHubEvent {
  id: string;
  name: string;
  description: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  stargazers_count: number;
  owner: {
    login: string;
    html_url: string;
    type: string;
  };
  topics: string[];
}

export class GitHubAdapter extends BaseSourceAdapter {
  readonly source: EventSource = 'github';
  private readonly baseUrl = 'https://api.github.com';

  protected getApiToken(): string | undefined {
    return process.env.GITHUB_API_TOKEN;
  }

  async fetchEvents(config: SourceConfig): Promise<RawEvent[]> {
    // GitHub doesn't have events API, so we search for conference/event repositories
    try {
      const url = this.buildSearchUrl(config);
      const headers = this.getApiToken() ? {
        ...this.buildAuthHeaders(),
        'Accept': 'application/vnd.github.v3+json'
      } : {
        'Accept': 'application/vnd.github.v3+json'
      };

      const response = await this.makeRequest<{ items: GitHubEvent[] }>(url, { headers });

      return response.items
        .slice(0, config.batchSize)
        .map(repo => this.transformGitHubRepo(repo));
    } catch (error) {
      this.handleApiError(error, 'fetchEvents');
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const headers = this.getApiToken() ? this.buildAuthHeaders() : {};
      await this.makeRequest(`${this.baseUrl}/rate_limit`, { headers });
      return true;
    } catch {
      return false;
    }
  }

  private buildSearchUrl(config: SourceConfig): string {
    const query = [
      'conference OR meetup OR workshop OR hackathon',
      'topic:conference OR topic:event',
      'stars:>10' // Only repos with some credibility
    ].join(' ');

    const params = new URLSearchParams({
      'q': query,
      'sort': 'updated',
      'order': 'desc',
      'per_page': config.batchSize.toString()
    });

    return `${this.baseUrl}/search/repositories?${params.toString()}`;
  }

  private transformGitHubRepo(repo: GitHubEvent): RawEvent {
    // Use shared base transformation
    const baseEvent = this.createBaseRawEvent(
      repo.id,
      repo.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      repo.description || 'Developer event or conference repository',
      repo.html_url,
      repo.owner.login
    );

    return {
      ...baseEvent,
      startTime: this.parseEventDate(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now (placeholder)
      organizer: {
        ...baseEvent.organizer!,
        verified: repo.owner.type === 'Organization',
        website: repo.owner.html_url
      },
      location: { isOnline: true },
      registrationUrl: repo.html_url,
      tags: repo.topics,
      rawData: repo
    } as RawEvent;
  }
}

// ============================================
// ADAPTER FACTORY (DRY)
// ============================================

export class AdapterFactory {
  private static adapters = new Map<EventSource, SourceAdapter>([
    ['eventbrite', new EventbriteAdapter()],
    ['meetup', new MeetupAdapter()],
    ['github', new GitHubAdapter()]
  ]);

  static getAdapter(source: EventSource): SourceAdapter {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new EventImportError(`No adapter found for source: ${source}`, source);
    }
    return adapter;
  }

  static getAllAdapters(): SourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  static async testAllConnections(): Promise<Record<EventSource, boolean>> {
    const results: Record<EventSource, boolean> = {} as Record<EventSource, boolean>;
    
    for (const [source, adapter] of this.adapters) {
      results[source] = await adapter.testConnection();
    }
    
    return results;
  }
}
