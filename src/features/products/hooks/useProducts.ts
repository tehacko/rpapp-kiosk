import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  startTransition,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  KioskProduct,
  APIClient,
  createAPIClient,
  NetworkError,
  APP_CONFIG,
  getKioskIdFromUrl,
  getKioskSecretFromUrl,
  useErrorHandler,
  API_ENDPOINTS,
  ApiResponse,
} from 'pi-kiosk-shared';

interface UseProductsOptions {
  kioskId?: number;
  apiClient?: APIClient;
}

export function useProducts(options: UseProductsOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  const kioskId = options.kioskId || getKioskIdFromUrl();
  const kioskSecret = getKioskSecretFromUrl();
  const apiClient = options.apiClient || createAPIClient(undefined, kioskSecret);

  // Extract cache key to memoized constant for exact matching in query keys
  const cacheKey = useMemo(
    () => [API_ENDPOINTS.PRODUCTS, { kioskId }] as const,
    [kioskId]
  );

  // React Query fetcher with proper error handling
  const fetcher = useCallback(
    async (): Promise<KioskProduct[]> => {
      try {
        // Add timestamp to force cache bypass (prevent HTTP 304 Not Modified)
        const timestamp = Date.now();
        const url = `${API_ENDPOINTS.PRODUCTS}?kioskId=${kioskId}&_t=${timestamp}`;
        const response = await apiClient.get<
          ApiResponse<{ products: KioskProduct[] }>
        >(url);

        if (response.success && response.data?.products) {
          return response.data.products;
        } else {
          throw new NetworkError('Nepodařilo se načíst produkty');
        }
      } catch (error) {
        // Transform fetch errors to our error system
        if (error instanceof Error) {
          throw new NetworkError(
            `Chyba při načítání produktů: ${error.message}`
          );
        }
        throw new NetworkError('Nepodařilo se načíst produkty');
      }
    },
    [apiClient, kioskId]
  );

  // React Query configuration optimized for real-time updates
  const {
    data: products,
    error,
    isLoading,
    isFetching: isValidating,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: fetcher,
    // Revalidate every 30 seconds as fallback
    refetchInterval: APP_CONFIG.PRODUCT_CACHE_TTL / 10, // 30 seconds
    // CRITICAL: Set to 0 for immediate real-time updates
    staleTime: 0,
    // Don't refetch on mount - SSE will trigger updates when needed
    refetchOnMount: false,
    // Refetch on window focus
    refetchOnWindowFocus: true,
    // Retry configuration
    retry: APP_CONFIG.RETRY_ATTEMPTS,
    retryDelay: APP_CONFIG.RETRY_DELAY,
    // Disable structural sharing to force re-renders on data change
    structuralSharing: false,
  });

  // Handle query state changes (React Query v5 doesn't support onError/onSuccess)
  useEffect(() => {
    if (error) {
      handleError(error as Error, 'useProducts.fetcher');
      setIsConnected(false);
    } else if (products) {
      setIsConnected(true);
    }
  }, [error, products, handleError]);

  // Monitor SSE connection status for debugging
  useEffect(() => {
    console.log(`📡 SSE Connection Status: ${isConnected ? '✅ Connected' : '❌ Disconnected'}`);
  }, [isConnected]);

  // Use refs to ensure we always have the latest values (prevents stale closures)
  const queryClientRef = useRef(queryClient);
  const cacheKeyRef = useRef(cacheKey);
  const kioskIdRef = useRef(kioskId);
  const fetcherRef = useRef(fetcher);

  // Update refs when values change
  useEffect(() => {
    queryClientRef.current = queryClient;
    cacheKeyRef.current = cacheKey;
    kioskIdRef.current = kioskId;
    fetcherRef.current = fetcher;
  }, [queryClient, cacheKey, kioskId, fetcher]);

  // Handle WebSocket updates and admin refresh requests
  useEffect(() => {
    const handleWebSocketMessage = (event: CustomEvent) => {
      try {
        const message = JSON.parse(event.detail.data);

        // Debug logging for all product_update messages
        if (message.type === 'product_update') {
          console.log('📡 Received product update via WebSocket:', {
            type: message.type,
            updateType: message.updateType,
            data: message.data,
            currentKioskId: kioskIdRef.current,
            timestamp: message.timestamp
          });

          // Handle different types of updates
          if (message.updateType === 'inventory_updated') {
            const targetKioskId = message.data?.kioskId;
            const productId = message.data?.productId;
            const active = message.data?.active;

            // Ensure both are numbers for comparison (handle type coercion)
            const targetKioskIdNum = Number(targetKioskId);
            const currentKioskIdNum = Number(kioskIdRef.current);

            // Debug logging for troubleshooting
            console.log('🔍 DEBUG: Comparing kioskIds for inventory update:', {
              targetKioskId,
              targetKioskIdNum,
              currentKioskId: kioskIdRef.current,
              currentKioskIdNum,
              match: targetKioskIdNum === currentKioskIdNum,
              productId,
              active,
              visible: message.data?.visible
            });

            // Only process if this update is for our kiosk
            if (targetKioskIdNum === currentKioskIdNum && !isNaN(targetKioskIdNum) && !isNaN(currentKioskIdNum)) {
              console.log(
                '📦 Inventory or visibility updated, immediately refreshing products...',
                {
                  productId,
                  kioskId: targetKioskIdNum,
                  visible: message.data?.visible,
                  active,
                }
              );

              const currentQueryClient = queryClientRef.current;
              const currentCacheKey = cacheKeyRef.current;

              if (active === false) {
                // URGENT: Hide product immediately - optimistic update without transition
                currentQueryClient.setQueryData<KioskProduct[]>(
                  currentCacheKey,
                  (oldData) => {
                    if (!oldData || !Array.isArray(oldData)) {
                      console.warn(
                        `⚠️ Current products is not an array, returning empty array`
                      );
                      return [];
                    }
                    const filtered = oldData.filter((p) => p.id !== productId);
                    console.log(
                      `✅ Optimistically removed product ${productId} from display (${oldData.length} → ${filtered.length})`
                    );
                    return filtered;
                  }
                );

                // Revalidate in background (non-urgent)
                startTransition(() => {
                  currentQueryClient.invalidateQueries({
                    queryKey: currentCacheKey,
                  });
                });
              } else {
                // URGENT: Show product - force immediate refetch
                console.log(`🔄 Product ${productId} should be shown, forcing immediate refetch...`);
                
                // Cancel any in-flight requests to prevent race conditions
                currentQueryClient.cancelQueries({
                  queryKey: currentCacheKey,
                });
                
                // Invalidate to mark data as stale
                currentQueryClient.invalidateQueries({
                  queryKey: currentCacheKey,
                });
                
                // Force immediate refetch (don't wait for background)
                const refetchPromise = currentQueryClient.refetchQueries({
                  queryKey: currentCacheKey,
                  type: 'active',
                });
                
                console.log(`⏳ Refetch promise created for product ${productId}, waiting for result...`);
                
                refetchPromise.then((results) => {
                  console.log(`📊 Refetch results for product ${productId}:`, {
                    resultsLength: Array.isArray(results) ? results.length : 0,
                    results: Array.isArray(results) ? results.map((r: any) => ({ 
                      state: r.state.status, 
                      dataLength: Array.isArray(r.state.data) ? r.state.data.length : 'not array',
                      error: r.state.error 
                    })) : []
                  });
                  
                  const currentProducts = currentQueryClient.getQueryData<KioskProduct[]>(currentCacheKey);
                  const hasProduct = currentProducts?.some(p => p.id === productId);
                  console.log(`✅ Product ${productId} refetch completed. In list: ${hasProduct}, total: ${currentProducts?.length || 0}`);
                  
                  if (!hasProduct) {
                    console.warn(`⚠️ Product ${productId} still not in list after refetch! Retrying in 200ms...`);
                    setTimeout(() => {
                      currentQueryClient.refetchQueries({
                        queryKey: currentCacheKey,
                        type: 'active',
                      });
                    }, 200);
                  }
                }).catch((error) => {
                  console.error(`❌ Failed to refetch product ${productId}:`, error);
                  // Retry once after 500ms
                  setTimeout(() => {
                    currentQueryClient.refetchQueries({
                      queryKey: currentCacheKey,
                      type: 'active',
                    });
                  }, 500);
                });
              }
            } else {
              console.log(
                `⏭️ Skipping update for different kiosk: ${targetKioskIdNum} (current: ${currentKioskIdNum})`,
                {
                  targetType: typeof targetKioskId,
                  currentType: typeof kioskIdRef.current,
                  targetKioskId,
                  currentKioskId: kioskIdRef.current
                }
              );
            }
          } else if (
            message.updateType === 'product_created' ||
            message.updateType === 'product_updated'
          ) {
            console.log('🛍️ Product data changed, immediately refreshing products...');
            startTransition(() => {
              queryClientRef.current.invalidateQueries({
                queryKey: cacheKeyRef.current,
              });
            });
          } else if (message.updateType === 'product_deleted') {
            console.log('🗑️ Product deleted, immediately refreshing products...');
            const deletedProductId = message.data?.productId;
            const currentQueryClient = queryClientRef.current;
            const currentCacheKey = cacheKeyRef.current;

            // URGENT: Remove deleted product immediately
            currentQueryClient.setQueryData<KioskProduct[]>(
              currentCacheKey,
              (oldData) => {
                if (!oldData || !Array.isArray(oldData)) {
                  console.warn(
                    `⚠️ Current products is not an array, returning empty array`
                  );
                  return [];
                }
                const filtered = oldData.filter(
                  (p) => p.id !== deletedProductId
                );
                console.log(
                  `✅ Optimistically removed deleted product ${deletedProductId} (${oldData.length} → ${filtered.length})`
                );
                return filtered;
              }
            );

            // Revalidate in background
            startTransition(() => {
              currentQueryClient.invalidateQueries({
                queryKey: currentCacheKey,
              });
            });
          } else {
            // Default behavior - non-urgent
            startTransition(() => {
              queryClientRef.current.invalidateQueries({
                queryKey: cacheKeyRef.current,
              });
            });
          }
        }
      } catch (error) {
        console.error('❌ Error handling WebSocket message:', error, event);
        handleError(error as Error, 'useProducts.handleWebSocketMessage');
      }
    };

    const handleForceRefresh = () => {
      console.log('🔄 Force refresh requested, updating products...');
      startTransition(() => {
        queryClientRef.current.invalidateQueries({
          queryKey: cacheKeyRef.current,
        });
      });
    };

    // Listen for WebSocket messages and force refresh requests
    window.addEventListener('websocket-message', handleWebSocketMessage as EventListener);
    window.addEventListener('force-refresh', handleForceRefresh);

    return () => {
      window.removeEventListener(
        'websocket-message',
        handleWebSocketMessage as EventListener
      );
      window.removeEventListener('force-refresh', handleForceRefresh);
    };
  }, [queryClient, handleError, kioskId, cacheKey]);

  // Track product click with error handling
  const trackProductClick = useCallback(
    async (productId: number): Promise<void> => {
      try {
        await apiClient.post(
          API_ENDPOINTS.PRODUCT_CLICK.replace(':id', productId.toString()),
          { kioskId }
        );
      } catch (error) {
        // Don't throw - clicking should still work even if tracking fails
        handleError(error as Error, 'useProducts.trackProductClick');
      }
    },
    [apiClient, kioskId, handleError]
  );

  // Manual refresh function - force refetch to get fresh data
  const refresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered, refetching products...');
    return queryClient.refetchQueries({ queryKey: cacheKey });
  }, [queryClient, cacheKey]);

  // Force revalidation
  const revalidate = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: cacheKey });
  }, [queryClient, cacheKey]);

  // CRITICAL: Always ensure products is an array to prevent "filter is not a function" errors
  // Use products directly (not deferred) for immediate updates when visibility changes
  const safeProducts = useMemo(() => {
    return Array.isArray(products) ? products : [];
  }, [products]);

  return {
    products: safeProducts,
    isLoading,
    isValidating,
    error,
    isConnected,
    setIsConnected,
    trackProductClick,
    refresh,
    revalidate,
    // Computed properties
    hasProducts: safeProducts.length > 0,
    isEmpty: !isLoading && !error && safeProducts.length === 0,
    hasError: !!error,
  };
}
