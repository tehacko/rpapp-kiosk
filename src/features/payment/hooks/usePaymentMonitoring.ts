import { useState, useCallback, useRef } from 'react';
import { 
  createAPIClient, 
  useErrorHandler, 
  API_ENDPOINTS,
  PaymentData,
  MultiProductPaymentData,
  TransactionStatus,
  ApiResponse,
  PaymentStatusResponse,
  StartMonitoringResponse
} from 'pi-kiosk-shared';

interface PaymentMonitoringActions {
  startMonitoring: (
    paymentId: string, 
    sseConnected: boolean,
    onPaymentComplete: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentTimeout: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentFailed: (data: PaymentData | MultiProductPaymentData) => void
  ) => Promise<void>;
  stopMonitoring: () => void;
}

export function usePaymentMonitoring(): PaymentMonitoringActions {
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const { handleError } = useErrorHandler();
  const apiClient = createAPIClient();
  const currentPaymentId = useRef<string | null>(null);

  const startPollingFallback = useCallback((
    paymentId: string,
    onPaymentComplete: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentTimeout: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentFailed: (data: PaymentData | MultiProductPaymentData) => void
  ) => {
    console.log('🔄 Starting fallback polling for payment:', paymentId);
    let pollCount = 0;
    const maxPolls = 100; // 5 minutes at 3-second intervals
    const startTime = Date.now();
    
    const interval = setInterval(async () => {
      try {
        pollCount++;
        const elapsedTime = Date.now() - startTime;
        
        if (pollCount > maxPolls || elapsedTime > 300000) { // 5 minutes timeout
          console.log('⏰ Polling fallback timed out');
          clearInterval(interval);
          setPollingInterval(null);
          
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
        
        const response = await apiClient.get<ApiResponse<PaymentStatusResponse>>(API_ENDPOINTS.PAYMENT_CHECK_STATUS.replace(':paymentId', paymentId));
        if (response.success && response.data && response.data.status === TransactionStatus.COMPLETED) {
          console.log('✅ Payment completed via polling fallback');
          clearInterval(interval);
          setPollingInterval(null);
          
          const paymentData: MultiProductPaymentData = {
            paymentId: paymentId,
            totalAmount: response.data.amount || 0,
            customerEmail: response.data.customerEmail || '',
            qrCode: '', // PaymentStatusResponse doesn't include qrCode
            items: [], // PaymentStatusResponse doesn't include items
            status: TransactionStatus.COMPLETED
          };
          onPaymentComplete(paymentData);
        }
      } catch (error) {
        console.error('❌ Polling fallback error:', error);
        if (pollCount > 10) {
          console.error('❌ Too many polling errors, stopping');
          clearInterval(interval);
          setPollingInterval(null);
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

    setPollingInterval(interval);
    return interval;
  }, [apiClient]);

  const startMonitoring = useCallback(async (
    paymentId: string,
    sseConnected: boolean,
    onPaymentComplete: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentTimeout: (data: PaymentData | MultiProductPaymentData) => void,
    onPaymentFailed: (data: PaymentData | MultiProductPaymentData) => void
  ) => {
    try {
      console.log('🔍 Starting payment monitoring for QR payment:', paymentId);
      console.log('🔍 Endpoint:', API_ENDPOINTS.PAYMENT_START_MONITORING);
      
      currentPaymentId.current = paymentId;
      
      // Check if SSE is connected
      if (!sseConnected) {
        console.warn('⚠️ SSE not connected, using polling fallback');
        startPollingFallback(paymentId, onPaymentComplete, onPaymentTimeout, onPaymentFailed);
        return;
      }
      
      // Start SSE-based payment monitoring
      const response = await apiClient.post<ApiResponse<StartMonitoringResponse>>(API_ENDPOINTS.PAYMENT_START_MONITORING, {
        paymentId: paymentId
      });
      
      if (response.success) {
        console.log('✅ Payment monitoring started successfully:', response);
        // The payment completion will be handled via SSE in the onMessage callback
        return;
      } else {
        throw new Error(response.message || 'Failed to start payment monitoring');
      }
    } catch (error) {
      console.error('❌ Error starting payment monitoring, using fallback:', error);
      // Fallback to polling if SSE monitoring fails
      startPollingFallback(paymentId, onPaymentComplete, onPaymentTimeout, onPaymentFailed);
    }
  }, [apiClient, handleError, startPollingFallback]);

  const stopMonitoring = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    currentPaymentId.current = null;
  }, [pollingInterval]);

  return {
    startMonitoring,
    stopMonitoring
  };
}
