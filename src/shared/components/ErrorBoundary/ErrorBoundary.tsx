import type { ReactNode } from 'react';
import { Component } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }): void {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const fallback = this.props.fallback ?? (
        <div className={styles.errorBoundary}>
          <h2>❌ Něco se pokazilo</h2>
          <p>Omlouváme se, došlo k neočekávané chybě.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Zkusit znovu
          </button>
        </div>
      );
      return fallback as JSX.Element;
    }

    return this.props.children as JSX.Element;
  }
}
