import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createAPIClient, API_ENDPOINTS, ApiResponse } from 'pi-kiosk-shared';

export function ThePaySuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  
  const paymentId = searchParams.get('paymentId');
  const kioskId = searchParams.get('kioskId');

  useEffect(() => {
    const checkPayment = async () => {
      if (!paymentId || !kioskId) {
        setStatus('failed');
        return;
      }

      try {
        const apiClient = createAPIClient();
        const statusEndpoint = API_ENDPOINTS.PAYMENT_THEPAY_STATUS.replace(':paymentId', paymentId);
        const response = await apiClient.get<ApiResponse<{ status: string; paymentId: string; amount: number }>>(statusEndpoint);

        if (response.success && response.data?.status === 'completed') {
          setStatus('success');
          // Redirect back to kiosk after 3 seconds
          setTimeout(() => {
            navigate(`/?kioskId=${kioskId}`);
          }, 3000);
        } else {
          setStatus('failed');
          setTimeout(() => {
            navigate(`/?kioskId=${kioskId}`);
          }, 3000);
        }
      } catch (error) {
        console.error('Error checking payment:', error);
        setStatus('failed');
        setTimeout(() => {
          navigate(`/?kioskId=${kioskId}`);
        }, 3000);
      }
    };

    checkPayment();
  }, [paymentId, kioskId, navigate]);

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
          <div>⏳</div>
          <div>Ověřuji platbu...</div>
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

