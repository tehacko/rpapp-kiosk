import { useCallback, useState } from 'react';
import type { AppError } from 'pi-kiosk-shared';
import { getErrorMessage, formatError } from 'pi-kiosk-shared';

export interface ErrorState {
  error: AppError | Error | null;
  message: string;
  isVisible: boolean;
}

export function useErrorHandler(): {
  error: AppError | Error | null;
  errorMessage: string;
  isErrorVisible: boolean;
  handleError: (error: Error | AppError, context?: string) => void;
  clearError: () => void;
  retryAction: (action: () => Promise<void> | void) => void;
} {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    message: '',
    isVisible: false
  });

  const handleError = useCallback((error: Error | AppError, context?: string) => {
    console.error(`Error in ${context ?? 'unknown context'}:`, error);
    
    const userMessage = getErrorMessage(error);
    
    setErrorState({
      error,
      message: userMessage,
      isVisible: true
    });

    // Auto-hide error after 5 seconds
    setTimeout(() => {
      setErrorState(prev => ({ ...prev, isVisible: false }));
    }, 5000);

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with monitoring service (Sentry, LogRocket, etc.)
      console.warn('Production error logged:', formatError(error));
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      message: '',
      isVisible: false
    });
  }, []);

  const retryAction = useCallback((action: () => Promise<void> | void) => {
    clearError();
    try {
      const result = action();
      if (result instanceof Promise) {
        result.catch(handleError);
      }
    } catch (error) {
      handleError(error as Error);
    }
  }, [handleError, clearError]);

  return {
    error: errorState.error,
    errorMessage: errorState.message,
    isErrorVisible: errorState.isVisible,
    handleError,
    clearError,
    retryAction
  };
}

