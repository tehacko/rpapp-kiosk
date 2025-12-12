import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServerSentEvents } from '../../../../realtime';
import type { SSEMessage } from '../../../../realtime/hooks/useServerSentEvents';
import { THEPAY_MODE } from './useThePayPayment';

export interface UseThePaySSEDeps {
  kioskId: number;
  paymentId: string | null;
  isNavigatingRef: React.MutableRefObject<boolean>;
  onStopPolling: () => void;
}

export function useThePaySSE({ 
  kioskId, 
  paymentId, 
  isNavigatingRef,
  onStopPolling 
}: UseThePaySSEDeps): { sseConnected: boolean } {
  const navigate = useNavigate();
  const paymentIdRef = useRef<string | null>(paymentId);

  // Update ref when paymentId changes
  if (paymentIdRef.current !== paymentId) {
    paymentIdRef.current = paymentId;
  }

  // QR mode: Handle SSE payment completion (PRIMARY method - instant)
  const handleSSEMessage = useCallback((message: SSEMessage): void => {
    console.info('📨 ThePayPayment SSE message received:', message);
    console.info('📨 Current paymentIdRef:', paymentIdRef.current);
    console.info('📨 Message paymentId:', message.data?.paymentId);
    console.info('📨 Message type:', message.type, 'updateType:', message.updateType);
    console.info('📨 IsNavigating:', isNavigatingRef.current);
    
    // Prevent double navigation
    if (isNavigatingRef.current) {
      console.warn('⚠️ Already navigating, ignoring SSE message');
      return;
    }
    
    // Check if this is our payment completion or cancellation
    const isPaymentCompleted = message.type === 'product_update' && 
      message.updateType === 'payment_completed';
    const isPaymentCancelled = message.type === 'product_update' && 
      message.updateType === 'payment_cancelled';
    const matchesPaymentId = message.data?.paymentId === paymentIdRef.current;
    
    console.info('📨 Payment match check:', { 
      isPaymentCompleted, 
      isPaymentCancelled,
      matchesPaymentId, 
      paymentIdMatch: message.data?.paymentId === paymentIdRef.current 
    });
    
    if (isPaymentCompleted && matchesPaymentId) {
      // Prefer paymentIdRef.current (source of truth) but fallback to message.data.paymentId
      // Validate paymentId exists and is not a string representation of null/undefined
      const paymentIdToUse = paymentIdRef.current ?? message.data?.paymentId;
      
      if (!paymentIdToUse || paymentIdToUse === 'null' || paymentIdToUse === 'undefined') {
        console.error('❌ Payment completed but paymentId is missing or invalid:', { 
          paymentIdRef: paymentIdRef.current, 
          messagePaymentId: message.data?.paymentId,
          paymentIdToUse 
        });
        return;
      }
      
      console.info('✅ Payment completed via SSE, navigating to success page');
      
      // Stop polling if it's running
      onStopPolling();
      
      // Mark as navigating and navigate
      isNavigatingRef.current = true;
      void navigate(`/payment/thepay-success?paymentId=${paymentIdToUse}&kioskId=${kioskId}`);
    } else if (isPaymentCancelled && matchesPaymentId) {
      // Prefer paymentIdRef.current (source of truth) but fallback to message.data.paymentId
      // Validate paymentId exists and is not a string representation of null/undefined
      const paymentIdToUse = paymentIdRef.current ?? message.data?.paymentId;
      
      if (!paymentIdToUse || paymentIdToUse === 'null' || paymentIdToUse === 'undefined') {
        console.error('❌ Payment cancelled but paymentId is missing or invalid:', { 
          paymentIdRef: paymentIdRef.current, 
          messagePaymentId: message.data?.paymentId,
          paymentIdToUse 
        });
        return;
      }
      
      console.info('🚫 Payment cancelled via SSE, navigating to cancellation page');
      console.info('🚫 Cancellation details:', { 
        paymentId: paymentIdToUse, 
        transactionId: message.data?.transactionId,
        kioskId: message.data?.kioskId 
      });
      
      // Stop polling if it's running
      onStopPolling();
      
      // Navigate to success page with cancelled status (same as completion, but shows cancellation message)
      isNavigatingRef.current = true;
      void navigate(`/payment/thepay-success?paymentId=${paymentIdToUse}&kioskId=${kioskId}&status=cancelled`);
    } else if (isPaymentCancelled && !matchesPaymentId) {
      console.info('⏭️ SSE cancellation message for different payment:', {
        messagePaymentId: message.data?.paymentId,
        currentPaymentId: paymentIdRef.current
      });
    } else {
      console.info('⏭️ SSE message not matching our payment:', { 
        isPaymentCompleted, 
        isPaymentCancelled,
        matchesPaymentId,
        messagePaymentId: message.data?.paymentId,
        currentPaymentId: paymentIdRef.current 
      });
    }
  }, [navigate, kioskId, isNavigatingRef, onStopPolling]);

  // QR mode: Connect to SSE only in QR mode
  const { isConnected: sseConnected } = useServerSentEvents({
    kioskId,
    enabled: THEPAY_MODE === 'qr',
    onMessage: handleSSEMessage
  });

  return { sseConnected };
}
