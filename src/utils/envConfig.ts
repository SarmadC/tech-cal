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
      dsn?: string;
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
  private config: EnvConfig | null = null;

  private getLoadedConfig(): EnvConfig {
    if (!this.config) {
      this.config = this.loadConfig();
    }

    return this.config;
  }

  private loadConfig(): EnvConfig {
    return {
      supabase: {
        url: this.ensureValue(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
        anonKey: this.ensureValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
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
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          authToken: process.env.SENTRY_AUTH_TOKEN,
        },
        redis: {
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        },
        kv: {
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        },
      },
    };
  }

  private ensureValue(value: string | undefined, key: string): string {
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
    return { ...this.getLoadedConfig() };
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof EnvConfig['features']): boolean {
    const featureConfig = this.getLoadedConfig().features[feature] as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return featureConfig.enabled ?? false;
  }

  /**
   * Get a feature configuration
   */
  getFeatureConfig<T extends keyof EnvConfig['features']>(
    feature: T
  ): EnvConfig['features'][T] {
    return this.getLoadedConfig().features[feature];
  }

  /**
   * Validate all required environment variables are present
   */
  validate(): { isValid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    try {
      this.ensureValue(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
      this.ensureValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
      // NEXT_PUBLIC_SENTRY_DSN is optional - Sentry works without it
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
   * Check if KV (Vercel KV) is available
   */
  isKvAvailable(): boolean {
    return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  }

  /**
   * Check if Redis (Upstash) is available
   */
  isRedisAvailable(): boolean {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
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
    ];
    
    const optionalVars = [
      'NEXT_PUBLIC_SENTRY_DSN',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SENTRY_AUTH_TOKEN',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'KV_REST_API_URL',
      'KV_REST_API_TOKEN',
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
        logScoring: process.env.NEXT_PUBLIC_LOG_SCORING === 'true',
        typePrefGate: process.env.NEXT_PUBLIC_DISABLE_TYPE_PREF_GATE !== 'true',
        behavioralBoost: process.env.NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST !== 'false',
        scoreBreakdown: process.env.NEXT_PUBLIC_ENABLE_SCORE_BREAKDOWN === 'true',
        budgetHint: process.env.NEXT_PUBLIC_SHOW_BUDGET_HINT === 'true',
        monitoring: process.env.ENABLE_MONITORING_API === 'true',
      }
    };
  }
}

// Export singleton instance
export const envConfig = new EnvConfigManager();

// Export types for use in other files
export type { EnvConfig };
