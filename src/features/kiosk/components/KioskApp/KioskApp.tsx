import { useCallback, useState, Suspense, lazy, startTransition, useEffect, useRef } from 'react';
import { 
  Cart as CartType,
  PaymentData, 
  MultiProductPaymentData,
  createAPIClient, 
  useErrorHandler, 
  TransactionStatus,
  API_ENDPOINTS
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
  usePaymentMonitoring,
  usePaymentProviderStatus
} from '../../../payment';

import { FullscreenButton, ErrorBoundary } from '../../../../shared/components';
import styles from './KioskApp.module.css';

// Lazy load screen-level components (screen-level)
const ProductsScreen = lazy(() =>
  import('../../../products/components/ProductsScreen/ProductsScreen').then(module => ({
    default: module.ProductsScreen,
  }))
);

const PaymentScreen = lazy(() =>
  import('../../../payment/components/PaymentScreen/PaymentScreen').then(module => ({
    default: module.PaymentScreen,
  }))
);

const ConfirmationScreen = lazy(() =>
  import('../../../payment/components/ConfirmationScreen/ConfirmationScreen').then(module => ({
    default: module.ConfirmationScreen,
  }))
);

// PaymentsUnavailableScreen - not lazy loaded since it's a critical error state
import { PaymentsUnavailableScreen } from '../../../payment/components/PaymentsUnavailableScreen/PaymentsUnavailableScreen';

