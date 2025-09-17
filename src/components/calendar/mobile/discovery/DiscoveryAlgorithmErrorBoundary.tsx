'use client';

import React, { Component, ReactNode } from 'react';
import { Warning, ArrowClockwise, Lightbulb } from '@phosphor-icons/react';

interface DiscoveryAlgorithmErrorBoundaryProps {
  children: ReactNode;
  algorithmName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface DiscoveryAlgorithmErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

/**
 * Error boundary specifically for discovery algorithm failures
 * Handles errors from DiscoveryService methods gracefully
 */
class DiscoveryAlgorithmErrorBoundary extends Component<
  DiscoveryAlgorithmErrorBoundaryProps,
  DiscoveryAlgorithmErrorBoundaryState
> {
  private maxRetries = 2;

  constructor(props: DiscoveryAlgorithmErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DiscoveryAlgorithmErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Discovery algorithm error:', {
      algorithm: this.props.algorithmName || 'unknown',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        retryCount: this.state.retryCount + 1
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Determine error type for better messaging
      const isCareerProfileError = this.state.error?.message.includes('career') || 
                                   this.state.error?.message.includes('profile');
      const isLocationError = this.state.error?.message.includes('location');
      const isDataError = this.state.error?.message.includes('events') ||
                          this.state.error?.message.includes('data');

      return (
        <div className="discovery-algorithm-error">
          <div className="error-content">
            <Warning size={32} className="error-icon" />
            
            <h3 className="error-title">
              {this.props.algorithmName ? 
                `${this.props.algorithmName} Algorithm Error` : 
                'Discovery Algorithm Error'
              }
            </h3>
            
            <div className="error-message">
              {isCareerProfileError && (
                <p>
                  We&apos;re having trouble analyzing your career profile. 
                  Your recommendations may be limited until this is resolved.
                </p>
              )}
              {isLocationError && (
                <p>
                  Location-based recommendations are temporarily unavailable. 
                  You&apos;ll still see general tech events.
                </p>
              )}
              {isDataError && (
                <p>
                  There&apos;s an issue processing event data. 
                  Please try refreshing or check back shortly.
                </p>
              )}
              {!isCareerProfileError && !isLocationError && !isDataError && (
                <p>
                  Something went wrong with our recommendation engine. 
                  We&apos;re working to fix this issue.
                </p>
              )}
            </div>

            <div className="error-actions">
              {this.state.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="error-retry-button"
                  aria-label="Retry algorithm"
                >
                  <ArrowClockwise size={16} />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </button>
              )}
              
              <div className="error-suggestions">
                <Lightbulb size={16} className="suggestion-icon" />
                <div className="suggestions-list">
                  <span className="suggestion-title">Suggestions:</span>
                  {isCareerProfileError && (
                    <span>• Complete your career profile in settings</span>
                  )}
                  {isLocationError && (
                    <span>• Check your browser location permissions</span>
                  )}
                  <span>• Refresh the page</span>
                  <span>• Browse events manually using the calendar view</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DiscoveryAlgorithmErrorBoundary;
