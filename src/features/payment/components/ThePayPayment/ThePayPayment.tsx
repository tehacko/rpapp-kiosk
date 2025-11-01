import { useState, useEffect } from 'react';
import { 
  UI_MESSAGES,
  CSS_CLASSES,
  formatPrice,
  createAPIClient,
  API_ENDPOINTS,
  ThePayCreateRequest,
  ThePayCreateResponse,
  ThePayMethodsResponse,
  ApiResponse
} from 'pi-kiosk-shared';

interface ThePayPaymentProps {
  cart: {
    items: Array<{
      product: {
        id: number;
        name: string;
        price: number;
      };
      quantity: number;
    }>;
    totalAmount: number;
  };
  email: string;
  kioskId: number;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
  onCancel: () => void;
}

export function ThePayPayment({ 
  cart, 
  email, 
  kioskId, 
  onPaymentSuccess, 
  onPaymentError, 
  onCancel 
}: ThePayPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [paymentMethods, setPaymentMethods] = useState<Array<{name: string, enabled: boolean}>>([]);
  const apiClient = createAPIClient();

  useEffect(() => {
    initializePayment();
  }, []);

  // Poll payment status if payment URL is opened
  useEffect(() => {
    if (!paymentData?.paymentId || paymentStatus === 'completed' || paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      return;
    }

    const statusInterval = setInterval(async () => {
      try {
        const statusEndpoint = API_ENDPOINTS.PAYMENT_THEPAY_STATUS.replace(':paymentId', paymentData.paymentId);
        const statusResponse = await apiClient.get<ApiResponse<{ status: string; paymentId: string; amount: number }>>(statusEndpoint);
        
        if (statusResponse.success && statusResponse.data) {
          const newStatus = statusResponse.data.status;
          setPaymentStatus(newStatus);

          if (newStatus === 'completed') {
            clearInterval(statusInterval);
            // Auto-trigger success after a short delay
            setTimeout(() => {
              if (paymentData) {
                onPaymentSuccess({
                  paymentId: paymentData.paymentId,
                  amount: paymentData.amount,
                  customerEmail: email,
                  paymentUrl: paymentData.paymentUrl
                });
              }
            }, 1000);
          } else if (newStatus === 'failed' || newStatus === 'cancelled') {
            clearInterval(statusInterval);
            setError(`Payment ${newStatus}`);
            onPaymentError(`Payment ${newStatus}`);
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        // Don't clear interval on error, continue polling
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(statusInterval);
  }, [paymentData, paymentStatus, email, onPaymentSuccess, onPaymentError, apiClient]);

  const initializePayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get available payment methods
      const methodsResponse = await apiClient.get<ApiResponse<ThePayMethodsResponse>>(API_ENDPOINTS.PAYMENT_THEPAY_METHODS);
      if (!methodsResponse.success) {
        throw new Error('ThePay not configured');
      }

      setPaymentMethods(methodsResponse.data!.methods);

      // Create ThePay payment
      const paymentRequest: ThePayCreateRequest = {
        items: cart.items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        })),
        totalAmount: cart.totalAmount,
        customerEmail: email,
        kioskId: kioskId
      };

      const paymentResponse = await apiClient.post<ApiResponse<ThePayCreateResponse>>(API_ENDPOINTS.PAYMENT_THEPAY_CREATE, paymentRequest);

      if (!paymentResponse.success) {
        throw new Error(paymentResponse.error || 'Failed to create payment');
      }

      setPaymentData(paymentResponse.data!);
    } catch (error) {
      console.error('ThePay payment initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment initialization failed';
      setError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentMethodClick = async (method: any) => {
    try {
      setPaymentStatus('processing');

      console.log(`💳 Opening ThePay payment page with ${method.name}...`);
      
      // Open ThePay payment URL
      if (paymentData?.paymentUrl) {
        console.log(`💳 Payment URL: ${paymentData.paymentUrl}`);
        
        // Open payment page in new window
        const paymentWindow = window.open(
          paymentData.paymentUrl, 
          'thepay_payment',
          'width=800,height=600,scrollbars=yes,resizable=yes'
        );
        
        if (!paymentWindow) {
          throw new Error('Could not open payment window. Please allow popups.');
        }
        
        // Status polling is already handled by useEffect (lines 54-95)
        // When ThePay completes payment:
        // 1. ThePay sends webhook to backend
        // 2. Backend updates transaction to COMPLETED
        // 3. Frontend polling detects status change
        // 4. Frontend calls onPaymentSuccess
        
        console.log('💳 Payment window opened, waiting for completion...');
      } else {
        throw new Error('Payment URL not available');
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      setPaymentStatus('failed');
      onPaymentError(error instanceof Error ? error.message : 'Payment failed');
    }
  };

  const handlePaymentCancel = async () => {
    if (paymentData?.paymentId) {
      try {
        await apiClient.post(API_ENDPOINTS.PAYMENT_THEPAY_CANCEL, {
          paymentId: paymentData.paymentId
        });
      } catch (error) {
        console.error('Error cancelling payment:', error);
      }
    }
    onCancel();
  };

  if (isLoading) {
    return (
      <div className={CSS_CLASSES.PAYMENT_CONTAINER}>
        <div className={CSS_CLASSES.LOADING_CONTAINER}>
          <div className={CSS_CLASSES.LOADING_SPINNER}></div>
          <p>{UI_MESSAGES.PAYMENT_INITIALIZING}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={CSS_CLASSES.PAYMENT_CONTAINER}>
        <div className={CSS_CLASSES.ERROR_CONTAINER}>
          <h3>{UI_MESSAGES.PAYMENT_ERROR}</h3>
          <p>{error}</p>
          <div className={CSS_CLASSES.BUTTON_GROUP}>
            <button 
              onClick={initializePayment}
              className={CSS_CLASSES.BUTTON_PRIMARY}
            >
              {UI_MESSAGES.RETRY}
            </button>
            <button 
              onClick={onCancel}
              className={CSS_CLASSES.BUTTON_SECONDARY}
            >
              {UI_MESSAGES.CANCEL}
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      padding: '8px',
      overflow: 'auto',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.9)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '8px',
        textAlign: 'center',
        flexShrink: 0
      }}>
        <h2 style={{ 
          fontSize: '1.4rem', 
          fontWeight: 'bold', 
          color: 'white',
          margin: 0
        }}>
          💳 ThePay Platba
        </h2>
        <p style={{ 
          fontSize: '1.3rem', 
          fontWeight: 'bold', 
          color: 'white',
          margin: '8px 0 0 0'
        }}>
          Celkem: {formatPrice(cart.totalAmount)}
        </p>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        marginBottom: '8px'
      }}>
        {/* Payment interface */}
        {paymentData && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '8px',
            color: '#1f2937'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>
                {paymentStatus === 'completed' ? '✅' : 
                 paymentStatus === 'processing' ? '⚙️' : 
                 paymentStatus === 'failed' ? '❌' : '💳'}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                {paymentStatus === 'completed' ? 'Platba úspěšná!' :
                 paymentStatus === 'processing' ? 'Zpracovávám platbu...' :
                 paymentStatus === 'failed' ? 'Platba selhala' :
                 'Vyberte způsob platby'}
              </h3>
              {paymentStatus === 'completed' && (
                <p style={{ fontSize: '1rem', color: '#22c55e', fontWeight: '600' }}>
                  {formatPrice(cart.totalAmount)} bylo zaplaceno
                </p>
              )}
              {paymentStatus === 'processing' && (
                <p style={{ fontSize: '0.95rem', color: '#f59e0b', fontWeight: '600' }}>
                  Prosím čekejte...
                </p>
              )}
            </div>

            {paymentStatus !== 'completed' && paymentStatus !== 'failed' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {paymentMethods.map((method: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => handlePaymentMethodClick(method)}
                      disabled={paymentStatus === 'processing'}
                      style={{
                        padding: '16px 8px',
                        background: paymentStatus === 'processing' ? 'rgba(156, 163, 175, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        border: `2px solid ${paymentStatus === 'processing' ? 'rgba(156, 163, 175, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: paymentStatus === 'processing' ? '#9ca3af' : '#4f46e5',
                        fontWeight: '600',
                        cursor: paymentStatus === 'processing' ? 'not-allowed' : 'pointer',
                        touchAction: 'manipulation',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: paymentStatus === 'processing' ? 0.5 : 1
                      }}
                    >
                      <span style={{ fontSize: '2rem' }}>{method.icon}</span>
                      <span>{method.name}</span>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'center' }}>
                  {paymentStatus === 'processing' ? 'Zpracovávám platbu...' : 'Klikněte na způsob platby'}
                </p>
              </>
            )}

            <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '6px' }}>
              <p style={{ fontSize: '0.8rem', color: '#78350f', textAlign: 'center', margin: 0 }}>
                {paymentStatus === 'completed' ? 
                  '✓ DEMO: Platba dokončena - transakce bude vytvořena' :
                  paymentStatus === 'processing' ?
                  '⏱️ DEMO: Simuluji platbu...' :
                  '💡 DEMO: Klikněte pro dokončení platby'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom buttons */}
      <div style={{ flexShrink: 0 }}>
        {paymentStatus !== 'completed' && (
          <button 
            onClick={handlePaymentCancel}
            style={{ 
              width: '100%',
              padding: '12px',
              fontSize: '1rem',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: paymentStatus === 'processing' ? 'not-allowed' : 'pointer',
              background: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              touchAction: 'manipulation',
              opacity: paymentStatus === 'processing' ? 0.5 : 1
            }}
            disabled={paymentStatus === 'processing'}
          >
            {paymentStatus === 'processing' ? '⏳ Zpracovávám...' : `✕ ${UI_MESSAGES.CANCEL}`}
          </button>
        )}
      </div>
    </div>
  );
}

export default ThePayPayment;
