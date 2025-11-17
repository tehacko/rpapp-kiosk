import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createAPIClient, API_ENDPOINTS, ApiResponse } from 'pi-kiosk-shared';
import { PaymentSuccessScreen, PaymentStatus } from '../shared/components/PaymentSuccessScreen';

export function ThePaySuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'cancelled'>('checking');
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // ThePay uses 'payment_uid' in return URL, but our system uses 'paymentId'
  const paymentId = searchParams.get('paymentId') || searchParams.get('payment_uid');
  const kioskId = searchParams.get('kioskId');
  
  // Check URL params for cancellation indicators (e.g., if ThePay sends cancellation info)
  const urlStatus = searchParams.get('status');
  const cancelledParam = searchParams.get('cancelled');

  // Log only once on mount
  useEffect(() => {
    console.log('🎯 ThePaySuccessPage loaded:', { 
      paymentId, 
      kioskId, 
      allParams: Object.fromEntries(searchParams.entries())
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check URL params for cancellation on initial load
  useEffect(() => {
    if (cancelledParam === 'true' || urlStatus === 'cancelled') {
      console.log('🚫 Payment cancelled via URL parameter');
      setStatus('cancelled');
    }
  }, [cancelledParam, urlStatus]);

  // Notify backend to broadcast cancellation when detected
  useEffect(() => {
    if (status === 'cancelled' && paymentId && kioskId) {
      console.log('📡 Detected cancellation, notifying backend to broadcast to kiosk');
      const apiClient = createAPIClient();
      apiClient.post('/api/payments/thepay-notify-cancellation', {
        paymentId,
        kioskId
      }).then(() => {
        console.log('✅ Cancellation broadcast notification sent');
      }).catch(err => {
        console.error('❌ Failed to notify cancellation:', err);
      });
    }
  }, [status, paymentId, kioskId]);

  useEffect(() => {
    if (!paymentId || !kioskId) {
      setStatus('failed');
      return;
    }

    // If already cancelled from URL, skip polling
    if (status === 'cancelled') {
      return;
    }

    const apiClient = createAPIClient();
    let pollCount = 0;
    const maxPolls = 20; // Poll for up to 60 seconds (20 * 3s)

    const checkPayment = async () => {
      // Guard: Ensure paymentId is available before making API call
      // Construct endpoint inside function to use current paymentId value
      if (!paymentId) {
        console.error('❌ paymentId is null, cannot check payment status');
        setStatus('failed');
        return true; // Stop polling
      }
      
      const statusEndpoint = API_ENDPOINTS.PAYMENT_THEPAY_STATUS.replace(':paymentId', paymentId);
      
      try {
        pollCount++;
        console.log(`📡 Checking payment status (attempt ${pollCount}/${maxPolls}):`, statusEndpoint);
        const response = await apiClient.get<ApiResponse<{ status: string; paymentId: string; amount: number }>>(statusEndpoint);

        console.log('📥 Full API response:', JSON.stringify(response, null, 2));
        console.log('📊 Response details:', {
          success: response.success,
          hasData: !!response.data,
          status: response.data?.status,
          error: response.error
        });

        const paymentStatus = response.data?.status;

        // Handle completed payment
        if (response.success && paymentStatus === 'completed') {
          console.log('✅ Payment completed, setting status to success');
          setStatus('success');
          return true; // Stop polling
        }
        
        // Handle cancelled payment - separate state
        if (response.success && paymentStatus === 'cancelled') {
          console.log('🚫 Payment cancelled');
          setStatus('cancelled');
          // Note: Cancellation broadcast will be triggered by the useEffect hook above
          return true; // Stop polling
        }
        
        // NEW: Detect abandonment - if user redirected from ThePay and payment is still pending on first check,
        // they clicked "návrat na web" and abandoned the payment
        if (pollCount === 1 && response.success && paymentStatus === 'pending' && paymentId && kioskId) {
          console.log('🚫 Payment abandoned - user redirected from ThePay but payment still pending, treating as cancelled');
          // Mark as cancelled and notify backend to broadcast
          setStatus('cancelled');
          // This will trigger the cancellation broadcast useEffect
          return true; // Stop polling
        }
        
        // Handle payments that are still in progress - keep polling
        if (response.success && (paymentStatus === 'pending' || paymentStatus === 'processing')) {
          console.log(`⏳ Payment still processing (${paymentStatus}), will check again...`);
          return false; // Continue polling
        }
        
        // Handle terminal failure states - stop polling immediately
        if (response.success && (paymentStatus === 'failed' || paymentStatus === 'refunded')) {
          console.log(`❌ Payment terminal state: ${paymentStatus}`);
          setStatus('failed');
          return true; // Stop polling
        }
        
        // Handle API errors or unexpected states
        console.log('❌ Payment check failed or unexpected state. Response:', response);
        setStatus('failed');
        return true; // Stop polling
      } catch (error) {
        console.error('❌ Error checking payment:', error);
        setStatus('failed');
        return true; // Stop polling on error
      }
    };

    // Initial check
    checkPayment().then((shouldStop) => {
      if (shouldStop) return;

      // Start polling every 3 seconds
      const pollInterval = setInterval(async () => {
        const shouldStop = await checkPayment();
        
        if (shouldStop || pollCount >= maxPolls) {
          clearInterval(pollInterval);
          
          // If we hit max polls without success, mark as failed
          if (pollCount >= maxPolls) {
            console.log('⏰ Polling timeout - payment took too long');
            setStatus((currentStatus) => {
              if (currentStatus === 'checking') {
                return 'failed';
              }
              return currentStatus;
            });
          }
        }
      }, 3000);

      // Cleanup interval on unmount
      return () => clearInterval(pollInterval);
    });
  }, [paymentId, kioskId, status]);

  // Handle countdown and redirect after status is set (60 seconds)
  useEffect(() => {
    if (status === 'success' || status === 'failed' || status === 'cancelled') {
      console.log(`⏱️ Starting 60s redirect timer, status: ${status}`);
      setCountdown(60);
      
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      const redirectTimer = setTimeout(() => {
        console.log('🔄 Auto-redirecting to kiosk home');
        navigate(`/?kioskId=${kioskId}`);
      }, 60000);
      
      return () => {
        clearTimeout(redirectTimer);
        clearInterval(countdownInterval);
      };
    } else {
      setCountdown(null);
    }
  }, [status, kioskId, navigate]);

  const handleReturnToKiosk = () => {
    console.log('👤 User clicked return to kiosk button');
    navigate(`/?kioskId=${kioskId}`);
  };

  const handleManualCancel = async () => {
    console.log('👤 User manually cancelled payment check');
    
    // Call backend to mark transaction as CANCELLED
    if (paymentId) {
      try {
        const apiClient = createAPIClient();
        await apiClient.post(API_ENDPOINTS.PAYMENT_THEPAY_CANCEL, { paymentId });
        console.log('✅ Transaction marked as CANCELLED');
      } catch (error) {
        console.error('❌ Error cancelling transaction:', error);
        // Continue with navigation even if cancel fails
      }
    }
    
    navigate(`/?kioskId=${kioskId}`);
  };

  // Show checking state with cancel button
  if (status === 'checking') {
    return (
      <div className="thepay-success-page">
        <div className="thepay-success-container">
          <div className="thepay-status-icon">⏳</div>
          <div className="thepay-status-title">Ověřuji platbu...</div>
          <div className="thepay-status-message">Čekám na potvrzení platby</div>
          <button
            onClick={handleManualCancel}
            className="thepay-cancel-btn"
          >
            ✕ Zrušit a vrátit se
          </button>
        </div>
      </div>
    );
  }

  // Map status to PaymentStatus type
  const paymentStatus: PaymentStatus = status === 'success' ? 'success' 
    : status === 'failed' ? 'failed'
    : status === 'cancelled' ? 'cancelled'
    : 'failed'; // fallback

  return (
    <PaymentSuccessScreen
      status={paymentStatus}
      countdown={countdown}
      onContinue={handleReturnToKiosk}
    />
  );
}

