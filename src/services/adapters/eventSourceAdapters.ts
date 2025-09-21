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

  // Shared request helper (DRY)
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

      // Handle rate limiting
      if (response.status === 429) {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const remaining = response.headers.get('X-RateLimit-Remaining');
        
        this.handleRateLimit(
          resetTime ? new Date(parseInt(resetTime) * 1000) : new Date(Date.now() + 3600000),
          remaining ? parseInt(remaining) : 0
        );
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      this.handleApiError(error, 'makeRequest');
    }
  }
}

// ============================================
// EVENTBRITE ADAPTER
// ============================================

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description: { text: string };
  start: { utc: string; timezone: string };
  end: { utc: string; timezone: string };
  url: string;
  venue?: {
    name: string;
    address?: { localized_address_display: string };
  };
  organizer: {
    name: string;
    description?: { text: string };
    url?: string;
  };
  capacity?: number;
  ticket_availability?: { has_available_tickets: boolean };
  is_free: boolean;
  logo?: { url: string };
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
  private readonly apiToken = process.env.EVENTBRITE_API_TOKEN;
  private readonly baseUrl = 'https://www.eventbriteapi.com/v3';

  async fetchEvents(config: SourceConfig): Promise<RawEvent[]> {
    if (!this.apiToken) {
      throw new EventImportError('Eventbrite API token not configured', this.source);
    }

    const allEvents: RawEvent[] = [];
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore && allEvents.length < config.batchSize) {
        const url = this.buildSearchUrl(config, page);
        const response = await this.makeRequest<EventbriteResponse>(url, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        });

        const events = response.events.map(event => this.transformEventbriteEvent(event));
        allEvents.push(...events);

        hasMore = response.pagination.has_more_items && page < response.pagination.page_count;
        page++;
      }

      return allEvents.slice(0, config.batchSize);
    } catch (error) {
      this.handleApiError(error, 'fetchEvents');
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    if (!this.apiToken) return false;
    
    try {
      await this.makeRequest(`${this.baseUrl}/users/me/`, {
        headers: { 'Authorization': `Bearer ${this.apiToken}` }
      });
      return true;
    } catch {
      return false;
    }
  }

  private buildSearchUrl(config: SourceConfig, page: number): string {
    const params = new URLSearchParams({
      'categories': config.filters.categories?.join(',') || '102,101', // Science & Tech, Business
      'sort_by': 'date',
      'page': page.toString(),
      'expand': 'organizer,venue',
    });

    if (config.filters.keywords?.length) {
      params.set('q', config.filters.keywords.join(' '));
    }

    if (config.filters.dateRange) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + config.filters.dateRange.startDays);
      params.set('start_date.range_start', startDate.toISOString());
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + config.filters.dateRange.endDays);
      params.set('start_date.range_end', endDate.toISOString());
    }

    return `${this.baseUrl}/events/search/?${params.toString()}`;
  }

  private transformEventbriteEvent(event: EventbriteEvent): RawEvent {
    return {
      externalId: event.id,
      source: 'eventbrite',
      sourceUrl: event.url,
      title: event.name?.text || 'Untitled Event',
      description: event.description?.text || '',
      organizer: {
        name: event.organizer?.name || 'Unknown Organizer',
        verified: true, // Eventbrite has some verification
        website: event.organizer?.url,
        logo: event.logo?.url
      },
      startTime: event.start?.utc || new Date().toISOString(),
      endTime: event.end?.utc,
      timezone: event.start?.timezone || 'UTC',
      location: event.venue ? {
        name: event.venue.name,
        address: event.venue.address?.localized_address_display,
        isOnline: false
      } : { isOnline: true },
      registrationUrl: event.url,
      capacity: event.capacity,
      priceRange: event.is_free ? 'Free' : 'Paid',
      rawData: event
    };
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
  private readonly apiKey = process.env.MEETUP_API_KEY;
  private readonly baseUrl = 'https://api.meetup.com';

  async fetchEvents(config: SourceConfig): Promise<RawEvent[]> {
    if (!this.apiKey) {
      throw new EventImportError('Meetup API key not configured', this.source);
    }

    try {
      const url = this.buildSearchUrl(config);
      const events = await this.makeRequest<MeetupEvent[]>(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return events
        .slice(0, config.batchSize)
        .map(event => this.transformMeetupEvent(event));
    } catch (error) {
      this.handleApiError(error, 'fetchEvents');
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      await this.makeRequest(`${this.baseUrl}/members/self`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
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
    return {
      externalId: event.id,
      source: 'meetup',
      sourceUrl: event.link,
      title: event.name,
      description: event.description || '',
      organizer: {
        name: event.group.name,
        verified: event.group.members > 100, // Groups with 100+ members are more credible
        website: event.group.link
      },
      startTime: new Date(event.time).toISOString(),
      endTime: event.duration ? new Date(event.time + event.duration).toISOString() : undefined,
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
    };
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
  private readonly apiToken = process.env.GITHUB_API_TOKEN;
  private readonly baseUrl = 'https://api.github.com';

  async fetchEvents(config: SourceConfig): Promise<RawEvent[]> {
    // GitHub doesn't have events API, so we search for conference/event repositories
    try {
      const url = this.buildSearchUrl(config);
      const response = await this.makeRequest<{ items: GitHubEvent[] }>(url, {
        headers: this.apiToken ? {
          'Authorization': `Bearer ${this.apiToken}`,
          'Accept': 'application/vnd.github.v3+json'
        } : {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      return response.items
        .slice(0, config.batchSize)
        .map(repo => this.transformGitHubRepo(repo));
    } catch (error) {
      this.handleApiError(error, 'fetchEvents');
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      await this.makeRequest(`${this.baseUrl}/rate_limit`, {
        headers: this.apiToken ? {
          'Authorization': `Bearer ${this.apiToken}`
        } : {}
      });
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
    // This is a simplified transformation - in reality, you'd parse README files
    // or look for event-specific data in the repository
    return {
      externalId: repo.id,
      source: 'github',
      sourceUrl: repo.html_url,
      title: repo.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: repo.description || 'Developer event or conference repository',
      organizer: {
        name: repo.owner.login,
        verified: repo.owner.type === 'Organization',
        website: repo.owner.html_url
      },
      startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now (placeholder)
      location: { isOnline: true },
      registrationUrl: repo.html_url,
      tags: repo.topics,
      rawData: repo
    };
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