// Loading fallback component
function LoadingSpinner({ message = 'Načítám...' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p>{message}</p>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

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
  const [monitoringStartTime, setMonitoringStartTime] = useState<number | null>(null);
  
  // Payment provider status (for disabling unavailable payment methods)
  const { thepay: thepayStatus, qr: qrStatus, isLoading: isLoadingProviderStatus } = usePaymentProviderStatus();
  const hasHandledAllUnavailableRef = useRef(false);
  
  // Compute if ALL payment methods are unavailable (for showing warning on products screen)
  // Only show as unavailable once we've loaded status AND both providers are confirmed unavailable
  const allPaymentsUnavailable = !isLoadingProviderStatus && 
    thepayStatus !== null && qrStatus !== null &&
    !thepayStatus.available && !qrStatus.available;
  
  // QR generation and monitoring
  const { startMonitoring, stopMonitoring } = usePaymentMonitoring();
  const { qrCodeUrl, isGenerating: isGeneratingQR, generateQR, clearQR } = useQRGeneration({
    apiClient,
    kioskId: kioskId || 0,
    onPaymentDataGenerated: setPaymentData,
    onPaymentMonitoringStart: async (paymentId: string) => {
      // Stop any existing monitoring before starting new one
      await stopMonitoring();
      
      const startTime = await startMonitoring(
        paymentId,
        sseConnected,
      (data) => { setPaymentData(data); startTransition(() => goToConfirmation(data)); },
      (data) => { setPaymentData(data); startTransition(() => goToConfirmation(data)); },
      (data) => { setPaymentData(data); startTransition(() => goToConfirmation(data)); }
      );
      setMonitoringStartTime(startTime);
      return startTime;
    }
  });

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

  // SSE connection - memoize onMessage to prevent connection recreation
  const handleSSEMessage = useCallback((message: any) => {
      // Handle kiosk deletion
      if (message.type === 'kiosk_deleted') {
        const deletedKioskId = message.data?.kioskId || message.kioskId;
        if (deletedKioskId === kioskId) {
          console.error('❌ This kiosk has been deleted:', deletedKioskId);
          // Show error and stop trying to reconnect
          window.location.href = `/?kioskId=${kioskId}&error=kiosk_deleted`;
          return;
        }
      }
      
      // Handle payment cancellation (fallback if ThePayPayment component misses it)
      if (message.type === 'product_update' && message.updateType === 'payment_cancelled') {
        const paymentId = message.data?.paymentId || '';
        
        // Validate paymentId before navigating
        if (paymentId && paymentId !== 'null' && paymentId !== 'undefined' && paymentId.startsWith('thepay-')) {
          console.log('🚫 ThePay payment cancelled (KioskApp fallback), navigating to cancellation page');
          // Navigate to success page with cancelled status (shows cancellation message on kiosk)
          const kioskIdParam = kioskId || 0;
          window.location.href = `/payment/thepay-success?paymentId=${paymentId}&kioskId=${kioskIdParam}&status=cancelled`;
          return;
        } else if (paymentId && paymentId.startsWith('thepay-')) {
          console.error('❌ ThePay payment cancelled but paymentId is invalid:', paymentId);
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
        startTransition(() => {
        goToConfirmation({
          paymentId: message.data?.paymentId || 'unknown',
          amount: message.data?.amount || 0,
          totalAmount: message.data?.amount || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cart.items || [],
          status: TransactionStatus.COMPLETED
          });
        });
        clearQR();
        setPaymentStep(1);
        setSelectedPaymentMethod(undefined);
        return;
      }
      
      // Handle payment check started (for timer synchronization)
      if (message.type === 'product_update' && message.updateType === 'payment_check_started') {
        const paymentId = message.data?.paymentId || '';
        // Only handle FIO payments (not ThePay)
        if (!paymentId.startsWith('thepay-') && paymentData && 'paymentId' in paymentData && paymentData.paymentId === paymentId) {
          console.log('⏱️ Payment check started, resetting timer:', message);
          // Trigger timer reset in QRDisplay via custom event
          window.dispatchEvent(new CustomEvent('payment-check-started', {
            detail: { paymentId, checkTime: message.data?.checkTime || Date.now() }
          }));
        }
        return;
      }
      
      // Handle payment timeout
      if (message.type === 'product_update' && message.updateType === 'payment_timeout') {
        console.log('⏰ Payment monitoring timed out:', message);
        startTransition(() => {
        goToConfirmation({
          paymentId: message.data?.paymentId || 'unknown',
          amount: message.data?.amount || 0,
          totalAmount: message.data?.amount || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cart.items || [],
          status: TransactionStatus.TIMEOUT
          });
        });
        clearQR();
        setPaymentStep(1);
        setSelectedPaymentMethod(undefined);
        return;
      }
      
      // Handle payment failure
      if (message.type === 'product_update' && message.updateType === 'payment_failed') {
        console.log('❌ Payment failed:', message);
        startTransition(() => {
        goToConfirmation({
          paymentId: message.data?.paymentId || 'unknown',
          amount: message.data?.amount || 0,
          totalAmount: message.data?.amount || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cart.items || [],
          status: TransactionStatus.FAILED
          });
        });
        clearQR();
        setPaymentStep(1);
        setSelectedPaymentMethod(undefined);
        return;
      }
      
      // Dispatch custom event for useProducts hook to handle
      // Single dispatch - useProducts hook handles all product updates with optimistic updates
      // Log inventory updates for debugging
      if (message.type === 'product_update' && message.updateType === 'inventory_updated') {
        console.log('📦 KioskApp: Dispatching inventory_updated event', {
            productId: message.data?.productId,
          kioskId: message.data?.kioskId,
          active: message.data?.active,
          visible: message.data?.visible
        });
      }
      
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: { data: JSON.stringify(message) }
      }));
  }, [kioskId, email, qrCodeUrl, cart.items, paymentData, goToConfirmation, clearQR, setPaymentStep, setSelectedPaymentMethod]);

  const handleSSEConnect = useCallback(() => {
    console.log('📡 SSE connected in KioskApp');
      setIsConnected(true);
  }, []);

  const handleSSEError = useCallback((error: Error) => {
      console.warn('SSE error (non-blocking):', error);
  }, []);

  // Listen for kiosk-not-found event from SSE hook
  useEffect(() => {
    const handleKioskNotFound = (event: CustomEvent<{ kioskId: number }>) => {
      console.error('❌ Kiosk not found event received:', event.detail);
      // The SSE hook will stop retrying, but we should show an error to the user
      // This will be handled by the error screen below
    };

    window.addEventListener('kiosk-not-found', handleKioskNotFound as EventListener);
    return () => {
      window.removeEventListener('kiosk-not-found', handleKioskNotFound as EventListener);
    };
  }, []);

  // SSE connection - use memoized callbacks
  const { isConnected: sseConnected, connectionError } = useServerSentEvents({
    kioskId: kioskId || 0,
    enabled: kioskId !== null,
    onMessage: handleSSEMessage,
    onConnect: handleSSEConnect,
    onError: handleSSEError
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
      startTransition(() => {
      goToPayment();
      });
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
  const handleCancelQRPayment = useCallback(async () => {
    await stopMonitoring();
    setMonitoringStartTime(null);
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
        startTransition(() => {
        goToProducts();
        });
        setPaymentStep(1);
      } else {
        setPaymentStep(paymentStep - 1);
      }
    }
  }, [currentScreen, paymentStep, clearCart, goToProducts, setPaymentStep]);

  // ThePay payment handlers
  const handleThePayPaymentSuccess = useCallback((data: PaymentData | MultiProductPaymentData) => {
    console.log('ThePay payment successful:', data);
    startTransition(() => {
    goToConfirmation(data);
    });
  }, [goToConfirmation]);

  const handleThePayPaymentError = useCallback((error: string) => {
    console.error('ThePay payment error:', error);
    handleError(new Error(error), 'KioskApp.ThePayPayment');
  }, [handleError]);

  const handleThePayPaymentCancel = useCallback(async (paymentId?: string) => {
    console.log('🚫 ThePay payment cancelled, going back to payment method selection', { paymentId });
    
    // Cancel payment on backend if payment ID is available
    if (paymentId) {
      try {
        console.log(`📡 Cancelling ThePay payment on backend: ${paymentId}`);
        await apiClient.post(API_ENDPOINTS.PAYMENT_CANCEL, {
          paymentId: paymentId
        });
        console.log(`✅ ThePay payment cancelled successfully: ${paymentId}`);
      } catch (error) {
        console.error('❌ Error cancelling ThePay payment:', error);
        // Don't throw - we still want to navigate back even if cancel fails
      }
    }
    
    // Go back one step to payment method selection (step 3), same as QR payment
    await stopMonitoring();
    clearQR();
    setPaymentStep(3);
    setSelectedPaymentMethod(undefined);
  }, [apiClient, stopMonitoring, clearQR, setPaymentStep, setSelectedPaymentMethod]);

  // Preload likely next screens for better performance
  useEffect(() => {
    if (totalItems > 0 && currentScreen === 'products') {
      // Preload PaymentScreen when user adds items to cart
      import('../../../payment/components/PaymentScreen/PaymentScreen');
      // Also preload QRDisplay and ThePayPayment components
      import('../../../payment/components/QRDisplay/QRDisplay');
      import('../../../payment/components/ThePayPayment/ThePayPayment');
    }
  }, [totalItems, currentScreen]);

  // Preload confirmation when payment starts
  useEffect(() => {
    if (paymentStep === 5 && currentScreen === 'payment') {
      import('../../../payment/components/ConfirmationScreen/ConfirmationScreen');
    }
  }, [paymentStep, currentScreen]);

  // Preload QRDisplay when QR payment method is selected
  useEffect(() => {
    if (selectedPaymentMethod === 'qr' && currentScreen === 'payment' && paymentStep >= 3) {
      import('../../../payment/components/QRDisplay/QRDisplay');
    }
  }, [selectedPaymentMethod, currentScreen, paymentStep]);

  // Preload ThePayPayment when ThePay method is selected
  useEffect(() => {
    if (selectedPaymentMethod === 'thepay' && currentScreen === 'payment' && paymentStep >= 3) {
      import('../../../payment/components/ThePayPayment/ThePayPayment');
    }
  }, [selectedPaymentMethod, currentScreen, paymentStep]);

  // Stop any ongoing payment operations if all payments become unavailable during payment flow
  useEffect(() => {
    if (allPaymentsUnavailable && currentScreen === 'payment') {
      if (hasHandledAllUnavailableRef.current) {
        return;
      }
      hasHandledAllUnavailableRef.current = true;
      console.warn('⚠️ All payment methods unavailable during payment flow. Stopping operations and returning to products.');
      
      // Stop any ongoing payment monitoring and clear state
      void stopMonitoring();
      clearQR();
      resetPaymentState();
      clearCart();
      startTransition(() => {
        goToProducts();
      });
    } else if (!allPaymentsUnavailable) {
      // Reset guard when payments become available again
      hasHandledAllUnavailableRef.current = false;
    }
  }, [allPaymentsUnavailable, currentScreen, stopMonitoring, clearQR, resetPaymentState, clearCart, goToProducts]);

  // Show error screen if kiosk ID is invalid or kiosk was deleted
  const isKioskDeleted = connectionError?.includes('was deleted') || connectionError?.includes('does not exist');
  
  if (!isValid || kioskError || isKioskDeleted) {
    const errorMessage = isKioskDeleted 
      ? `Kiosk ${kioskId} byl smazán nebo neexistuje`
      : kioskError || connectionError || 'Neznámá chyba';
    
    return (
      <div className={`${styles.kioskApp} ${styles.kioskMode}`} data-testid="kiosk-error-screen">
        <div className={styles.errorScreen}>
          <div className={styles.errorContent}>
            <h1>❌ {isKioskDeleted ? 'Kiosk byl smazán' : 'Chyba konfigurace kiosku'}</h1>
            <p className={styles.errorMessage}>Error: {errorMessage}</p>
            {!isKioskDeleted && (
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
            )}
            {isKioskDeleted && (
              <div className={styles.errorInstructions}>
                <p>Kiosk s ID {kioskId} byl smazán z databáze. Kontaktujte administrátora.</p>
              </div>
            )}
            <button onClick={() => window.location.reload()} className={styles.retryBtn}>
              🔄 Zkusit znovu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show full-screen unavailable message when ALL payment methods are down (on any screen)
  if (allPaymentsUnavailable) {
    return (
      <div className={`${styles.kioskApp} ${styles.kioskMode}`}>
        <PaymentsUnavailableScreen />
      </div>
    );
  }

  return (
    <div className={`${styles.kioskApp} ${styles.kioskMode}`}>
      {/* Products Screen */}
      {currentScreen === 'products' && (
        <ErrorBoundary
          fallback={
            <div className={styles.errorScreen}>
              <h2>❌ Chyba při načítání produktů</h2>
              <p>Omlouváme se, došlo k chybě při načítání produktů.</p>
              <button onClick={() => window.location.reload()}>Zkusit znovu</button>
            </div>
          }
        >
          <Suspense fallback={<LoadingSpinner message="Načítám produkty..." />}>
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
          allPaymentsUnavailable={allPaymentsUnavailable}
        />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Payment Screen */}
      {currentScreen === 'payment' && !isCartEmpty && (
        <ErrorBoundary
          fallback={
            <div className={styles.errorScreen}>
              <h2>❌ Chyba při načítání platby</h2>
              <p>Omlouváme se, došlo k chybě při načítání platební obrazovky.</p>
              <button onClick={() => startTransition(() => goToProducts())}>
                Zpět na produkty
              </button>
            </div>
          }
        >
          <Suspense fallback={<LoadingSpinner message="Načítám platbu..." />}>
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
          monitoringStartTime={monitoringStartTime}
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
          qrProviderStatus={qrStatus}
          thepayProviderStatus={thepayStatus}
        />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Confirmation Screen */}
      {currentScreen === 'confirmation' && paymentData && (
        <ErrorBoundary
          fallback={
            <div className={styles.errorScreen}>
              <h2>❌ Chyba při načítání potvrzení</h2>
              <p>Omlouváme se, došlo k chybě při načítání potvrzovací obrazovky.</p>
              <button
                onClick={() => {
                  startTransition(() => goToProducts());
                  clearCart();
                  resetPaymentState();
                }}
              >
                Zpět na produkty
              </button>
            </div>
          }
        >
          <Suspense fallback={<LoadingSpinner message="Načítám potvrzení..." />}>
        <ConfirmationScreen
          paymentData={paymentData}
          onContinue={() => {
                startTransition(() => goToProducts());
            clearCart();
            resetPaymentState();
          }}
        />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Fullscreen Button - Only show on kiosk screens */}
      {currentScreen !== 'confirmation' && (
        <FullscreenButton />
      )}
    </div>
  );
}