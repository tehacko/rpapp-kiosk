import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  Product, 
  PaymentData, 
  ScreenType,
  generatePaymentId,
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
    }
  });

  // Payment monitoring
  const startPaymentMonitoring = useCallback((paymentId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get<{
          success: boolean;
          newTransactions: Array<{
            description?: string;
            amount?: number;
            date?: string;
          }>;
        }>('/api/check-new-transactions');
        
        if (response.success && response.newTransactions.length > 0) {
          const newPayment = response.newTransactions.find((tx) => 
            tx.description && tx.description.includes(paymentId)
          );
          
          if (newPayment) {
            setCurrentScreen('confirmation');
            clearInterval(interval);
            setPaymentInterval(null);
          }
        }
      } catch (error) {
        handleError(error as Error, 'KioskApp.paymentMonitoring');
      }
    }, APP_CONFIG.PAYMENT_POLLING_INTERVAL);

    return interval;
  }, [apiClient, handleError]);

  const generateQRCode = useCallback(async (product: Product, email: string) => {
    await qrGeneration.execute(async () => {
      const paymentId = generatePaymentId();
      const qrData = {
        accountNumber: APP_CONFIG.PAYMENT_ACCOUNT_NUMBER,
        amount: product.price,
        variableSymbol: paymentId,
        message: `Platba za ${product.name} - ${email}`,
        currency: APP_CONFIG.PAYMENT_CURRENCY
      };

      const qrString = `${APP_CONFIG.QR_CODE_FORMAT}*ACC:${qrData.accountNumber}*AM:${qrData.amount}*CC:${APP_CONFIG.PAYMENT_CURRENCY}*MSG:${qrData.message}*X-VS:${qrData.variableSymbol}`;
      const qrUrl = await QRCode.toDataURL(qrString, { width: APP_CONFIG.QR_CODE_WIDTH });
      
      const newPaymentData: PaymentData = {
        productId: product.id,
        productName: product.name,
        amount: product.price,
        customerEmail: email,
        qrCode: qrString,
        paymentId: paymentId
      };

      // Start monitoring for payment
      const interval = startPaymentMonitoring(paymentId);
      
      return { qrUrl, paymentData: newPaymentData, interval };
    }, 'KioskApp.generateQRCode');
  }, [qrGeneration, startPaymentMonitoring]);

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
          <ConnectionStatus isConnected={isConnected} kioskId={kioskId} />
          
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

          <button onClick={returnToProducts} className="back-btn">
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

      {/* Fullscreen Button */}
      <button onClick={toggleFullscreen} className="fullscreen-btn-bottom">
        📺 Celá obrazovka
      </button>
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
