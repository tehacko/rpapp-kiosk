import { useState, useEffect } from 'react';
import { 
  UI_MESSAGES,
  CSS_CLASSES,
  createAPIClient,
  API_ENDPOINTS,
  ThePayCreateRequest,
  ThePayCreateResponse,
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
  onPaymentSuccess: _onPaymentSuccess, // Not used - redirect handles flow
  onPaymentError, 
  onCancel 
}: ThePayPaymentProps) {
  const [error, setError] = useState<string | null>(null);
  const apiClient = createAPIClient();

  useEffect(() => {
    initializePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializePayment = async () => {
    try {
      setError(null);

      // Create ThePay payment immediately (no method selection needed)
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

      const paymentData = paymentResponse.data!;
      
      console.log('💳 Redirecting to ThePay:', paymentData.paymentUrl);
      
      // Redirect to ThePay payment page (cannot use iframe due to X-Frame-Options)
      // ThePay will redirect back to success page after payment
      window.location.href = paymentData.paymentUrl;
    } catch (error) {
      console.error('ThePay payment initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment initialization failed';
      setError(errorMessage);
      onPaymentError(errorMessage);
    }
  };

  // Show loading/redirecting state
  return (
    <div className={CSS_CLASSES.PAYMENT_CONTAINER}>
      {error ? (
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
      ) : (
        <div className={CSS_CLASSES.LOADING_CONTAINER}>
          <div className={CSS_CLASSES.LOADING_SPINNER}></div>
          <p>Přesměrovávám na platební bránu ThePay...</p>
        </div>
      )}
    </div>
  );
}

export default ThePayPayment;
