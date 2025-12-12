import { useState, useCallback } from 'react';

export interface UseEmailValidationResult {
  error: string | null;
  validateEmail: (email: string) => boolean;
  clearError: () => void;
}

export function useEmailValidation(): UseEmailValidationResult {
  const [error, setError] = useState<string | null>(null);

  const validateEmail = useCallback((email: string): boolean => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      setError('Email je povinný');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Neplatný formát emailu');
      return false;
    }

    setError(null);
    return true;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    validateEmail,
    clearError
  };
}
