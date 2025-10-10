import './App.css';
import { useState, useEffect, Component, useCallback } from 'react';
import type { ReactNode } from 'react';
import QRCode from 'qrcode';
import { useServerSentEvents } from './hooks/useServerSentEvents';
import { useProducts } from './hooks/useProducts';
import { ProductGrid } from './components/ProductGrid';
import { PaymentForm } from './components/PaymentForm';
import { QRDisplay } from './components/QRDisplay';
import { ConfirmationScreen } from './components/ConfirmationScreen';
import { ConnectionStatus } from './components/ConnectionStatus';
import { ThePayPayment } from './components/ThePayPayment';
import { useCart } from './hooks/useCart';
import { 
  KioskProduct,
  PaymentData, 
  MultiProductPaymentData,
  Cart as CartType,
  ScreenType, 
  getKioskIdFromUrl, 
  validateKioskId,
  createAPIClient, 
  useErrorHandler, 
  APP_CONFIG,
  API_ENDPOINTS,
  validateSchema,
  validationSchemas,
  getEnvironmentConfig,
  getCurrentEnvironment,
  TransactionStatus
} from 'pi-kiosk-shared';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>❌ Něco se pokazilo</h2>
          <p>Omlouváme se, došlo k neočekávané chybě.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Zkusit znovu
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}


