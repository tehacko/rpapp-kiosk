import { useCallback, useRef } from 'react';
import type { 
  PaymentData,
  MultiProductPaymentData,
  ApiResponse,
  StartMonitoringResponse,
  CartItem
} from 'pi-kiosk-shared';
import { 
  createAPIClient, 
  API_ENDPOINTS,
  TransactionStatus
} from 'pi-kiosk-shared';
import { useErrorHandler } from '../../../shared/hooks';
import { getTenantFromPath } from '../../../shared/tenant';
import { buildTenantApiBase } from '../../../shared/tenant';

interface PaymentMonitoringActions {
  startMonitoring: (
    paymentId: string, 
    sseConnected: boolean,
    onPaymentComplete: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentTimeout: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentFailed: (data: PaymentData | MultiProductPaymentData) => void
  ) => Promise<number | null>; // Returns monitoringStartTime or null if fallback is used
  stopMonitoring: () => Promise<void>;
}

export function usePaymentMonitoring(): PaymentMonitoringActions {
  // handleError is available but not currently used - errors are handled via callbacks
  const { handleError: _handleError } = useErrorHandler();
  const tenant = getTenantFromPath();
  const apiClient = createAPIClient(buildTenantApiBase(), undefined, tenant ?? undefined);
  const currentPaymentId = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPollingFallback = useCallback((
    paymentId: string,
    onPaymentComplete: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentTimeout: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentFailed: (data: PaymentData | MultiProductPaymentData) => void
  ): void => {
    console.info('🔄 Starting fallback polling for payment:', paymentId);
    let pollCount = 0;
    const maxPolls = 100; // 5 minutes at 3-second intervals
    const startTime = Date.now();
    
    const interval = setInterval(async () => {
      try {
        pollCount++;
        const elapsedTime = Date.now() - startTime;
        
        if (pollCount > maxPolls || elapsedTime > 300000) { // 5 minutes timeout
          console.warn('⏰ Polling fallback timed out');
          clearInterval(interval);
          pollingIntervalRef.current = null;
          
          // Call timeout callback
          const timeoutData: MultiProductPaymentData = {
            paymentId: paymentId,
            totalAmount: 0,
            customerEmail: '',
            qrCode: '',
            items: [],
            status: TransactionStatus.TIMEOUT
          };
          onPaymentTimeout(timeoutData);
          return;
        }
        
        const response = await apiClient.get<ApiResponse<{ status: string; transaction?: { amount: number }; customer?: { email: string }; items?: unknown[]; amount?: number; customerEmail?: string }>>(API_ENDPOINTS.PAYMENT_CHECK_STATUS.replace(':paymentId', paymentId));
        
        // Backend returns: { success: true, data: { status: TransactionStatus, transaction: {...}, ... } }
        // Extract status from data object
        const status = response.data?.status;
        const isCompleted = status === TransactionStatus.COMPLETED || status === 'COMPLETED';
        
        // Debug logging to see what status we're receiving
        if (pollCount === 1 || pollCount % 5 === 0) {
          console.info(`🔍 [Poll #${pollCount}] Status check response:`, {
            success: response.success,
            status: status,
            dataStatus: response.data?.status,
            expectedStatus: TransactionStatus.COMPLETED,
            isCompleted: isCompleted,
            fullResponse: response
          });
        }
        
        if (response.success && isCompleted && response.data) {
          // Extract data from response data object
          const transaction = response.data.transaction;
          const amount = transaction?.amount ?? response.data.amount ?? 0;
          const customerEmail = response.data.customer?.email ?? response.data.customerEmail ?? '';
          const items = (response.data.items ?? []) as CartItem[];
          
          console.info('✅ Payment completed via polling fallback', {
            paymentId,
            status: status,
            amount: amount,
            customerEmail: customerEmail
          });
          clearInterval(interval);
          pollingIntervalRef.current = null;
          
          const paymentData: MultiProductPaymentData = {
            paymentId: paymentId,
            totalAmount: amount,
            customerEmail: customerEmail,
            qrCode: '', // PaymentStatusResponse doesn't include qrCode
            items: items,
            status: TransactionStatus.COMPLETED
          };
          onPaymentComplete(paymentData);
        }
      } catch (error) {
        console.error('❌ Polling fallback error:', error);
        if (pollCount > 10) {
          console.error('❌ Too many polling errors, stopping');
          clearInterval(interval);
          pollingIntervalRef.current = null;
          const failedData: MultiProductPaymentData = {
            paymentId: paymentId,
            totalAmount: 0,
            customerEmail: '',
            qrCode: '',
            items: [],
            status: TransactionStatus.FAILED
          };
          onPaymentFailed(failedData);
        }
      }
    }, 3000); // Poll every 3 seconds

    pollingIntervalRef.current = interval;
    return undefined;
  }, [apiClient]);

  const startMonitoring = useCallback(async (
    paymentId: string,
    sseConnected: boolean,
    onPaymentComplete: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentTimeout: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentFailed: (data: PaymentData | MultiProductPaymentData) => void
  ) => {
    try {
      console.info('🔍 Starting payment monitoring for QR payment:', paymentId);
      console.info('🔍 Endpoint:', API_ENDPOINTS.PAYMENT_START_MONITORING);
      console.info('🔍 SSE connected:', sseConnected);
      
      currentPaymentId.current = paymentId;
      
      // BEST PRACTICE: Always call backend to start FIO polling, regardless of SSE connection
      // Backend FIO polling is independent of frontend connection status
      // SSE is only for real-time notifications, but backend should still check FIO for payments
      try {
        const response = await apiClient.post<ApiResponse<StartMonitoringResponse>>(API_ENDPOINTS.PAYMENT_START_MONITORING, {
          paymentId: paymentId
        });
        
        if (response.success && response.data) {
          console.info('✅ Backend payment monitoring started successfully:', {
            paymentId,
            monitoringStartTime: response.data.monitoringStartTime,
            sseConnected
          });
          
          // If SSE is connected, payment completion will be handled via SSE in the onMessage callback
          // If SSE is not connected, use polling fallback for status updates
          if (!sseConnected) {
            console.warn('⚠️ SSE not connected, using polling fallback for status updates');
            startPollingFallback(paymentId, onPaymentComplete, onPaymentTimeout, onPaymentFailed);
          }
          
          return response.data.monitoringStartTime ?? null;
        } else {
          throw new Error(response.message ?? 'Failed to start payment monitoring');
        }
      } catch (backendError) {
        console.error('❌ Error starting backend payment monitoring:', backendError);
        // Even if backend call fails, use polling fallback as last resort
        console.warn('⚠️ Falling back to frontend-only polling (backend monitoring unavailable)');
        startPollingFallback(paymentId, onPaymentComplete, onPaymentTimeout, onPaymentFailed);
        return null;
      }
    } catch (error) {
      console.error('❌ Unexpected error in payment monitoring:', error);
      // Last resort: use polling fallback
      startPollingFallback(paymentId, onPaymentComplete, onPaymentTimeout, onPaymentFailed);
      return null;
    }
  }, [apiClient, startPollingFallback]);

  const stopMonitoring = useCallback(async () => {
    // Stop frontend polling interval (using ref to always get current value)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Stop backend FIO polling if there's an active payment
    const paymentIdToStop = currentPaymentId.current;
    if (paymentIdToStop) {
      try {
        await apiClient.post(API_ENDPOINTS.PAYMENT_STOP_MONITORING, {
          paymentId: paymentIdToStop
        });
      } catch {
        // Silent fail - still clear local state
      }
    }
    
    currentPaymentId.current = null;
  }, [apiClient]);

  return {
    startMonitoring,
    stopMonitoring
  };
}
