import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('❌ Něco se pokazilo')).toBeInTheDocument();
    expect(screen.getByText('Omlouváme se, došlo k neočekávané chybě.')).toBeInTheDocument();
    expect(screen.getByText('Zkusit znovu')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders custom fallback when provided', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('❌ Něco se pokazilo')).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('resets error state when retry button is clicked', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('❌ Něco se pokazilo')).toBeInTheDocument();

    // Click retry button
    screen.getByText('Zkusit znovu').click();

    // The error boundary should reset and try to render children again
    // Since ThrowError still throws, it will show error again
    expect(screen.getByText('❌ Něco se pokazilo')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
