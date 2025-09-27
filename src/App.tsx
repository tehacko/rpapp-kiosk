import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  Product, 
  PaymentData, 
  ScreenType,
  getKioskIdFromUrl,
  createAPIClient,
  useErrorHandler,
  useAsyncOperation,
  APP_CONFIG
} from 'pi-kiosk-shared';

import { ErrorBoundary } from './components/ErrorBoundary';
import { ProductGrid } from './components/ProductGrid';
import { PaymentForm } from './components/PaymentForm';
import { QRDisplay } from './components/QRDisplay';
import { ConfirmationScreen } from './components/ConfirmationScreen';
import { ConnectionStatus } from './components/ConnectionStatus';

import { useProducts } from './hooks/useProducts';
import { useWebSocket } from './hooks/useWebSocket';


function KioskApp() {
  // State management
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('products');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [paymentInterval, setPaymentInterval] = useState<NodeJS.Timeout | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  
  // Configuration
  const kioskId = getKioskIdFromUrl();
  const apiClient = createAPIClient();
  const { handleError } = useErrorHandler();
  
  // Hooks
  const { 
    products, 
    isLoading: loadingProducts, 
    error: productsError, 
    isConnected, 
    setIsConnected, 
    trackProductClick,
    refresh: refreshProducts 
  } = useProducts({ kioskId, apiClient });
  
  const { isConnected: wsConnected } = useWebSocket({
    kioskId,
    onMessage: (message) => {
      // Dispatch custom event for useProducts hook to handle
      window.dispatchEvent(new CustomEvent('websocket-message', { 
        detail: { data: JSON.stringify(message) } 
      }));
    },
    onConnect: () => {
      console.log('📡 WebSocket connected');
      setIsConnected(true);
    },
    onDisconnect: () => {
      console.log('📡 WebSocket disconnected');
      setIsConnected(false);
    },
    onError: (error) => {
      handleError(error, 'KioskApp.WebSocket');
    }
  });

  // Product selection handler
  const handleProductSelect = useCallback(async (product: Product) => {
    try {
      // Track the click
      await trackProductClick(product.id);
      setSelectedProduct(product);
      setCurrentScreen('payment');
    } catch (error) {
      handleError(error as Error, 'KioskApp.handleProductSelect');
    }
  }, [trackProductClick, handleError]);

  // QR Code generation using consistent async operation pattern
  const qrGeneration = useAsyncOperation<{
    qrUrl: string;
    paymentData: PaymentData;
    interval: NodeJS.Timeout;
  }>({
    onSuccess: ({ qrUrl, paymentData, interval }) => {
      setQrCodeUrl(qrUrl);
      setPaymentData(paymentData);
      setPaymentInterval(interval);
    },
    onError: (error) => {
      handleError(error, 'KioskApp.qrGeneration');
      setIsGeneratingQR(false);
    }
  });

  // Payment monitoring
  const startPaymentMonitoring = useCallback((paymentId: string) => {
    const interval = setInterval(async () => {
      try {
        // Check payment status via API
        const response = await apiClient.get(`/api/payments/check-status/${paymentId}`);
        
        if ((response as any).success && (response as any).data.status === 'COMPLETED') {
          // Payment completed successfully
          setCurrentScreen('confirmation');
          clearInterval(interval);
          setPaymentInterval(null);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        handleError(error as Error, 'KioskApp.startPaymentMonitoring');
      }
    }, APP_CONFIG.PAYMENT_POLLING_INTERVAL);

    return interval;
  }, [apiClient, handleError]);

  const generateQRCode = useCallback(async (product: Product, email: string) => {
    setIsGeneratingQR(true);
    await qrGeneration.execute(async () => {
      try {
        // Create payment via backend API
        const response = await apiClient.post('/api/payments/create-qr', {
          productId: product.id,
          customerEmail: email,
          kioskId: kioskId
        });

        if (!(response as any).success) {
          throw new Error((response as any).error || 'Failed to create payment');
        }

        const { paymentId, qrCodeData, amount, productName, customerEmail } = (response as any).data;
        
        // Generate QR code image from the data returned by backend
        const qrUrl = await QRCode.toDataURL(qrCodeData, { width: APP_CONFIG.QR_CODE_WIDTH });
        
        const newPaymentData: PaymentData = {
          productId: product.id,
          productName: productName,
          amount: amount,
          customerEmail: customerEmail,
          qrCode: qrCodeData,
          paymentId: paymentId
        };

        // Start monitoring for payment
        const interval = startPaymentMonitoring(paymentId);
        
        return { qrUrl, paymentData: newPaymentData, interval };
      } catch (error) {
        console.error('Error creating payment:', error);
        throw error;
      }
    }, 'KioskApp.generateQRCode');
  }, [qrGeneration, startPaymentMonitoring, apiClient, kioskId]);

  // Navigation handlers
  const returnToProducts = useCallback(() => {
    // Clear payment monitoring interval
    if (paymentInterval) {
      clearInterval(paymentInterval);
      setPaymentInterval(null);
    }
    
    setCurrentScreen('products');
    setSelectedProduct(null);
    setPaymentData(null);
    setQrCodeUrl('');
    setIsGeneratingQR(false);
  }, [paymentInterval]);

  const handlePaymentSubmit = useCallback((email: string) => {
    if (!selectedProduct) {
      handleError(new Error('No product selected'), 'KioskApp.handlePaymentSubmit');
      return;
    }
    
    generateQRCode(selectedProduct, email);
  }, [selectedProduct, generateQRCode, handleError]);

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

  // Update connection status when WebSocket status changes
  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected, setIsConnected]);

  // Cleanup payment interval on unmount
  useEffect(() => {
    return () => {
      if (paymentInterval) {
        clearInterval(paymentInterval);
      }
    };
  }, [paymentInterval]);

  return (
    <div className="kiosk-app">
      {/* Products Screen */}
      {currentScreen === 'products' && (
        <div className="products-screen">
          <div className="products-header">
            <div className="header-left">
              <h2 className="product-select-title">Vyberte si produkt</h2>
              <div className="kiosk-indicator">Kiosk #{kioskId}</div>
            </div>
            <ConnectionStatus isConnected={isConnected} />
          </div>
          
          <ProductGrid
            products={products}
            onSelectProduct={handleProductSelect}
            isLoading={loadingProducts}
            error={productsError}
            onRetry={refreshProducts}
          />
        </div>
      )}

      {/* Payment Screen */}
      {currentScreen === 'payment' && selectedProduct && (
        <div className="payment-screen">
          <PaymentForm
            product={selectedProduct}
            onSubmit={handlePaymentSubmit}
            isGeneratingQR={isGeneratingQR}
          />

          {qrCodeUrl && paymentData && (
            <QRDisplay
              qrCodeUrl={qrCodeUrl}
              paymentData={paymentData}
            />
          )}

          <button 
            onClick={returnToProducts} 
            className="back-btn"
            type="button"
          >
            ← Zpět na produkty
          </button>
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
