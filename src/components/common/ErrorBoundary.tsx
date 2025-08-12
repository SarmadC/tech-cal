// src/components/common/ErrorBoundary.tsx
'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
}

// A simple default fallback UI if none is provided
const DefaultFallback = ({ onReset }: { onReset: () => void }) => (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
        <p className="mb-3 font-semibold">Something went wrong</p>
        <p className="mb-4 text-xs">This part of the app could not be loaded.</p>
        <Button variant="destructive" size="sm" onClick={onReset}>
            Try Again
        </Button>
    </div>
);

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(_: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // You can also log the error to an error reporting service here
        // For example: Sentry.captureException(error, { extra: errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    private resetState = () => {
        this.setState({ hasError: false });
    }

    public render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return <DefaultFallback onReset={this.resetState} />;
        }

        return this.props.children;
    }
}