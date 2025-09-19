'use client';

import React from 'react';
import { Warning } from '@phosphor-icons/react';
import * as Sentry from '@sentry/nextjs';

interface RecommendationErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  sectionName?: string;
}

interface RecommendationErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class RecommendationErrorBoundary extends React.Component<
  RecommendationErrorBoundaryProps,
  RecommendationErrorBoundaryState
> {
  constructor(props: RecommendationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): RecommendationErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Recommendation Error Boundary caught an error:', error, errorInfo);
    
    Sentry.captureException(error, {
      tags: {
        component: 'RecommendationErrorBoundary',
        section: this.props.sectionName || 'unknown'
      },
      extra: {
        errorInfo,
        sectionName: this.props.sectionName
      }
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="recommendation-error-fallback p-4 text-center">
          <Warning size={32} className="text-amber-500 mx-auto mb-2" />
          <h3 className="font-medium text-gray-900 mb-1">
            {this.props.sectionName ? `${this.props.sectionName} Temporarily Unavailable` : 'Recommendations Unavailable'}
          </h3>
          <p className="text-sm text-gray-600">
            We&apos;re working on getting your personalized recommendations back online.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RecommendationErrorBoundary;
