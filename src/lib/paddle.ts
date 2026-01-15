/**
 * Paddle Integration Library
 *
 * This module handles Paddle.js integration for subscription checkout and management.
 * Paddle is our merchant of record, handling taxes and payment processing.
 *
 * Usage:
 * - Initialize Paddle on app load with initPaddle()
 * - Open checkout overlay with openCheckout()
 * - Open customer portal with openCustomerPortal()
 */

import type { Subscription } from '@/types/subscription';

// Paddle environment configuration
// Paddle environment configuration
const PADDLE_ENVIRONMENT = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'production') as
  | 'sandbox'
  | 'production';

// Select keys based on environment
const PADDLE_CLIENT_TOKEN = PADDLE_ENVIRONMENT === 'sandbox'
  ? process.env.NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN
  : process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

// Price IDs (configured in Paddle dashboard)
export const PADDLE_PRICES = {
  pro_monthly: PADDLE_ENVIRONMENT === 'sandbox'
    ? process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID_SANDBOX
    : process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY || '',
  pro_annual: PADDLE_ENVIRONMENT === 'sandbox'
    ? process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID_SANDBOX
    : process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_ANNUAL || '',
  team_monthly: PADDLE_ENVIRONMENT === 'sandbox'
    ? process.env.NEXT_PUBLIC_PADDLE_TEAM_MONTHLY_PRICE_ID_SANDBOX
    : process.env.NEXT_PUBLIC_PADDLE_PRICE_TEAM_MONTHLY || '',
  team_annual: PADDLE_ENVIRONMENT === 'sandbox'
    ? process.env.NEXT_PUBLIC_PADDLE_TEAM_ANNUAL_PRICE_ID_SANDBOX
    : process.env.NEXT_PUBLIC_PADDLE_PRICE_TEAM_ANNUAL || '',
} as const;

// Paddle.js types (simplified)
interface PaddleCheckoutSettings {
  displayMode?: 'inline' | 'overlay';
  theme?: 'light' | 'dark';
  locale?: string;
  successUrl?: string;
  cancelUrl?: string;
  frameTarget?: string;
  frameInitialHeight?: number;
  frameStyle?: string;
}

interface PaddleCheckoutItem {
  priceId: string;
  quantity?: number;
}

interface PaddleCheckoutOptions {
  settings?: PaddleCheckoutSettings;
  items: PaddleCheckoutItem[];
  customer?: {
    email?: string;
    id?: string;
  };
  customData?: Record<string, string>;
}

interface PaddleInstance {
  Initialize: (options: {
    token: string;
    eventCallback?: (event: PaddleEvent) => void;
    checkout?: {
      settings?: {
        theme?: 'light' | 'dark';
        displayMode?: 'inline' | 'overlay';
      };
    };
  }) => void;
  Checkout: {
    open: (options: PaddleCheckoutOptions) => void;
  };
  Environment: {
    set: (env: 'sandbox' | 'production') => void;
  };
}

interface PaddleEvent {
  name: string;
  data?: unknown;
}

// Global Paddle instance
declare global {
  interface Window {
    Paddle?: PaddleInstance;
  }
}

let paddleInitialized = false;

// Script loading timeout (10 seconds)
const PADDLE_SCRIPT_TIMEOUT_MS = 10000;

/**
 * Load Paddle.js script dynamically with timeout
 */
function loadPaddleScript(): Promise<void> {
  const loadPromise = new Promise<void>((resolve, reject) => {
    if (window.Paddle) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(script);
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Paddle.js load timed out. Please check your internet connection and try again.'));
    }, PADDLE_SCRIPT_TIMEOUT_MS);
  });

  return Promise.race([loadPromise, timeoutPromise]);
}

/**
 * Initialize Paddle.js
 * Call this once on app initialization
 */
export async function initPaddle(
  eventCallback?: (event: PaddleEvent) => void
): Promise<void> {
  if (paddleInitialized) return;
  if (typeof window === 'undefined') return;

  if (!PADDLE_CLIENT_TOKEN) {
    console.warn('Paddle client token not configured');
    return;
  }

  try {
    await loadPaddleScript();

    if (window.Paddle) {
      const environment = PADDLE_ENVIRONMENT || 'sandbox';

      // Set environment if sandbox, otherwise defaults to production
      if (environment === 'sandbox') {
        window.Paddle.Environment.set('sandbox');
      }

      if (environment === 'production' && window.location.hostname === 'localhost') {
        console.warn(
          '[PADDLE] You are running Paddle in production mode on localhost. ' +
          'Paddle requires a valid domain validation for production. ' +
          'You may see "Something went wrong" errors. ' +
          'Please use a tunneling service (like ngrok) and verify the domain in your Paddle dashboard.'
        );
      }

      // Initialize Paddle
      window.Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
        eventCallback: eventCallback || defaultEventCallback,
        checkout: {
          settings: {
            displayMode: 'inline', // Set default display mode to inline if that helps defaults
            theme: 'dark', 
          }
        }
      });

            // Debug log
      console.log('Paddle initialized:', {
        environment,
        token: PADDLE_CLIENT_TOKEN.substring(0, 8) + '...',
        prices: PADDLE_PRICES,
        version: 'v2'
      });
      
      paddleInitialized = true;
    }
  } catch (error) {
    console.error('Failed to initialize Paddle:', error);
    throw error;
  }
}

/**
 * Default event callback for Paddle events
 */
function defaultEventCallback(event: PaddleEvent): void {
  switch (event.name) {
    case 'checkout.completed':
      console.log('Checkout completed:', event.data);
      // Subscription will be created via webhook
      break;
    case 'checkout.closed':
      console.log('Checkout closed');
      break;
    case 'checkout.error':
      console.error('Checkout error:', event.data);
      break;
    default:
      console.log('Paddle event:', event.name, event.data);
  }
}

/**
 * Open Paddle checkout overlay
 *
 * @param options Checkout options
 */
export async function openCheckout(options: {
  priceId: string;
  userEmail?: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
  theme?: 'light' | 'dark';
  displayMode?: 'inline' | 'overlay';
  frameTarget?: string;
  frameInitialHeight?: number;
} | {
  priceId: string;
  userEmail?: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
  theme?: 'light' | 'dark';
  displayMode: 'inline';
  frameTarget: string;
  frameInitialHeight?: number;
}): Promise<void> {
  if (!paddleInitialized) {
    await initPaddle();
  }

  if (!window.Paddle) {
    throw new Error('Paddle not initialized');
  }

  // Build settings - only include URLs if explicitly needed
  // Paddle will use the default payment link for redirects
  const settings: {
    displayMode: 'overlay' | 'inline';
    theme: 'light' | 'dark';
    successUrl?: string;
  } = {
    displayMode: 'overlay',
    theme: options.theme || 'light',
  };

  // Only add successUrl if provided - let Paddle handle cancel behavior
  if (options.successUrl) {
    settings.successUrl = options.successUrl;
  }

  const checkoutOptions = {
    settings,
    items: [{ priceId: options.priceId, quantity: 1 }],
    customer: options.userEmail ? { email: options.userEmail } : undefined,
    customData: {
      user_id: options.userId, // Passed to webhook for linking subscription
    },
  };

  // Debug log
  console.log('Paddle checkout options:', {
    settings: checkoutOptions.settings,
    priceId: options.priceId,
    userEmail: options.userEmail,
  });

  window.Paddle.Checkout.open(checkoutOptions);
}

// Production domain approved by Paddle (without www)
const PADDLE_APPROVED_DOMAIN = 'https://kure-cal.com';

/**
 * Get the base URL for checkout redirects.
 * Uses the Paddle-approved domain in production, or localhost in development.
 */
