import { useCallback, useEffect, useRef, startTransition, useState } from 'react';
import type {
  Cart as CartType,
  PaymentData,
  MultiProductPaymentData,
  KioskProduct
} from 'pi-kiosk-shared';
import {
  createAPIClient,
  API_ENDPOINTS
} from 'pi-kiosk-shared';
import { useErrorHandler } from '../../../shared/hooks';
import { useKioskConfig } from '../providers/KioskConfigProvider';
import { useFullscreen } from '../hooks/useFullscreen';
import { useProducts } from '../../products';
import { useCart } from '../../cart';
import {
  usePaymentNavigation,
  usePaymentState,
  usePaymentProviderStatus,
  usePaymentFlow
} from '../../payment';
import { useKioskSSE } from './useKioskSSE';
import { createKioskMessageHandler } from '../utils/kioskMessageHandlers';
import { usePaymentMonitoringOrchestration } from './usePaymentMonitoringOrchestration';
import { usePreloadScreens } from './usePreloadScreens';

type Screen = 'products' | 'payment' | 'confirmation';

interface ProductsViewModel {
  products: ReturnType<typeof useProducts>['products'];
  isLoading: boolean;
  error: ReturnType<typeof useProducts>['error'];
  isConnected: boolean;
  totalItems: number;
  isCartEmpty: boolean;
  getItemQuantity: ReturnType<typeof useCart>['getItemQuantity'];
  onAddToCart: (product: KioskProduct) => void;
  onCheckout: () => void;
  onClearCart: () => void;
  onRetry: () => Promise<void>;
  allPaymentsUnavailable: boolean;
  qrCodeUrl: string;
}

interface PaymentViewModel {
  cart: ReturnType<typeof useCart>['cart'];
  isCartEmpty: boolean;
  paymentStep: number;
  email: string;
  selectedPaymentMethod: 'qr' | 'thepay' | undefined;
  qrCodeUrl: string;
  paymentData: PaymentData | MultiProductPaymentData | null;
  isGeneratingQR: boolean;
  kioskId: number;
  monitoringStartTime: number | null;
  showAlreadyMadeModal: boolean;
  receiptEmailStatus: 'sent' | 'pending' | 'failed' | 'none';
  customerEmailForModal: string;
  onEmailChange: (email: string) => void;
  onPaymentMethodSelect: (method: 'qr' | 'thepay' | undefined) => void;
  onPaymentSubmit: (cart: CartType, email: string, method: 'qr' | 'thepay') => Promise<void>;
  onCancelQRPayment: () => void;
  onThePayPaymentSuccess: (paymentData: PaymentData | MultiProductPaymentData) => void;
  onThePayPaymentError: (error: string) => void;
  onThePayPaymentCancel: () => Promise<void>;
  onBack: () => void;
  onNext: () => void | Promise<void>;
  onStepChange: (step: number) => void;
  onCloseAlreadyMadeModal: () => void;
  qrProviderStatus?: ReturnType<typeof usePaymentProviderStatus>['qr'];
  thepayProviderStatus?: ReturnType<typeof usePaymentProviderStatus>['thepay'];
}

interface ConfirmationViewModel {
  paymentData: PaymentData | MultiProductPaymentData | null;
  onContinue: () => void;
}

interface ErrorViewModel {
  showError: boolean;
  isKioskDeleted: boolean;
  errorMessage: string;
}

export interface KioskViewModel {
  screen: Screen;
  allPaymentsUnavailable: boolean;
  showFullscreenButton: boolean;
  navigateToProducts: () => void;
  productsVM: ProductsViewModel;
  paymentVM: PaymentViewModel;
  confirmationVM: ConfirmationViewModel;
  errorVM: ErrorViewModel;
}

