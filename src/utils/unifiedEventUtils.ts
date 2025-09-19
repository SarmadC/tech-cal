// Unified event utilities to eliminate duration calculation duplication
import { Event } from '@/types';

export type DurationFormat = 'hours' | 'formatted' | 'category';
export type DurationCategory = 'short' | 'medium' | 'long' | 'multi-day';

export interface EventDuration {
  hours: number;
  formatted: string;
  category: DurationCategory;
}

export class UnifiedEventUtils {
  /**
   * Calculate event duration in multiple formats (single source of truth)
   */
  static getEventDuration(event: Event): EventDuration {
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours
    
    const durationMs = end.getTime() - start.getTime();
    const hours = durationMs / (1000 * 60 * 60);
    
    return {
      hours,
      formatted: this.formatDuration(hours),
      category: this.categorizeDuration(hours)
    };
  }

  /**
   * Get duration in specific format
   */
  static getDurationAs(event: Event, format: DurationFormat): number | string | DurationCategory {
    const duration = this.getEventDuration(event);
    
    switch (format) {
      case 'hours': return duration.hours;
      case 'formatted': return duration.formatted;
      case 'category': return duration.category;
      default: return duration.hours;
    }
  }

  /**
   * Format duration as human-readable string
   */
  private static formatDuration(hours: number): string {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    }
    
    if (hours < 24) {
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours - wholeHours) * 60);
      
      if (minutes === 0) {
        return `${wholeHours}h`;
      }
      return `${wholeHours}h ${minutes}m`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    
    if (remainingHours === 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    return `${days} day${days > 1 ? 's' : ''} ${remainingHours}h`;
  }

  /**
   * Categorize duration for filtering and algorithm purposes
   */
  private static categorizeDuration(hours: number): DurationCategory {
    if (hours > 24) return 'multi-day';
    if (hours > 6) return 'long';
    if (hours > 3) return 'medium';
    return 'short';
  }

  /**
   * Check if event is currently live
   */
  static isEventLive(event: Event): boolean {
    const now = new Date();
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    
    return now >= start && now <= end;
  }

  /**
   * Get time until event starts (for urgency scoring)
   */
  static getTimeUntilEvent(event: Event): number {
    const now = new Date();
    const start = new Date(event.startTime);
    return start.getTime() - now.getTime(); // milliseconds
  }

  /**
   * Check if event is in the past
   */
  static isEventPast(event: Event): boolean {
    const now = new Date();
    const end = event.endTime ? new Date(event.endTime) : new Date(event.startTime);
    return end < now;
  }

  /**
   * Get event timing category for algorithm purposes
   */
  static getEventTimingCategory(event: Event): 'immediate' | 'soon' | 'upcoming' | 'future' {
    const timeUntil = this.getTimeUntilEvent(event);
    const days = timeUntil / (1000 * 60 * 60 * 24);
    
    if (days <= 1) return 'immediate';
    if (days <= 7) return 'soon';
    if (days <= 30) return 'upcoming';
    return 'future';
  }
}
