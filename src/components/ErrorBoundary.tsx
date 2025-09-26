import { Component, ReactNode } from 'react';
import { AppError, formatError, UI_MESSAGES } from 'pi-kiosk-shared';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Format error for consistent logging
    const formattedError = formatError(error, {
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    });
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.warn('Production error captured by ErrorBoundary:', formattedError);
      // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined,
      errorId: undefined 
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.name === 'NetworkError';
      const isAppError = this.state.error instanceof AppError;

      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">❌</div>
            <h2 className="error-title">
              {isNetworkError ? 'Problém s připojením' : 'Něco se pokazilo'}
            </h2>
            <p className="error-message">
              {isAppError 
                ? this.state.error?.message 
                : UI_MESSAGES.UNKNOWN_ERROR
              }
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Technické detaily</summary>
                <pre className="error-stack">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-btn primary"
              >
                🔄 Zkusit znovu
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="reload-btn secondary"
              >
                ↻ Obnovit stránku
              </button>
            </div>
            
            {this.state.errorId && (
              <div className="error-id">
                ID chyby: {this.state.errorId}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