export function useKioskOrchestration(): KioskViewModel {
  // Kiosk configuration
  const { kioskId, error: kioskError, isValid } = useKioskConfig();
  useFullscreen();

  // API client
  const apiClient = createAPIClient();
  const { handleError } = useErrorHandler();

  // Payment navigation and state
  const { currentScreen, paymentStep, goToPayment, goToProducts, goToConfirmation, setPaymentStep } = usePaymentNavigation();
  const { email, selectedPaymentMethod, paymentData, setEmail, setSelectedPaymentMethod, setPaymentData, resetPaymentState } = usePaymentState();
  // Payment provider status
  const { thepay: thepayStatus, qr: qrStatus, isLoading: isLoadingProviderStatus, refresh: _refreshProviderStatus } = usePaymentProviderStatus();
  const hasHandledAllUnavailableRef = useRef(false);

  // Payments availability flag
  const allPaymentsUnavailable = !isLoadingProviderStatus &&
    thepayStatus !== null && qrStatus !== null &&
    !thepayStatus.available && !qrStatus.available;

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
    kioskId: kioskId ?? 0,
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

  // Initialize payment monitoring with default SSE status (will be updated)
  const [sseConnectedState, setSseConnectedState] = useState(false);

  // Payment monitoring orchestration (SSE status updated via useEffect below)
  const {
    qrCodeUrl,
    isGeneratingQR,
    monitoringStartTime,
    generateQR,
    clearQR,
    stopMonitoring,
    handleCancelQRPayment,
    showAlreadyMadeModal,
    receiptEmailStatus,
    customerEmailForModal,
    closeAlreadyMadeModal,
  } = usePaymentMonitoringOrchestration({
    kioskId: kioskId ?? 0,
    sseConnected: sseConnectedState,
    onPaymentData: setPaymentData,
    onGoToConfirmation: (data) => startTransition(() => goToConfirmation(data)),
    onResetPaymentStep: () => setPaymentStep(3),
    onResetPaymentMethod: () => setSelectedPaymentMethod(undefined),
  });

  const handleSSEMessage = useCallback((message: Parameters<ReturnType<typeof createKioskMessageHandler>>[0]): void => {
    const handler = createKioskMessageHandler({
      kioskId,
      email,
      qrCodeUrl,
      cartItems: cart.items,
      paymentData,
      goToConfirmation,
      clearQR,
      setPaymentStep,
      setSelectedPaymentMethod,
    });
    handler(message);
  }, [kioskId, email, qrCodeUrl, cart.items, paymentData, goToConfirmation, clearQR, setPaymentStep, setSelectedPaymentMethod]);

  const handleSSEConnect = useCallback((): void => {
    console.info('📡 SSE connected in KioskApp');
    setIsConnected(true);
  }, [setIsConnected]);

  const handleSSEError = useCallback((error: Error): void => {
    console.warn('SSE error (non-blocking):', error);
  }, []);

  const { isConnected: sseConnected, connectionError } = useKioskSSE({
    kioskId: kioskId ?? 0,
    enabled: kioskId !== null,
    onMessage: handleSSEMessage,
    onConnect: handleSSEConnect,
    onError: handleSSEError
  });

  // Update SSE connection state for payment monitoring
  useEffect(() => {
    setSseConnectedState(sseConnected);
  }, [sseConnected]);

  // Listen for kiosk-not-found event from SSE hook
  useEffect(() => {
    const handleKioskNotFound = (event: CustomEvent<{ kioskId: number }>): void => {
      console.error('❌ Kiosk not found event received:', event.detail);
    };

    window.addEventListener('kiosk-not-found', handleKioskNotFound as EventListener);
    return (): void => {
      window.removeEventListener('kiosk-not-found', handleKioskNotFound as EventListener);
    };
  }, []);

  // Ensure screen is one of the valid Screen types for preloading
  const preloadScreen: Screen = currentScreen === 'products' || currentScreen === 'payment' || currentScreen === 'confirmation' 
    ? currentScreen 
    : 'products';

  usePreloadScreens({
    totalItems,
    currentScreen: preloadScreen,
    paymentStep,
    selectedPaymentMethod,
  });

  // Stop ongoing operations if all payments unavailable during payment flow
  useEffect(() => {
    if (allPaymentsUnavailable && currentScreen === 'payment') {
      if (hasHandledAllUnavailableRef.current) {
        return;
      }
      hasHandledAllUnavailableRef.current = true;
      console.warn('⚠️ All payment methods unavailable during payment flow. Stopping operations and returning to products.');

      void stopMonitoring();
      clearQR();
      resetPaymentState();
      clearCart();
      startTransition(() => {
        goToProducts();
      });
    } else if (!allPaymentsUnavailable) {
      hasHandledAllUnavailableRef.current = false;
    }
  }, [allPaymentsUnavailable, currentScreen, stopMonitoring, clearQR, resetPaymentState, clearCart, goToProducts]);

  // Product click tracking for analytics
  const handleProductClick = useCallback(async (product: KioskProduct): Promise<void> => {
    try {
      await trackProductClick(product.id);
    } catch (error) {
      console.warn('Failed to track product click:', error);
    }
  }, [trackProductClick]);

  // Cart handlers
  const handleAddToCart = useCallback((product: KioskProduct): void => {
    console.info('App.tsx handleAddToCart called for:', product.name, 'Cart before:', cart.totalItems);
    addItem(product);
    console.info('App.tsx after addItem call');
    void handleProductClick(product);
  }, [addItem, handleProductClick, cart.totalItems]);

  const handleProceedToCheckout = useCallback((): void => {
    if (!isCartEmpty) {
      startTransition(() => {
        goToPayment();
      });
    }
  }, [isCartEmpty, goToPayment]);

  const handleClearCart = useCallback((): void => {
    clearCart();
  }, [clearCart]);

  // Payment handlers
  const handlePaymentSubmitCallback = useCallback(async (cartArg: CartType, emailArg: string, paymentMethod: 'qr' | 'thepay'): Promise<void> => {
    console.info('App: handlePaymentSubmit called', { email: emailArg, paymentMethod, isCartEmpty, cart: cartArg });
    if (!isCartEmpty) {
      if (paymentMethod === 'qr') {
        console.info('App: setting paymentStep to 5 and calling generateQRCodeForCart');
        setPaymentStep(5);
        await generateQR(cartArg, emailArg);
      } else if (paymentMethod === 'thepay') {
        console.info('App: setting paymentStep to 5 for ThePay');
        setPaymentStep(5);
        console.info('ThePay payment initiated for email:', emailArg);
      }
    } else {
      console.warn('App: cart is empty, showing error');
      handleError(new Error('No items in cart'), 'KioskApp.handlePaymentSubmit');
      return;
    }
  }, [isCartEmpty, generateQR, handleError, setPaymentStep]);

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

  const [, paymentFlowHandlers] = usePaymentFlow({
    paymentStep,
    setPaymentStep,
    email,
    setEmail,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    onValidateEmail: validateEmail,
    onEmptyCartError: () => {
      handleError(new Error('No items in cart'), 'KioskApp.paymentFlow');
    }
  });

  const handleNext = useCallback(async (): Promise<void> => {
    console.info('🔵 handleNext called', { currentScreen, paymentStep, email });
    if (currentScreen === 'payment') {
      // FIO health check removed from here - it's now only checked right before QR generation
      // This prevents hitting FIO rate limits during navigation
      console.info('✅ Current screen is payment, calling paymentFlowHandlers.handleNext');
      paymentFlowHandlers.handleNext();
    } else {
      console.warn('⚠️ handleNext called but currentScreen is not payment:', currentScreen);
    }
  }, [currentScreen, paymentFlowHandlers, paymentStep, email]);

  const handleBack = useCallback((): void => {
    if (currentScreen === 'payment') {
      paymentFlowHandlers.handleBack(
        isCartEmpty,
        clearCart,
        () => startTransition(() => goToProducts())
      );
    }
  }, [currentScreen, paymentFlowHandlers, isCartEmpty, clearCart, goToProducts]);

  const handleThePayPaymentSuccess = useCallback((data: PaymentData | MultiProductPaymentData): void => {
    console.info('ThePay payment successful:', data);
    startTransition(() => {
      goToConfirmation(data);
    });
  }, [goToConfirmation]);

  const handleThePayPaymentError = useCallback((error: string): void => {
    console.error('ThePay payment error:', error);
    handleError(new Error(error), 'KioskApp.ThePayPayment');
  }, [handleError]);

  const handleThePayPaymentCancel = useCallback(async (paymentId?: string): Promise<void> => {
    console.info('🚫 ThePay payment cancelled, going back to payment method selection', { paymentId });

    if (paymentId) {
      try {
        console.info(`📡 Cancelling ThePay payment on backend: ${paymentId}`);
        await apiClient.post(API_ENDPOINTS.PAYMENT_CANCEL, {
          paymentId: paymentId
        });
        console.info(`✅ ThePay payment cancelled successfully: ${paymentId}`);
      } catch (error) {
        console.error('❌ Error cancelling ThePay payment:', error);
      }
    }

    await stopMonitoring();
    clearQR();
    setPaymentStep(3);
    setSelectedPaymentMethod(undefined);
  }, [apiClient, stopMonitoring, clearQR, setPaymentStep, setSelectedPaymentMethod]);

  const isKioskDeleted = connectionError?.includes('was deleted') ?? connectionError?.includes('does not exist');

  const productsVM: ProductsViewModel = {
    products,
    isLoading: loadingProducts,
    error: productsError,
    isConnected,
    totalItems,
    isCartEmpty,
    getItemQuantity,
    onAddToCart: handleAddToCart,
    onCheckout: handleProceedToCheckout,
    onClearCart: handleClearCart,
    onRetry: refreshProducts,
    allPaymentsUnavailable,
    qrCodeUrl
  };

  const paymentVM: PaymentViewModel = {
    cart,
    isCartEmpty,
    paymentStep,
    email,
    selectedPaymentMethod,
    qrCodeUrl,
    paymentData,
    isGeneratingQR,
    kioskId: kioskId ?? 0,
    monitoringStartTime,
    showAlreadyMadeModal,
    receiptEmailStatus,
    customerEmailForModal,
    onEmailChange: setEmail,
    onPaymentMethodSelect: setSelectedPaymentMethod,
    onPaymentSubmit: handlePaymentSubmitCallback,
    onCancelQRPayment: handleCancelQRPayment,
    onThePayPaymentSuccess: handleThePayPaymentSuccess,
    onThePayPaymentError: handleThePayPaymentError,
    onThePayPaymentCancel: handleThePayPaymentCancel,
    onBack: handleBack,
    onNext: handleNext,
    onStepChange: setPaymentStep,
    onCloseAlreadyMadeModal: closeAlreadyMadeModal,
    qrProviderStatus: qrStatus,
    thepayProviderStatus: thepayStatus
  };

  const confirmationVM: ConfirmationViewModel = {
    paymentData,
    onContinue: () => {
      startTransition(() => goToProducts());
      clearCart();
      resetPaymentState();
    }
  };

  const errorVM: ErrorViewModel = {
    showError: !isValid || Boolean(kioskError) || Boolean(isKioskDeleted),
    isKioskDeleted: Boolean(isKioskDeleted),
    errorMessage: isKioskDeleted
      ? `Kiosk ${kioskId} byl smazán nebo neexistuje`
      : kioskError ?? connectionError ?? 'Neznámá chyba'
  };

  // Ensure screen is one of the valid Screen types (filter out 'admin-login' if present)
  const screen: Screen = currentScreen === 'products' || currentScreen === 'payment' || currentScreen === 'confirmation' 
    ? currentScreen 
    : 'products';

  return {
    screen,
    allPaymentsUnavailable,
    showFullscreenButton: screen !== 'confirmation',
    navigateToProducts: () => startTransition(() => goToProducts()),
    productsVM,
    paymentVM,
    confirmationVM,
    errorVM
  };
}
