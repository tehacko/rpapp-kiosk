import { useState, useEffect, useCallback, useRef } from 'react';
import { createAPIClient, API_ENDPOINTS } from 'pi-kiosk-shared';

/**
 * Provider status level
 */
export type ProviderStatusLevel = 'healthy' | 'degraded' | 'unavailable';

/**
 * Individual provider status
 */
export interface ProviderStatus {
  name: string;
  status: ProviderStatusLevel;
  latencyMs: number | null;
  checkedAt: string;
  errorCode?: string;
  failCount: number;
  available: boolean;
  configured: boolean;
  lastSuccessAt?: string;
  monitoringActive?: boolean;
}

/**
 * Payment providers status response
 */
export interface PaymentProvidersStatus {
  providers: ProviderStatus[];
  lastCheckAt: string;
}

/**
 * API response shape
 */
interface PaymentProvidersResponse {
  success: boolean;
  data: PaymentProvidersStatus;
}

/**
 * Hook return type
 */
export interface UsePaymentProviderStatusReturn {
  thepay: ProviderStatus | null;
  qr: ProviderStatus | null;
  isLoading: boolean;
  error: string | null;
  lastFetchAt: Date | null;
  refresh: () => Promise<void>;
}

// Default polling interval: 45 seconds (between 30-60s as recommended)
const POLLING_INTERVAL_MS = 45000;

// Retry interval when fetch fails
const ERROR_RETRY_INTERVAL_MS = 15000;

/**
 * Hook to poll payment provider status from the backend
 * Used to determine which payment methods are available
 */
export function usePaymentProviderStatus(): UsePaymentProviderStatusReturn {
  const [thepay, setThepay] = useState<ProviderStatus | null>(null);
  const [qr, setQr] = useState<ProviderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null);
  
  const apiClient = useRef(createAPIClient());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiClient.current.get<PaymentProvidersResponse>(
        API_ENDPOINTS.HEALTH_PAYMENT_PROVIDERS
      );

      if (!isMountedRef.current) return;

      if (response.success && response.data?.providers) {
        const providers = response.data.providers;
        
        // Find ThePay and QR providers
        const thepayStatus = providers.find(p => p.name === 'thepay') ?? null;
        const qrStatus = providers.find(p => p.name === 'qr') ?? null;
        
        setThepay(thepayStatus);
        setQr(qrStatus);
        setError(null);
        setLastFetchAt(new Date());
      } else {
        setError('Invalid response from payment providers health check');
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payment provider status';
      console.warn('[usePaymentProviderStatus] Fetch error:', errorMessage);
      setError(errorMessage);
      
      // On error, don't clear existing status - keep last known state
      // This prevents flickering when there's a temporary network issue
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  // Initial fetch and polling setup
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    void fetchStatus();

    // Set up polling
    intervalRef.current = setInterval(() => {
      void fetchStatus();
    }, error ? ERROR_RETRY_INTERVAL_MS : POLLING_INTERVAL_MS);

    return (): void => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchStatus, error]);

  // Listen for SSE provider_status_change events for immediate update
  useEffect(() => {
    const handleSSEMessage = (event: CustomEvent<{ data: string }>): void => {
      try {
        const message = JSON.parse(event.detail.data);
        
        // Check if this is a provider status change event
        if (message.type === 'provider_status_change' && message.data) {
          const { provider, available, status, checkedAt } = message.data as {
            provider: 'thepay' | 'qr';
            available: boolean;
            status: ProviderStatusLevel;
            checkedAt: string;
          };
          
          console.info('📡 [usePaymentProviderStatus] Received provider status change:', message.data);
          
          // Update state directly from SSE data (no API call needed)
          if (provider === 'thepay') {
            setThepay(prev => prev ? {
              ...prev,
              available,
              status,
              checkedAt,
            } : {
              name: 'thepay',
              status,
              latencyMs: null,
              checkedAt,
              failCount: 0,
              available,
              configured: true,
            });
          } else if (provider === 'qr') {
            setQr(prev => prev ? {
              ...prev,
              available,
              status,
              checkedAt,
            } : {
              name: 'qr',
              status,
              latencyMs: null,
              checkedAt,
              failCount: 0,
              available,
              configured: true,
            });
          }
          
          setLastFetchAt(new Date());
          setError(null);
        }
      } catch {
        // Ignore parse errors - not all messages are JSON
      }
    };

    window.addEventListener('websocket-message', handleSSEMessage as EventListener);
    
    return (): void => {
      window.removeEventListener('websocket-message', handleSSEMessage as EventListener);
    };
  }, []);

  return {
    thepay,
    qr,
    isLoading,
    error,
    lastFetchAt,
    refresh,
  };
}

