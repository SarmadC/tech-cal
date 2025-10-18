export interface TelemetryEventPayload {
  eventType: string;
  eventVersion?: number;
  source?: string;
  sessionId?: string | null;
  requestId?: string | null;
  occurredAt?: string;
  context?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface RecommendationTelemetryContext {
  userId: string;
  hasConsent: boolean;
  sessionId?: string | null;
  requestId?: string | null;
  source?: string;
  surface?: string;
  additionalContext?: Record<string, unknown>;
}
