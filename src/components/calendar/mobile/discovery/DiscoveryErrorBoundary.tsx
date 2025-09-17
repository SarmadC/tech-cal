'use client';

import React, { Component, ReactNode } from 'react';
import { Warning, ArrowClockwise } from '@phosphor-icons/react';

interface DiscoveryErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  fallback?: ReactNode;
}

interface DiscoveryErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class DiscoveryErrorBoundary extends Component<DiscoveryErrorBoundaryProps, DiscoveryErrorBoundaryState> {
  constructor(props: DiscoveryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): DiscoveryErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Discovery section error:', error, errorInfo);
    
    // Report to monitoring service (simplified for now)
    console.error('Discovery Error:', {
      component: 'DiscoveryErrorBoundary',
      section: this.props.sectionName || 'unknown',
      error: error.message,
      stack: error.stack
    });

    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="discovery-error-boundary">
          <div className="error-content">
            <Warning size={32} className="error-icon" />
            <h3 className="error-title">
              {this.props.sectionName ? `${this.props.sectionName} Unavailable` : 'Discovery Error'}
            </h3>
            <p className="error-message">
              We&apos;re having trouble loading recommendations. Please try again.
            </p>
            <button 
              onClick={this.handleRetry}
              className="error-retry-button"
              aria-label="Retry loading discovery section"
            >
              <ArrowClockwise size={16} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DiscoveryErrorBoundary;
