'use client';

import React from 'react';

// Error Boundary Component for graceful error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error to analytics if available
    if (typeof window !== 'undefined' && window.frogAnalytics) {
      window.frogAnalytics.trackError(error, errorInfo);
    }

    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="glass-card max-w-md w-full p-6 text-center">
            {/* Sad Frog */}
            <div className="text-6xl mb-4">
              <span role="img" aria-label="sad frog">🐸</span>
              <span className="text-3xl ml-2">😵</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Oops! Something hopped wrong
            </h2>

            <p className="text-white/60 text-sm mb-6">
              Don't worry, your tasks are safe! The app encountered an unexpected error.
            </p>

            {/* Error details (collapsible in dev) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-white/40 text-xs cursor-pointer hover:text-white/60">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 bg-black/30 rounded-lg text-red-400 text-xs overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full glass-button py-3 text-white font-medium flex items-center justify-center gap-2"
              >
                <span>🔄</span> Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="w-full py-2 text-white/60 hover:text-white/80 text-sm transition-colors"
              >
                Reload App
              </button>
            </div>

            <p className="text-white/30 text-xs mt-4">
              If this keeps happening, try clearing your browser cache or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function withErrorBoundary(Component, fallback = null) {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Small error boundary for individual components
export function ComponentErrorBoundary({ children, name = 'Component' }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="glass-card p-4 text-center">
          <span className="text-2xl">🐸</span>
          <p className="text-white/60 text-sm mt-2">
            {name} couldn't load. <button onClick={() => window.location.reload()} className="underline">Refresh</button>
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Async boundary for suspense + error handling
export function AsyncBoundary({ children, fallback, errorFallback }) {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <React.Suspense fallback={fallback || <LoadingFrog />}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

// Loading component
function LoadingFrog() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-4xl animate-bounce">🐸</div>
    </div>
  );
}

export default ErrorBoundary;
