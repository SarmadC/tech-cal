/**
 * Centralized Environment Configuration
 * Consolidates all environment variable checks and provides type-safe access
 */

interface EnvConfig {
  // Required for basic functionality
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  
  // Optional features
  features: {
    scoring: {
      logScoring: boolean;
      typePrefGate: number;
      disableTypePrefGate: boolean;
    };
    behavioral: {
      enabled: boolean;
      boostStrength: number;
    };
    debug: {
      scoreBreakdown: boolean;
      budgetHint: boolean;
      monitoring: boolean;
    };
  };
  
  // External services
  services: {
    sentry: {
      dsn: string;
      authToken?: string;
    };
    redis: {
      url?: string;
      token?: string;
    };
    kv: {
      url?: string;
      token?: string;
    };
  };
}

class EnvConfigManager {
  private config: EnvConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): EnvConfig {
    return {
      supabase: {
        url: this.getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
        anonKey: this.getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      
      features: {
        scoring: {
          logScoring: process.env.NEXT_PUBLIC_LOG_SCORING === 'true',
          typePrefGate: this.parseNumber(process.env.NEXT_PUBLIC_TYPE_PREF_GATE, 0.75),
          disableTypePrefGate: process.env.NEXT_PUBLIC_DISABLE_TYPE_PREF_GATE === 'true',
        },
        behavioral: {
          enabled: process.env.NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST !== 'false',
          boostStrength: this.parseNumber(process.env.NEXT_PUBLIC_BEHAVIORAL_BOOST_STRENGTH, 1.0),
        },
        debug: {
          scoreBreakdown: process.env.NEXT_PUBLIC_ENABLE_SCORE_BREAKDOWN === 'true',
          budgetHint: process.env.NEXT_PUBLIC_SHOW_BUDGET_HINT === 'true',
          monitoring: process.env.ENABLE_MONITORING_API === 'true',
        },
      },
      
      services: {
        sentry: {
          dsn: this.getRequiredEnv('NEXT_PUBLIC_SENTRY_DSN'),
          authToken: process.env.SENTRY_AUTH_TOKEN,
        },
        redis: {
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        },
        kv: {
          url: process.env.VERCEL_KV_REST_API_URL,
          token: process.env.VERCEL_KV_REST_API_TOKEN,
        },
      },
    };
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  /**
   * Get the complete configuration
   */
  getConfig(): EnvConfig {
    return { ...this.config };
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof EnvConfig['features']): boolean {
    const featureConfig = this.config.features[feature] as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return featureConfig.enabled ?? false;
  }

  /**
   * Get a feature configuration
   */
  getFeatureConfig<T extends keyof EnvConfig['features']>(
    feature: T
  ): EnvConfig['features'][T] {
    return this.config.features[feature];
  }

  /**
   * Validate all required environment variables are present
   */
  validate(): { isValid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    try {
      this.getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
      this.getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      this.getRequiredEnv('NEXT_PUBLIC_SENTRY_DSN');
    } catch (error) {
      if (error instanceof Error) {
        const match = error.message.match(/Required environment variable (\w+) is not set/);
        if (match) {
          missing.push(match[1]);
        }
      }
    }
    
    return {
      isValid: missing.length === 0,
      missing
    };
  }

  /**
   * Get environment summary for debugging
   */
  getSummary(): {
    required: { present: number; total: number };
    optional: { present: number; total: number };
    features: Record<string, boolean>;
  } {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SENTRY_DSN',
    ];
    
    const optionalVars = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'SENTRY_AUTH_TOKEN',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'VERCEL_KV_REST_API_URL',
      'VERCEL_KV_REST_API_TOKEN',
      'NEXT_PUBLIC_LOG_SCORING',
      'NEXT_PUBLIC_TYPE_PREF_GATE',
      'NEXT_PUBLIC_DISABLE_TYPE_PREF_GATE',
      'NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST',
      'NEXT_PUBLIC_BEHAVIORAL_BOOST_STRENGTH',
      'NEXT_PUBLIC_ENABLE_SCORE_BREAKDOWN',
      'NEXT_PUBLIC_SHOW_BUDGET_HINT',
      'ENABLE_MONITORING_API',
    ];
    
    const requiredPresent = requiredVars.filter(v => process.env[v]).length;
    const optionalPresent = optionalVars.filter(v => process.env[v]).length;
    
    return {
      required: { present: requiredPresent, total: requiredVars.length },
      optional: { present: optionalPresent, total: optionalVars.length },
      features: {
        logScoring: this.config.features.scoring.logScoring,
        typePrefGate: !this.config.features.scoring.disableTypePrefGate,
        behavioralBoost: this.config.features.behavioral.enabled,
        scoreBreakdown: this.config.features.debug.scoreBreakdown,
        budgetHint: this.config.features.debug.budgetHint,
        monitoring: this.config.features.debug.monitoring,
      }
    };
  }
}

// Export singleton instance
export const envConfig = new EnvConfigManager();

// Export types for use in other files
export type { EnvConfig };
