import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { 
  Product, 
  APIClient, 
  createAPIClient, 
  NetworkError, 
  APP_CONFIG,
  getKioskIdFromUrl,
  getKioskSecretFromUrl,
  useErrorHandler
} from 'pi-kiosk-shared';

interface UseProductsOptions {
  kioskId?: number;
  apiClient?: APIClient;
}

export function useProducts(options: UseProductsOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const { handleError } = useErrorHandler();
  
  const kioskId = options.kioskId || getKioskIdFromUrl();
  const kioskSecret = getKioskSecretFromUrl();
  const apiClient = options.apiClient || createAPIClient(undefined, kioskSecret);

  // SWR fetcher with proper error handling
  const fetcher = async (url: string): Promise<Product[]> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: { products: Product[] } }>(url);
      
      if (response.success && response.data?.products) {
        return response.data.products;
      } else {
        throw new NetworkError('Nepodařilo se načíst produkty');
      }
    } catch (error) {
      // Transform fetch errors to our error system
      if (error instanceof Error) {
        throw new NetworkError(`Chyba při načítání produktů: ${error.message}`);
      }
      throw new NetworkError('Nepodařilo se načíst produkty');
    }
  };

  // SWR configuration with intelligent caching and revalidation
  const { 
    data: products, 
    error, 
    mutate, 
    isLoading,
    isValidating 
  } = useSWR(
    `/api/products?kioskId=${kioskId}`,
    fetcher,
    {
      // Revalidate every 30 seconds as fallback
      refreshInterval: APP_CONFIG.PRODUCT_CACHE_TTL / 10, // 30 seconds
      // Revalidate on window focus
      revalidateOnFocus: true,
      // Revalidate on reconnect
      revalidateOnReconnect: true,
      // Don't revalidate on mount if we have data
      revalidateIfStale: true,
      // Retry configuration
      errorRetryCount: APP_CONFIG.RETRY_ATTEMPTS,
      errorRetryInterval: APP_CONFIG.RETRY_DELAY,
      // Dedupe requests
      dedupingInterval: 2000,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Error handling
      onError: (error) => {
        handleError(error, 'useProducts.fetcher');
        setIsConnected(false);
      },
      onSuccess: () => {
        setIsConnected(true);
      }
    }
  );

  // Handle WebSocket updates and admin refresh requests
  useEffect(() => {
    const handleWebSocketMessage = (event: CustomEvent) => {
      try {
        const message = JSON.parse(event.detail.data);
        
        if (message.type === 'product_update') {
          console.log('📡 Received product update via WebSocket:', message);
          
          // Handle different types of updates
          if (message.updateType === 'inventory_updated') {
            console.log('📦 Inventory updated, refreshing products...');
            // Force immediate revalidation for inventory changes
            mutate(undefined, { revalidate: true });
          } else if (message.updateType === 'product_created' || message.updateType === 'product_updated') {
            console.log('🛍️ Product data changed, refreshing products...');
            // Force immediate revalidation for product changes
            mutate(undefined, { revalidate: true });
          } else {
            // Default behavior for other updates
            mutate();
          }
        }
      } catch (error) {
        handleError(error as Error, 'useProducts.handleWebSocketMessage');
      }
    };

    const handleAdminRefresh = () => {
      console.log('🔄 Admin requested refresh, updating products...');
      mutate(undefined, { revalidate: true });
    };

    const handleForceRefresh = () => {
      console.log('🔄 Force refresh requested, updating products...');
      mutate(undefined, { revalidate: true });
    };

    // Listen for WebSocket messages and admin refresh requests
    window.addEventListener('websocket-message', handleWebSocketMessage as EventListener);
    window.addEventListener('admin-refresh-requested', handleAdminRefresh);
    window.addEventListener('force-refresh', handleForceRefresh);
    
    return () => {
      window.removeEventListener('websocket-message', handleWebSocketMessage as EventListener);
      window.removeEventListener('admin-refresh-requested', handleAdminRefresh);
      window.removeEventListener('force-refresh', handleForceRefresh);
    };
  }, [mutate, handleError]);

  // Track product click with error handling
  const trackProductClick = useCallback(async (productId: number): Promise<void> => {
    try {
      await apiClient.post(`/api/products/${productId}/click`, { kioskId });
    } catch (error) {
      // Don't throw - clicking should still work even if tracking fails
      handleError(error as Error, 'useProducts.trackProductClick');
    }
  }, [apiClient, kioskId, handleError]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  // Force revalidation
  const revalidate = useCallback(() => {
    return mutate(undefined, { revalidate: true });
  }, [mutate]);

  return {
    products: products || [],
    isLoading,
    isValidating,
    error,
    isConnected,
    setIsConnected,
    trackProductClick,
    refresh,
    revalidate,
    // Computed properties
    hasProducts: (products?.length || 0) > 0,
    isEmpty: !isLoading && !error && (products?.length || 0) === 0,
    hasError: !!error
  };
}
