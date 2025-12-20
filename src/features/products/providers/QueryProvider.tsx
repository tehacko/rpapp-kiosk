/**
 * React Query Provider
 * Configures QueryClient with optimal settings for real-time updates
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode} from 'react';
import { useMemo } from 'react';
import { APP_CONFIG } from '../../../shared/constants';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Create QueryClient with optimal configuration for real-time updates
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // CRITICAL: Set to 0 for immediate real-time updates
        staleTime: 0,
        // Cache time: keep unused data in cache for 5 minutes (formerly cacheTime)
        gcTime: 5 * 60 * 1000,
        // Retry configuration
        retry: APP_CONFIG.RETRY_ATTEMPTS,
        retryDelay: APP_CONFIG.RETRY_DELAY,
        // Refetch on window focus for real-time updates
        refetchOnWindowFocus: true,
        // Refetch on reconnect
        refetchOnReconnect: true,
        // Don't refetch on mount - SSE will trigger updates when needed
        refetchOnMount: false,
        // Network mode: prefer online, fallback to cache
        networkMode: 'online',
        // Disable structural sharing globally to force re-renders
        structuralSharing: false,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
        // Network mode for mutations
        networkMode: 'online',
      },
    },
  });
}

export function QueryProvider({ children }: QueryProviderProps): JSX.Element {
  // Memoize QueryClient to prevent recreation on every render
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

