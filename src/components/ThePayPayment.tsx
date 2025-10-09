import { useState, useEffect } from 'react';
import { 
  UI_MESSAGES,
  CSS_CLASSES,
  formatPrice,
  createAPIClient,
  API_ENDPOINTS
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
  const [isProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const apiClient = createAPIClient();

  useEffect(() => {
    initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get available payment methods
      const methodsResponse = await apiClient.get(API_ENDPOINTS.PAYMENT_THEPAY_METHODS) as any;
      if (!methodsResponse.success) {
        throw new Error('ThePay not configured');
      }

      setPaymentMethods(methodsResponse.data.methods);

      // Create ThePay payment
      const paymentResponse = await apiClient.post(API_ENDPOINTS.PAYMENT_THEPAY_CREATE, {
        items: cart.items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        })),
        totalAmount: cart.totalAmount,
        customerEmail: email,
        kioskId: kioskId
      }) as any;

      if (!paymentResponse.success) {
        throw new Error(paymentResponse.error || 'Failed to create payment');
      }

      setPaymentData(paymentResponse.data);
    } catch (error) {
      console.error('ThePay payment initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment initialization failed';
      setError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (paymentData) {
      onPaymentSuccess({
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
        customerEmail: email,
        paymentUrl: paymentData.paymentUrl
      });
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
    <div className="thepay-payment-container">
      <div className="thepay-payment-content">
        <h2>ThePay Payment</h2>
        <p>Total: {formatPrice(cart.totalAmount)}</p>
      </div>

      <div className={CSS_CLASSES.PAYMENT_METHODS}>
        <h3>Available Payment Methods:</h3>
        {paymentMethods.map((method: any, index: number) => (
          <div key={index} className={CSS_CLASSES.PAYMENT_METHOD}>
            <span>{method.name}</span>
            {method.enabled && <span className={CSS_CLASSES.BADGE_SUCCESS}>Available</span>}
          </div>
        ))}
      </div>

      {paymentData && (
        <div className={CSS_CLASSES.PAYMENT_DETAILS}>
          <p>Payment ID: {paymentData.paymentId}</p>
          <p>Amount: {formatPrice(paymentData.amount)}</p>
          <p>Email: {email}</p>
          
          {paymentData.paymentUrl && (
            <div className={CSS_CLASSES.PAYMENT_ACTIONS}>
              <a 
                href={paymentData.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={CSS_CLASSES.BUTTON_PRIMARY}
              >
                Open Payment Page
              </a>
            </div>
          )}
        </div>
      )}

      <div className={CSS_CLASSES.BUTTON_GROUP}>
        <button 
          onClick={handlePaymentSuccess}
          className={CSS_CLASSES.BUTTON_SUCCESS}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Mark as Paid'}
        </button>
        <button 
          onClick={handlePaymentCancel}
          className={CSS_CLASSES.BUTTON_SECONDARY}
          disabled={isProcessing}
        >
          {UI_MESSAGES.CANCEL}
        </button>
      </div>
    </div>
  );
}

export default ThePayPayment;