function getCheckoutBaseUrl(): string {
  if (typeof window === 'undefined') return PADDLE_APPROVED_DOMAIN;
  
  // Use localhost in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return window.location.origin;
  }
  
  // Use Paddle-approved domain in production
  return PADDLE_APPROVED_DOMAIN;
}

/**
 * Open checkout for Pro Monthly subscription
 */
export async function openProMonthlyCheckout(
  userId: string,
  userEmail?: string,
  frameTarget?: string // Optional for backward compatibility, but needed for inline
): Promise<void> {
  if (!PADDLE_PRICES.pro_monthly) {
    const envVar = PADDLE_ENVIRONMENT === 'sandbox' 
      ? 'NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID_SANDBOX'
      : 'NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY';
    throw new Error(`Pro monthly price not configured. Missing env var: ${envVar}`);
  }

  // Don't pass URLs - let Paddle use the default payment link for redirects
  return openCheckout({
    priceId: PADDLE_PRICES.pro_monthly,
    userId,
    userEmail,
  });
}

/**
 * Open checkout for Pro Annual subscription
 */
export async function openProAnnualCheckout(
  userId: string,
  userEmail?: string,
  frameTarget?: string
): Promise<void> {
  if (!PADDLE_PRICES.pro_annual) {
    throw new Error('Pro annual price not configured');
  }

  // Don't pass URLs - let Paddle use the default payment link for redirects
  return openCheckout({
    priceId: PADDLE_PRICES.pro_annual,
    userId,
    userEmail,
  });
}

/**
 * Open Paddle customer portal
 * Users can manage their subscription, update payment method, etc.
 *
 * @param subscription User's subscription with paddle_customer_id and paddle_subscription_id
 */
export function openCustomerPortal(subscription: Subscription): void {
  if (!subscription.paddle_customer_id || !subscription.paddle_subscription_id) {
    console.error('No Paddle customer ID or subscription ID found');
    return;
  }

  // Paddle customer portal is hosted by Paddle
  // The URL format depends on your Paddle configuration
  const portalUrl = PADDLE_ENVIRONMENT === 'production'
    ? `https://customer.paddle.com/subscriptions/${subscription.paddle_subscription_id}`
    : `https://sandbox-customer.paddle.com/subscriptions/${subscription.paddle_subscription_id}`;

  window.open(portalUrl, '_blank');
}

/**
 * Check if Paddle is properly configured
 */
export function isPaddleConfigured(): boolean {
  return !!(
    PADDLE_CLIENT_TOKEN &&
    PADDLE_PRICES.pro_monthly &&
    PADDLE_PRICES.pro_annual
  );
}

/**
 * Open Paddle inline checkout
 * 
 * @param options Checkout options
 */
export async function openInlineCheckout(options: {
  priceId: string;
  userEmail?: string;
  userId: string;
  frameTarget: string; // ID of the container element
  frameStyle?: string;
  successUrl?: string;
}): Promise<void> {
  if (!paddleInitialized) {
    await initPaddle();
  }

  if (!window.Paddle) {
    throw new Error('Paddle not initialized');
  }

  const settings: PaddleCheckoutSettings = {
    displayMode: 'inline',
    theme: 'light', // Force light theme: we use a CSS filter (invert) on the container to make it dark
    frameTarget: options.frameTarget,
    frameInitialHeight: 450, 
    frameStyle: options.frameStyle || 'width: 100%; min-width: 312px; background-color: transparent; border: none;', // Transparent bg helper
  };
  
  if (options.successUrl) {
    settings.successUrl = options.successUrl;
  }

  const checkoutOptions: PaddleCheckoutOptions = {
    settings,
    items: [{ priceId: options.priceId, quantity: 1 }],
    customer: options.userEmail ? { email: options.userEmail } : undefined,
    customData: {
      user_id: options.userId,
    },
  };

  console.log('Opening inline checkout:', checkoutOptions);
  
  window.Paddle.Checkout.open(checkoutOptions);
}
