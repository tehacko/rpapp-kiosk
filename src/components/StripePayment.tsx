import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  UI_MESSAGES,
  CSS_CLASSES,
  formatPrice,
  createAPIClient
} from 'pi-kiosk-shared';

interface StripePaymentProps {
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

interface StripeElements {
  stripe: any;
  elements: any;
}

export function StripePayment({ 
  cart, 
  email, 
  kioskId, 
  onPaymentSuccess, 
  onPaymentError, 
  onCancel 
}: StripePaymentProps) {
  const [stripeElements, setStripeElements] = useState<StripeElements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const apiClient = createAPIClient();

  useEffect(() => {
    initializeStripe();
  }, []);

  const initializeStripe = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get Stripe public key
      const keyResponse = await apiClient.get('/api/payments/stripe-key');
      if (!keyResponse.success) {
        throw new Error('Stripe not configured');
      }

      const { publishableKey } = keyResponse.data;

      // Load Stripe
      const stripe = await loadStripe(publishableKey);
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      // Create payment intent
      const paymentResponse = await apiClient.post('/api/payments/create-stripe', {
        items: cart.items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        totalAmount: cart.totalAmount,
        customerEmail: email,
        kioskId: kioskId
      });

      if (!paymentResponse.success) {
        throw new Error(paymentResponse.error || 'Failed to create payment intent');
      }

      const { clientSecret, paymentId, stripePaymentIntentId } = paymentResponse.data;

      setPaymentIntent({
        clientSecret,
        paymentId,
        stripePaymentIntentId
      });

      setStripeElements({ stripe, elements: null });
      setIsLoading(false);
    } catch (err) {
      console.error('❌ Error initializing Stripe:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!stripeElements?.stripe || !paymentIntent) {
      setError('Payment system not ready');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent: confirmedPaymentIntent } = await stripeElements.stripe.confirmPayment({
        clientSecret: paymentIntent.clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed');
      }

      if (confirmedPaymentIntent.status !== 'succeeded') {
        throw new Error(`Payment status: ${confirmedPaymentIntent.status}`);
      }

      // Confirm payment with our backend
      const confirmResponse = await apiClient.post('/api/payments/confirm-stripe', {
        paymentId: paymentIntent.paymentId,
        stripePaymentIntentId: paymentIntent.stripePaymentIntentId
      });

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.error || 'Failed to confirm payment');
      }

      // Payment successful
      onPaymentSuccess({
        paymentId: paymentIntent.paymentId,
        amount: cart.totalAmount,
        customerEmail: email,
        paymentMethod: 'stripe',
        completedAt: new Date().toISOString()
      });

    } catch (err) {
      console.error('❌ Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="stripe-payment-container">
        <div className="payment-loading">
          <div className="spinner" aria-hidden="true"></div>
          <div>Inicializuji platbu...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stripe-payment-container">
        <div className="payment-error">
          <div className="error-icon">❌</div>
          <h3>Chyba platby</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button
              onClick={initializeStripe}
              className={`retry-btn ${CSS_CLASSES.BUTTON_PRIMARY}`}
              type="button"
            >
              Zkusit znovu
            </button>
            <button
              onClick={onCancel}
              className={`cancel-btn ${CSS_CLASSES.BUTTON_SECONDARY}`}
              type="button"
            >
              Zrušit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stripe-payment-container">
      <div className="stripe-payment-content">
        <h3 className="payment-title">💳 Stripe platba</h3>
        
        <div className="payment-summary">
          <div className="summary-row">
            <span className="summary-label">Email:</span>
            <span className="summary-value">{email}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Částka:</span>
            <span className="summary-value">{formatPrice(cart.totalAmount)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Položky:</span>
            <span className="summary-value">{cart.items.length} produktů</span>
          </div>
        </div>

        <div className="payment-actions">
          <button
            onClick={handlePayment}
            className={`pay-btn ${CSS_CLASSES.BUTTON_PRIMARY}`}
            disabled={isProcessing}
            type="button"
          >
            {isProcessing ? (
              <>
                <div className="spinner" aria-hidden="true"></div>
                Zpracovávám platbu...
              </>
            ) : (
              'Zaplatit Stripe'
            )}
          </button>
          
          <button
            onClick={onCancel}
            className={`cancel-btn ${CSS_CLASSES.BUTTON_SECONDARY}`}
            disabled={isProcessing}
            type="button"
          >
            Zrušit
          </button>
        </div>

        <div className="payment-info">
          <p>Po kliknutí na "Zaplatit Stripe" budete přesměrováni na bezpečnou platební stránku Stripe.</p>
          <p>Po úspěšné platbě obdržíte potvrzení na email: <strong>{email}</strong></p>
        </div>
      </div>
    </div>
  );
}
