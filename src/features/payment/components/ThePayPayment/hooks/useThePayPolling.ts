import { useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiResponse } from 'pi-kiosk-shared';
import { 
  createAPIClient,
  API_ENDPOINTS
} from 'pi-kiosk-shared';
import { buildTenantApiBase, getTenantFromPath } from '../../../../../shared/tenant';
import { THEPAY_MODE } from './useThePayPayment';

export interface UseThePayPollingDeps {
  kioskId: number;
  paymentId: string | null;
  isNavigatingRef: React.MutableRefObject<boolean>;
  enabled: boolean;
}

export function useThePayPolling({ 
  kioskId, 
  paymentId, 
  isNavigatingRef,
  enabled 
}: UseThePayPollingDeps): { stopPolling: () => void } {
  const navigate = useNavigate();
  const tenant = getTenantFromPath();
  const apiClient = createAPIClient(buildTenantApiBase(), undefined, tenant ?? undefined);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const paymentIdRef = useRef<string | null>(paymentId);

  // Update ref when paymentId changes
  if (paymentIdRef.current !== paymentId) {
    paymentIdRef.current = paymentId;
  }

  // QR mode: Status polling (FALLBACK method - reliable)
  // This catches payment completion if webhook/SSE doesn't fire (e.g., demo mode)
  const startStatusPolling = useCallback((): void => {
    let attempts = 0;
    const maxAttempts = 20; // 20 attempts * 3s = 60 seconds total
    
    console.info('🔄 Starting status polling (every 3s, max 20 attempts)');
    
    pollingIntervalRef.current = setInterval(async () => {
      // Don't poll if we're already navigating
      if (isNavigatingRef.current) {
        console.info('🛑 Already navigating, stopping polling');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }
      
      // Guard: Don't poll if paymentId is missing or invalid
      if (!paymentIdRef.current || paymentIdRef.current === 'null' || paymentIdRef.current === 'undefined') {
        console.error('❌ paymentIdRef is null or invalid, stopping polling:', paymentIdRef.current);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }
      
      attempts++;
      console.info(`🔄 Polling payment status (attempt ${attempts}/${maxAttempts}) for: ${paymentIdRef.current}`);
      
      try {
        const response = await apiClient.get<ApiResponse<{ 
          paymentId: string; 
          status: string;
          thepayState?: string;
        }>>(
          API_ENDPOINTS.PAYMENT_THEPAY_STATUS.replace(':paymentId', paymentIdRef.current)
        );
        
        console.info('📊 Polling response:', response);
        console.info('📊 Response.data:', response.data);
        console.info('📊 Response.data?.status:', response.data?.status);
        console.info('📊 Response.success:', response.success);
        
        // Handle both response formats defensively
        const status = response.data?.status ?? (response as { status?: string }).status;
        const isCompleted = response.success && status === 'completed';
        const isCancelled = response.success && status === 'cancelled';
        const isFailed = response.success && (status === 'failed' || status === 'refunded');
        
        console.info('📊 Parsed status:', status, 'isCompleted:', isCompleted, 'isCancelled:', isCancelled, 'isFailed:', isFailed);
        
        if (isCompleted) {
          // Guard: Ensure paymentId is valid before navigating
          if (!paymentIdRef.current || paymentIdRef.current === 'null' || paymentIdRef.current === 'undefined') {
            console.error('❌ Payment completed via polling but paymentId is invalid:', paymentIdRef.current);
            return;
          }
          
          console.info('✅ Payment completed via POLLING, navigating to success page');
          
          // Clear the polling interval
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Mark as navigating and navigate
          isNavigatingRef.current = true;
          void navigate(`/payment/thepay-success?paymentId=${paymentIdRef.current}&kioskId=${kioskId}`);
        } else if (isCancelled || isFailed) {
          // Guard: Ensure paymentId is valid before navigating
          if (!paymentIdRef.current || paymentIdRef.current === 'null' || paymentIdRef.current === 'undefined') {
            console.error('❌ Payment cancelled/failed via polling but paymentId is invalid:', paymentIdRef.current);
            return;
          }
          
          console.info(`🚫 Payment ${isCancelled ? 'cancelled' : 'failed'} via POLLING, navigating to ${isCancelled ? 'cancellation' : 'failure'} page`);
          
          // Clear the polling interval
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Navigate to success page with cancelled/failed status (shows appropriate message on kiosk)
          isNavigatingRef.current = true;
          const statusParam = isCancelled ? 'cancelled' : 'failed';
          void navigate(`/payment/thepay-success?paymentId=${paymentIdRef.current}&kioskId=${kioskId}&status=${statusParam}`);
        } else if (status === 'pending' || status === 'processing') {
          // Payment still pending - but if we've been polling for a while, 
          // it might be abandoned (user clicked "návrat na web")
          // The backend should return 'cancelled' if transaction is CANCELLED in DB
          console.info(`⏳ Payment still pending (attempt ${attempts}/${maxAttempts}), status: ${status}`);
          
          // Note: If ThePaySuccessPage detected abandonment and marked transaction as CANCELLED,
          // the next poll should return 'cancelled' status from the backend
        } else {
          console.warn(`⚠️ Unexpected payment status via polling: ${status}`);
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
        // Continue polling on error - might be transient
      }
      
      // Stop polling after max attempts
      if (attempts >= maxAttempts) {
        console.info('⏱️ Polling timeout reached (60 seconds)');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 3000); // Poll every 3 seconds
  }, [apiClient, navigate, kioskId, isNavigatingRef]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.info('🛑 Stopping polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // QR mode: Start polling when enabled
  useEffect(() => {
    console.info('🔍 Polling useEffect: enabled=', enabled, 'mode=', THEPAY_MODE);
    
    if (THEPAY_MODE === 'qr' && enabled) {
      console.info('📱 Starting hybrid polling + SSE');
      startStatusPolling();
    } else {
      console.info('⏸️ Polling NOT starting:', { 
        isQRMode: THEPAY_MODE === 'qr', 
        enabled 
      });
    }
    
    // Cleanup: Stop polling on unmount or when disabled
    return (): void => {
      stopPolling();
    };
  }, [enabled, startStatusPolling, stopPolling]);

  // Cleanup: Reset refs on unmount
  useEffect(() => {
    return (): void => {
      stopPolling();
    };
  }, [stopPolling]);

  return { stopPolling };
}