function KioskApp() {
  // State management
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('products');
  const [paymentData, setPaymentData] = useState<PaymentData | MultiProductPaymentData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [kioskId, setKioskId] = useState<number | null>(null);
  const [kioskError, setKioskError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'qr' | 'thepay' | undefined>(undefined);
  
  // Configuration
  const apiClient = createAPIClient();
  const { handleError } = useErrorHandler();
  
  // Debug: Log the API configuration
  useEffect(() => {
    const config = getEnvironmentConfig();
    console.log('🔧 Frontend API Configuration:', {
      apiUrl: config.apiUrl,
      environment: getCurrentEnvironment(),
      nodeEnv: process.env.NODE_ENV,
      location: typeof window !== 'undefined' ? window.location.href : 'server'
    });
  }, []);

  // Initialize kiosk ID with validation
  useEffect(() => {
    try {
      const id = getKioskIdFromUrl();
      if (!validateKioskId(id)) {
        throw new Error(`Invalid kiosk ID: ${id}. Kiosk ID must be a positive number.`);
      }
      setKioskId(id);
      setKioskError(null);
    } catch (error) {
      setKioskError(error instanceof Error ? error.message : 'Failed to initialize kiosk');
      setKioskId(null);
    }
  }, []);

  // Hooks - only initialize when kioskId is valid
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

  const { isConnected: sseConnected } = useServerSentEvents({
    kioskId: kioskId || 0,
    enabled: kioskId !== null, // Only enable when kioskId is valid
    onMessage: (message: any) => {
      // Handle payment completion
      if (message.type === 'product_update' && message.updateType === 'payment_completed') {
        console.log('🎉 Payment completed!', message);
        setCurrentScreen('confirmation');
        setPaymentData({
          paymentId: message.data?.paymentId || 'unknown',
          amount: message.data?.amount || 0,
          totalAmount: message.data?.amount || 0,
          customerEmail: email, // Use the email from the current form
          qrCode: qrCodeUrl, // Use the current QR code URL
          items: cart.items || [], // Use the current cart items
          status: TransactionStatus.COMPLETED // Mark as completed
        });
        // Clear QR code and reset payment step
        setQrCodeUrl('');
        setPaymentStep(1);
        setSelectedPaymentMethod(undefined);
        return;
      }
      
      // Handle payment timeout
      if (message.type === 'product_update' && message.updateType === 'payment_timeout') {
        console.log('⏰ Payment monitoring timed out:', message);
        setCurrentScreen('confirmation');
        setPaymentData({
          paymentId: message.data?.paymentId || 'unknown',
          amount: message.data?.amount || 0,
          totalAmount: message.data?.amount || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cart.items || [],
          status: TransactionStatus.TIMEOUT // Mark as timeout
        });
        // Clear QR code and reset payment step
        setQrCodeUrl('');
        setPaymentStep(1);
        setSelectedPaymentMethod(undefined);
        return;
      }
      
      // Handle payment failure
      if (message.type === 'product_update' && message.updateType === 'payment_failed') {
        console.log('❌ Payment failed:', message);
        setCurrentScreen('confirmation');
        setPaymentData({
          paymentId: message.data?.paymentId || 'unknown',
          amount: message.data?.amount || 0,
          totalAmount: message.data?.amount || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cart.items || [],
          status: TransactionStatus.FAILED // Mark as failed
        });
        // Clear QR code and reset payment step
        setQrCodeUrl('');
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
      // Don't call handleError to avoid showing error to user
    }
  });

  // Cart functionality
  const {
    cart,
    addItem: addToCart,
    clearAll: clearCart,
    getItemQuantity,
    isEmpty: isCartEmpty
  } = useCart();

  // Product click tracking for analytics
  const handleProductClick = useCallback(async (product: KioskProduct) => {
    try {
      await trackProductClick(product.id);
    } catch (error) {
      console.warn('Failed to track product click:', error);
    }
  }, [trackProductClick]);

  // Cart handlers
  const handleAddToCart = useCallback((product: KioskProduct) => {
    console.log('App.tsx handleAddToCart called for:', product.name, 'Cart before:', cart.totalItems);
    addToCart(product);
    console.log('App.tsx after addToCart call');
    // Track the product click for analytics
    handleProductClick(product);
  }, [addToCart, handleProductClick, cart.totalItems]);

  const handleProceedToCheckout = useCallback(() => {
    if (!isCartEmpty) {
      setCurrentScreen('payment');
    }
  }, [isCartEmpty]);

  const handleClearCart = useCallback(() => {
    clearCart();
  }, [clearCart]);

  // Cancel QR payment and go back to payment method selection
  const handleCancelQRPayment = useCallback(() => {
    // Clear polling interval if active
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Clear QR code and payment data
    setQrCodeUrl('');
    setPaymentData(null);
    setIsGeneratingQR(false);
    
    // Go back to payment method selection (step 3)
    setPaymentStep(3);
    setSelectedPaymentMethod(undefined);
  }, [pollingInterval]);


  // Fallback polling mechanism with timeout
  const startPollingFallback = useCallback((paymentId: string) => {
    console.log('🔄 Starting fallback polling for payment:', paymentId);
    let pollCount = 0;
    const maxPolls = 100; // 5 minutes at 3-second intervals
    const startTime = Date.now();
    
    const interval = setInterval(async () => {
      try {
        pollCount++;
        const elapsedTime = Date.now() - startTime;
        
        if (pollCount > maxPolls || elapsedTime > 300000) { // 5 minutes timeout
          console.log('⏰ Polling fallback timed out');
          clearInterval(interval);
          return;
        }
        
        const response = await apiClient.get(API_ENDPOINTS.PAYMENT_CHECK_STATUS.replace(':paymentId', paymentId));
        if ((response as any).success && (response as any).data.status === 'COMPLETED') {
          console.log('✅ Payment completed via polling fallback');
          clearInterval(interval);
          setCurrentScreen('confirmation');
          setPaymentData({
            paymentId: paymentId,
            amount: (response as any).data.amount || 0,
            totalAmount: (response as any).data.amount || 0,
            customerEmail: email,
            qrCode: qrCodeUrl,
            items: cart.items || []
          });
          setQrCodeUrl('');
          setPaymentStep(1);
          setSelectedPaymentMethod(undefined);
        }
      } catch (error) {
        console.error('❌ Polling fallback error:', error);
        if (pollCount > 10) {
          console.error('❌ Too many polling errors, stopping');
          clearInterval(interval);
        }
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);
    return interval;
  }, [apiClient, email, qrCodeUrl, cart.items]);

  // Payment monitoring - Start SSE-based monitoring with fallback
  const startPaymentMonitoring = useCallback(async (paymentId: string) => {
    try {
      console.log('🔍 Starting payment monitoring for QR payment:', paymentId);
      console.log('🔍 Endpoint:', API_ENDPOINTS.PAYMENT_START_MONITORING);
      
      // Check if SSE is connected
      if (!sseConnected) {
        console.warn('⚠️ SSE not connected, using polling fallback');
        return startPollingFallback(paymentId);
      }
      
      // Start SSE-based payment monitoring
      const response = await apiClient.post(API_ENDPOINTS.PAYMENT_START_MONITORING, {
        paymentId: paymentId
      }) as { success: boolean; message?: string; data?: any };
      
      if (response.success) {
        console.log('✅ Payment monitoring started successfully:', response);
        // The payment completion will be handled via SSE in the onMessage callback
        return null;
      } else {
        throw new Error(response.message || 'Failed to start payment monitoring');
      }
    } catch (error) {
      console.error('❌ Error starting payment monitoring, using fallback:', error);
      // Fallback to polling if SSE monitoring fails
      return startPollingFallback(paymentId);
    }
  }, [apiClient, handleError, sseConnected, startPollingFallback]);


  // Generate QR code for cart-based payment
  const generateQRCodeForCart = useCallback(async (cart: CartType, email: string) => {
    console.log('Starting QR code generation for cart:', cart, 'email:', email);
    setIsGeneratingQR(true);
    try {
      // Create multi-product payment via backend API
      console.log('Calling API endpoint:', API_ENDPOINTS.PAYMENT_CREATE_MULTI_QR);
      const response = await apiClient.post(API_ENDPOINTS.PAYMENT_CREATE_MULTI_QR, {
        items: cart.items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        totalAmount: cart.totalAmount,
        customerEmail: email,
        kioskId: kioskId
      });

      console.log('API response:', response);

      if (!(response as any).success) {
        throw new Error((response as any).error || 'Failed to create multi-product payment');
      }

      const { paymentId, qrCodeData, amount, customerEmail } = (response as any).data;
      console.log('QR code data received:', { paymentId, qrCodeData, amount, customerEmail });

      // Generate QR code image from the data returned by backend
      // Optimized for bank app scanning with high error correction
      console.log('Generating QR code image...');
      const qrUrl = await QRCode.toDataURL(qrCodeData, { 
        width: APP_CONFIG.QR_CODE_WIDTH,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H' // High error correction for better scanning
      });

      console.log('QR code image generated:', qrUrl);

      const newPaymentData: MultiProductPaymentData = {
        items: cart.items,
        totalAmount: amount,
        customerEmail: customerEmail,
        qrCode: qrCodeData,
        paymentId: paymentId
      };

      // Set the QR code URL and payment data
      console.log('Setting QR code URL and payment data...');
      setQrCodeUrl(qrUrl);
      setPaymentData(newPaymentData);

      // Start SSE-based payment monitoring
      await startPaymentMonitoring(paymentId);

      console.log('QR code generated successfully:', { qrUrl, paymentData: newPaymentData });
    } catch (error) {
      console.error('Error creating multi-product payment:', error);
      handleError(error as Error, 'KioskApp.generateQRCodeForCart');
    } finally {
      setIsGeneratingQR(false);
    }
  }, [apiClient, kioskId, startPaymentMonitoring, handleError]);

  // Navigation handlers
  const returnToProducts = useCallback(() => {
    // Clear polling interval if active
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Clear cart when returning to products
    clearCart();
    setCurrentScreen('products');
    setPaymentData(null);
    setQrCodeUrl('');
    setIsGeneratingQR(false);
    setSelectedPaymentMethod(undefined);
    setPaymentStep(1);
  }, [clearCart, pollingInterval]);

  const handlePaymentSubmit = useCallback((email: string, paymentMethod: 'qr' | 'thepay') => {
    console.log('App: handlePaymentSubmit called', { email, paymentMethod, isCartEmpty, cart });
    if (!isCartEmpty) {
      if (paymentMethod === 'qr') {
        console.log('App: setting paymentStep to 5 and calling generateQRCodeForCart');
        setPaymentStep(5); // Move to processing step
        // Cart-based QR payment - generate QR code immediately
        generateQRCodeForCart(cart, email);
      } else if (paymentMethod === 'thepay') {
        console.log('App: setting paymentStep to 5 for ThePay');
        setPaymentStep(5); // Move to processing step for ThePay
        // ThePay payment - no additional processing needed here
        // The ThePayPayment component will handle the payment flow
        console.log('ThePay payment initiated for email:', email);
      }
    } else {
      console.log('App: cart is empty, showing error');
      handleError(new Error('No items in cart'), 'KioskApp.handlePaymentSubmit');
      return;
    }
  }, [cart, isCartEmpty, generateQRCodeForCart, handleError]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    } catch (error) {
      handleError(error as Error, 'KioskApp.toggleFullscreen');
    }
  }, [handleError]);

  // Auto-enter fullscreen on load
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.warn('Could not enter fullscreen:', error);
      }
    };

    enterFullscreen();
  }, []);

  // Update connection status when SSE status changes
  // Only update if SSE is connected, don't update on disconnect to avoid false negatives
  useEffect(() => {
    if (sseConnected) {
      setIsConnected(true);
    }
  }, [sseConnected, setIsConnected]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);
  
  // Show error screen if kiosk ID is invalid
  if (kioskError || kioskId === null) {
    return (
      <ErrorBoundary>
        <div className="kiosk-app kiosk-mode">
          <div className="error-screen">
            <div className="error-content">
              <h1>❌ Chyba konfigurace kiosku</h1>
              <p className="error-message">{kioskError}</p>
              <div className="error-instructions">
                <h3>Jak opravit:</h3>
                <ol>
                  <li>Přidejte <code>?kioskId=X</code> na konec URL</li>
                  <li>Nahraďte X číslem vašeho kiosku (např. 1, 2, 3...)</li>
                  <li>Příklad: <code>https://your-domain.com?kioskId=1</code></li>
                </ol>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="retry-btn"
              >
                🔄 Zkusit znovu
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="kiosk-app kiosk-mode">
        {/* Products Screen */}
        {currentScreen === 'products' && (
          <div className="products-screen">
            <div className="products-header">
              {!isCartEmpty && !qrCodeUrl ? (
                <div className="cart-header">
                  <div className="cart-buttons-header">
              <button
                onClick={handleProceedToCheckout}
                className="checkout-btn-header"
                type="button"
              >
                💳 Zaplatit
              </button>
              <button
                onClick={handleClearCart}
                className="clear-cart-btn-header"
                type="button"
              >
                🛒 Vyprázdnit košík ({cart.totalItems})
              </button>
                  </div>
                </div>
              ) : !qrCodeUrl ? (
                <div className="header-left">
                  <h2 className="product-select-title">Vyberte si produkt</h2>
                </div>
              ) : null}
              {isCartEmpty && <ConnectionStatus isConnected={isConnected} />}
            </div>

            <ProductGrid
              products={products}
              onAddToCart={handleAddToCart}
              getItemQuantity={getItemQuantity}
              isLoading={loadingProducts}
              error={productsError}
              onRetry={refreshProducts}
            />


          </div>
        )}

        {/* Payment Screen - Full Overlay */}
        {currentScreen === 'payment' && !isCartEmpty && (
          <div className="payment-screen-overlay">
            <div className="payment-screen-content">
              {/* Payment Header with Back Button */}
            <div className="payment-header">
              <div className="cart-buttons-header">
                {paymentStep !== 3 && paymentStep !== 4 && (
                  <button
                    onClick={() => {
                      if (paymentStep === 1) {
                        setPaymentStep(2);
                      } else if (paymentStep === 2) {
                        if (email.trim()) {
                          try {
                            const validation = validateSchema({ email: email.trim() }, validationSchemas.customerEmail);
                            if (validation.isValid) {
                              setPaymentStep(3);
                            } else {
                              // Show error overlay
                              const errorOverlay = document.querySelector('.error-overlay') as HTMLElement;
                              if (errorOverlay) {
                                errorOverlay.style.display = 'flex';
                              }
                            }
                          } catch (error) {
                            // Show error overlay
                            const errorOverlay = document.querySelector('.error-overlay') as HTMLElement;
                            if (errorOverlay) {
                              errorOverlay.style.display = 'flex';
                            }
                          }
                        } else {
                          // Show error overlay
                          const errorOverlay = document.querySelector('.error-overlay') as HTMLElement;
                          if (errorOverlay) {
                            errorOverlay.style.display = 'flex';
                          }
                        }
                      }
                    }}
                    className="checkout-btn-header"
                    type="button"
                  >
                    {paymentStep === 2 ? '➡️ Další krok' : '💳 Zaplatit'}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (paymentStep === 1) {
                      // Clear cart when going back to products from payment step 1
                      clearCart();
                      setCurrentScreen('products');
                      setPaymentStep(1);
                    } else {
                      setPaymentStep(paymentStep - 1);
                    }
                  }}
                  className="clear-cart-btn-header"
                  type="button"
                >
                  ← Zpět
                </button>
              </div>
            </div>

              {!qrCodeUrl && (
                <PaymentForm
                  cart={cart}
                  onSubmit={handlePaymentSubmit}
                  isGeneratingQR={isGeneratingQR}
                  currentStep={paymentStep}
                  email={email}
                  onEmailChange={setEmail}
                  onStepChange={setPaymentStep}
                  selectedPaymentMethod={selectedPaymentMethod}
                  onPaymentMethodSelect={setSelectedPaymentMethod}
                />
              )}

              {qrCodeUrl && paymentData && (
                <QRDisplay
                  qrCodeUrl={qrCodeUrl}
                  paymentData={paymentData}
                  onCancel={handleCancelQRPayment}
                />
              )}

              {/* ThePay Payment Component */}
              {selectedPaymentMethod === 'thepay' && paymentStep === 5 && !qrCodeUrl && (
                <ThePayPayment
                  cart={cart}
                  email={email}
                  kioskId={kioskId || 0}
                  onPaymentSuccess={(paymentData) => {
                    console.log('ThePay payment successful:', paymentData);
                    // Handle successful payment - could show confirmation screen
                    setCurrentScreen('confirmation');
                    setPaymentData(paymentData);
                  }}
                  onPaymentError={(error) => {
                    console.error('ThePay payment error:', error);
                    handleError(new Error(error), 'KioskApp.ThePayPayment');
                  }}
                  onCancel={() => {
                    setPaymentStep(3); // Go back to payment method selection
                    setSelectedPaymentMethod(undefined);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Confirmation Screen */}
        {currentScreen === 'confirmation' && paymentData && (
          <ConfirmationScreen
            paymentData={paymentData}
            onContinue={returnToProducts}
          />
        )}

        {/* Fullscreen Button - Only show on kiosk screens */}
        {currentScreen !== 'confirmation' && (
          <button
            onClick={toggleFullscreen}
            className="fullscreen-btn-bottom"
            type="button"
            title="Přepnout na celou obrazovku"
          >
            📺 Celá obrazovka
          </button>
        )}
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <KioskApp />
    </ErrorBoundary>
  );
}

export default App;