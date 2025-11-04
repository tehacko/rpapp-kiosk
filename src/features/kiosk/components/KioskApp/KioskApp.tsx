import { useCallback } from 'react';
import { 
  Cart as CartType,
  PaymentData, 
  MultiProductPaymentData,
  createAPIClient, 
  useErrorHandler, 
  TransactionStatus
} from 'pi-kiosk-shared';

import { useKioskConfig } from '../../providers/KioskConfigProvider';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useProducts } from '../../../products';
import { useCart } from '../../../cart';
import { useServerSentEvents } from '../../../realtime';
import { 
  usePaymentNavigation, 
  usePaymentState, 
  useQRGeneration, 
  usePaymentMonitoring 
} from '../../../payment';

import { ProductsScreen } from '../../../products/components/ProductsScreen';
import { PaymentScreen } from '../../../payment/components/PaymentScreen';
import { ConfirmationScreen } from '../../../payment/components/ConfirmationScreen/ConfirmationScreen';
import { FullscreenButton } from '../../../../shared/components';
import styles from './KioskApp.module.css';

export function KioskApp() {
  // Kiosk configuration
  const { kioskId, error: kioskError, isValid } = useKioskConfig();
  useFullscreen();
  
  // API client
  const apiClient = createAPIClient();
  const { handleError } = useErrorHandler();

  // Payment navigation and state
  const { currentScreen, paymentStep, goToPayment, goToProducts, goToConfirmation, setPaymentStep } = usePaymentNavigation();
  const { email, selectedPaymentMethod, paymentData, setEmail, setSelectedPaymentMethod, setPaymentData, resetPaymentState } = usePaymentState();
  
  // QR generation and monitoring
  const { qrCodeUrl, isGenerating: isGeneratingQR, generateQR, clearQR } = useQRGeneration({
    apiClient,
    kioskId: kioskId || 0,
    onPaymentDataGenerated: setPaymentData,
    onPaymentMonitoringStart: async (paymentId: string) => {
      await startMonitoring(
        paymentId,
        sseConnected,
        (data) => { setPaymentData(data); goToConfirmation(data); },
        (data) => { setPaymentData(data); goToConfirmation(data); },
        (data) => { setPaymentData(data); goToConfirmation(data); }
      );
    }
  });
  const { startMonitoring, stopMonitoring } = usePaymentMonitoring();

  // Products and cart
  const { 
    products, 
    isLoading: loadingProducts, 
    error: productsError, 
    isConnected, 
    setIsConnected, 
    trackProductClick, 
    refresh: refreshProducts 
  } = useProducts({ 
    kioskId: kioskId || 0, 
    apiClient
  });

  const { 
    cart, 
    addItem, 
    clearAll: clearCart, 
    getItemQuantity, 
    isEmpty: isCartEmpty
  } = useCart();
  
  const totalItems = cart.totalItems;

  // SSE connection
  const { isConnected: sseConnected } = useServerSentEvents({
    kioskId: kioskId || 0,
    enabled: kioskId !== null,
    onMessage: (message: any) => {
      // Handle payment cancellation (fallback if ThePayPayment component misses it)
      if (message.type === 'product_update' && message.updateType === 'payment_cancelled') {
        const paymentId = message.data?.paymentId || '';
        
        if (paymentId.startsWith('thepay-')) {
          console.log('🚫 ThePay payment cancelled (KioskApp fallback), navigating to cancellation page');
          // Navigate to success page with cancelled status (shows cancellation message on kiosk)
          const kioskIdParam = kioskId || 0;
          window.location.href = `/payment/thepay-success?paymentId=${paymentId}&kioskId=${kioskIdParam}&status=cancelled`;
          return;
        }
      }
      
      // Handle payment completion
      if (message.type === 'product_update' && message.updateType === 'payment_completed') {
        // Check if this is a ThePay payment (has thepay- prefix)
        const paymentId = message.data?.paymentId || '';
        
        if (paymentId.startsWith('thepay-')) {
          console.log('⏭️ Skipping ThePay payment in KioskApp (handled by ThePayPayment component)');
          return; // Let ThePayPayment component handle it
        }
        
        console.log('🎉 Payment completed!', message);
        goToConfirmation({
          paymentId: message.data?.paymentId || 'unknown',
          amount: message.data?.amount || 0,
          totalAmount: message.data?.amount || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cart.items || [],
          status: TransactionStatus.COMPLETED
        });
        clearQR();
        setPaymentStep(1);
        setSelectedPaymentMethod(undefined);
        return;
      }
      
      // Handle payment timeout
      if (message.type === 'product_update' && message.updateType === 'payment_timeout') {
        console.log('⏰ Payment monitoring timed out:', message);
        goToConfirmation({
          paymentId: message.data?.paymentId || 'unknown',
          amount: message.data?.amount || 0,
          totalAmount: message.data?.amount || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cart.items || [],
          status: TransactionStatus.TIMEOUT
        });
        clearQR();
        setPaymentStep(1);
        setSelectedPaymentMethod(undefined);
        return;
      }
      
      // Handle payment failure
      if (message.type === 'product_update' && message.updateType === 'payment_failed') {
        console.log('❌ Payment failed:', message);
        goToConfirmation({
          paymentId: message.data?.paymentId || 'unknown',
          amount: message.data?.amount || 0,
          totalAmount: message.data?.amount || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cart.items || [],
          status: TransactionStatus.FAILED
        });
        clearQR();
        setPaymentStep(1);
        setSelectedPaymentMethod(undefined);
        return;
      }
      
      // Dispatch custom event for useProducts hook to handle
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: { data: JSON.stringify(message) }
      }));
    },
    onConnect: () => {
      console.log('📡 SSE connected');
      setIsConnected(true);
    },
    onError: (error) => {
      console.warn('SSE error (non-blocking):', error);
    }
  });

  // Product click tracking for analytics
  const handleProductClick = useCallback(async (product: any) => {
    try {
      await trackProductClick(product.id);
    } catch (error) {
      console.warn('Failed to track product click:', error);
    }
  }, [trackProductClick]);

  // Cart handlers
  const handleAddToCart = useCallback((product: any) => {
    console.log('App.tsx handleAddToCart called for:', product.name, 'Cart before:', cart.totalItems);
    addItem(product);
    console.log('App.tsx after addItem call');
    // Track the product click for analytics
    handleProductClick(product);
  }, [addItem, handleProductClick, cart.totalItems]);

  const handleProceedToCheckout = useCallback(() => {
    if (!isCartEmpty) {
      goToPayment();
    }
  }, [isCartEmpty, goToPayment]);

  const handleClearCart = useCallback(() => {
    clearCart();
  }, [clearCart]);

  // Payment handlers
  const handlePaymentSubmitCallback = useCallback(async (cart: CartType, email: string, paymentMethod: 'qr' | 'thepay') => {
    console.log('App: handlePaymentSubmit called', { email, paymentMethod, isCartEmpty, cart });
    if (!isCartEmpty) {
      if (paymentMethod === 'qr') {
        console.log('App: setting paymentStep to 5 and calling generateQRCodeForCart');
        setPaymentStep(5); // Move to processing step
        // Cart-based QR payment - generate QR code immediately
        await generateQR(cart, email);
      } else if (paymentMethod === 'thepay') {
        console.log('App: setting paymentStep to 5 for ThePay');
        setPaymentStep(5); // Move to processing step for ThePay
        console.log('ThePay payment initiated for email:', email);
      }
    } else {
      console.log('App: cart is empty, showing error');
      handleError(new Error('No items in cart'), 'KioskApp.handlePaymentSubmit');
      return;
    }
  }, [cart, isCartEmpty, generateQR, handleError, setPaymentStep]);

  // Cancel QR payment and go back to payment method selection
  const handleCancelQRPayment = useCallback(() => {
    stopMonitoring();
    clearQR();
    setPaymentStep(3);
    setSelectedPaymentMethod(undefined);
  }, [stopMonitoring, clearQR, setPaymentStep, setSelectedPaymentMethod]);

  // Email validation function
  const validateEmail = useCallback((emailValue: string): string | null => {
    const trimmedEmail = emailValue.trim();
    if (!trimmedEmail) {
      return 'Email je povinný';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'Neplatný formát emailu';
    }
    return null;
  }, []);

  // Next navigation with email validation
  const handleNext = useCallback(() => {
    if (currentScreen === 'payment') {
      // Validate email before proceeding from step 2 to step 3
      if (paymentStep === 2) {
        const validationError = validateEmail(email);
        if (validationError) {
          // Trigger error display in PaymentForm by dispatching a custom event
          // PaymentForm will handle showing the error inline
          window.dispatchEvent(new CustomEvent('payment-email-validation-error', {
            detail: { error: validationError }
          }));
          return; // Don't proceed if validation fails
        }
      }
      setPaymentStep(paymentStep + 1);
    }
  }, [currentScreen, paymentStep, email, validateEmail, setPaymentStep]);

  // Back navigation
  const handleBack = useCallback(() => {
    if (currentScreen === 'payment') {
      if (paymentStep === 1) {
        clearCart();
        goToProducts();
        setPaymentStep(1);
      } else {
        setPaymentStep(paymentStep - 1);
      }
    }
  }, [currentScreen, paymentStep, clearCart, goToProducts, setPaymentStep]);

  // ThePay payment handlers
  const handleThePayPaymentSuccess = useCallback((data: PaymentData | MultiProductPaymentData) => {
    console.log('ThePay payment successful:', data);
    goToConfirmation(data);
  }, [goToConfirmation]);

  const handleThePayPaymentError = useCallback((error: string) => {
    console.error('ThePay payment error:', error);
    handleError(new Error(error), 'KioskApp.ThePayPayment');
  }, [handleError]);

  const handleThePayPaymentCancel = useCallback(() => {
    console.log('🚫 ThePay payment cancelled, going back to payment method selection');
    // Go back one step to payment method selection (step 3), same as QR payment
    stopMonitoring();
    clearQR();
    setPaymentStep(3);
    setSelectedPaymentMethod(undefined);
  }, [stopMonitoring, clearQR, setPaymentStep, setSelectedPaymentMethod]);

  // Show error screen if kiosk ID is invalid
  if (!isValid || kioskError) {
    return (
      <div className={`${styles.kioskApp} ${styles.kioskMode}`} data-testid="kiosk-error-screen">
        <div className={styles.errorScreen}>
          <div className={styles.errorContent}>
            <h1>❌ Chyba konfigurace kiosku</h1>
            <p className={styles.errorMessage}>Error: {kioskError}</p>
            <div className={styles.errorInstructions}>
              <h3>Jak opravit:</h3>
              <ol>
                <li>
                  Přidejte <code>?kioskId=X</code> na konec URL
                </li>
                <li>Nahraďte X číslem vašeho kiosku (např. 1, 2, 3...)</li>
                <li>
                  Příklad: <code>https://your-domain.com?kioskId=1</code>
                </li>
              </ol>
            </div>
            <button onClick={() => window.location.reload()} className={styles.retryBtn}>
              🔄 Zkusit znovu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.kioskApp} ${styles.kioskMode}`}>
      {/* Products Screen */}
      {currentScreen === 'products' && (
        <ProductsScreen
          products={products}
          onAddToCart={handleAddToCart}
          getItemQuantity={getItemQuantity}
          isLoading={loadingProducts}
          error={productsError}
          onRetry={refreshProducts}
          isCartEmpty={isCartEmpty}
          totalItems={totalItems}
          onCheckout={handleProceedToCheckout}
          onClearCart={handleClearCart}
          isConnected={isConnected}
          qrCodeUrl={qrCodeUrl}
        />
      )}

      {/* Payment Screen */}
      {currentScreen === 'payment' && !isCartEmpty && (
        <PaymentScreen
          cart={cart}
          isCartEmpty={isCartEmpty}
          paymentStep={paymentStep}
          email={email}
          selectedPaymentMethod={selectedPaymentMethod}
          qrCodeUrl={qrCodeUrl}
          paymentData={paymentData}
          isGeneratingQR={isGeneratingQR}
          kioskId={kioskId || 0}
          onEmailChange={setEmail}
          onPaymentMethodSelect={setSelectedPaymentMethod}
          onPaymentSubmit={handlePaymentSubmitCallback}
          onCancelQRPayment={handleCancelQRPayment}
          onThePayPaymentSuccess={handleThePayPaymentSuccess}
          onThePayPaymentError={handleThePayPaymentError}
          onThePayPaymentCancel={handleThePayPaymentCancel}
          onBack={handleBack}
          onNext={handleNext}
          onStepChange={setPaymentStep}
        />
      )}

      {/* Confirmation Screen */}
      {currentScreen === 'confirmation' && paymentData && (
        <ConfirmationScreen
          paymentData={paymentData}
          onContinue={() => {
            goToProducts();
            clearCart();
            resetPaymentState();
          }}
        />
      )}

      {/* Fullscreen Button - Only show on kiosk screens */}
      {currentScreen !== 'confirmation' && (
        <FullscreenButton />
      )}
    </div>
  );
}