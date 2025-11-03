import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createAPIClient, API_ENDPOINTS, ApiResponse } from 'pi-kiosk-shared';

export function ThePaySuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  
  const paymentId = searchParams.get('paymentId');
  const kioskId = searchParams.get('kioskId');

  console.log('🎯 ThePaySuccessPage loaded:', { paymentId, kioskId, status });

  useEffect(() => {
    if (!paymentId || !kioskId) {
      setStatus('failed');
      return;
    }

    const apiClient = createAPIClient();
    const statusEndpoint = API_ENDPOINTS.PAYMENT_THEPAY_STATUS.replace(':paymentId', paymentId);
    let pollCount = 0;
    const maxPolls = 20; // Poll for up to 60 seconds (20 * 3s)

    const checkPayment = async () => {
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
        
        // Handle payments that are still in progress - keep polling
        if (response.success && (paymentStatus === 'pending' || paymentStatus === 'processing')) {
          console.log(`⏳ Payment still processing (${paymentStatus}), will check again...`);
          return false; // Continue polling
        }
        
        // Handle terminal failure states - stop polling immediately
        if (response.success && (paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'refunded')) {
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
  }, [paymentId, kioskId]);

  // Handle redirect after status is set
  useEffect(() => {
    if (status === 'success' || status === 'failed') {
      console.log(`⏱️ Starting 4s redirect timer, status: ${status}`);
      const timer = setTimeout(() => {
        console.log('🔄 Redirecting to kiosk home');
        navigate(`/?kioskId=${kioskId}`);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [status, kioskId, navigate]);

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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      fontSize: '24px',
      padding: '20px',
      textAlign: 'center'
    }}>
      {status === 'checking' && (
        <>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏳</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>
            Ověřuji platbu...
          </div>
          <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '30px' }}>
            Čekám na potvrzení platby
          </div>
          <button
            onClick={handleManualCancel}
            style={{
              padding: '12px 24px',
              fontSize: '18px',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              touchAction: 'manipulation'
            }}
          >
            ✕ Zrušit a vrátit se
          </button>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>
            Platba úspěšná!
          </div>
          <div>Vrátím vás na kiosk...</div>
        </>
      )}
      {status === 'failed' && (
        <>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>
            Platba se nezdařila
          </div>
          <div>Vrátím vás na kiosk...</div>
        </>
      )}
    </div>
  );
}

