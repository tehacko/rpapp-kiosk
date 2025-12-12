import { renderHook } from '@testing-library/react';
import { useKioskOrchestration } from '../useKioskOrchestration';

jest.mock('../../providers/KioskConfigProvider', () => ({
  useKioskConfig: () => ({ kioskId: 1, error: null, isValid: true }),
}));

jest.mock('../../hooks/useFullscreen', () => ({
  useFullscreen: () => undefined,
}));

jest.mock('../../../payment', () => ({
  usePaymentNavigation: () => ({
    currentScreen: 'products',
    paymentStep: 1,
    goToPayment: jest.fn(),
    goToProducts: jest.fn(),
    goToConfirmation: jest.fn(),
    setPaymentStep: jest.fn(),
  }),
  usePaymentState: () => ({
    email: '',
    selectedPaymentMethod: undefined,
    paymentData: null,
    setEmail: jest.fn(),
    setSelectedPaymentMethod: jest.fn(),
    setPaymentData: jest.fn(),
    resetPaymentState: jest.fn(),
  }),
  usePaymentProviderStatus: () => ({
    thepay: { available: true },
    qr: { available: true },
    isLoading: false,
  }),
  usePaymentMonitoring: () => ({
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
  }),
  useQRGeneration: () => ({
    qrCodeUrl: '',
    isGenerating: false,
    generateQR: jest.fn(),
    clearQR: jest.fn(),
  }),
  usePaymentFlow: ({
    paymentStep,
    setPaymentStep,
    email,
    setEmail: _setEmail,
    selectedPaymentMethod,
    setSelectedPaymentMethod: _setSelectedPaymentMethod,
    onValidateEmail,
  }: any) => {
    return [
      { validationError: null },
      {
        handleNext: () => {
          if (paymentStep === 2 && onValidateEmail(email)) return;
          setPaymentStep(paymentStep + 1);
        },
        handleBack: jest.fn(),
        ensurePaymentMethodSelected: jest.fn(() => !!selectedPaymentMethod),
      },
    ];
  },
}));

jest.mock('../../products', () => ({
  useProducts: () => ({
    products: [],
    isLoading: false,
    error: null,
    isConnected: true,
    setIsConnected: jest.fn(),
    trackProductClick: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('../../cart', () => ({
  useCart: () => ({
    cart: { items: [], totalItems: 0, totalAmount: 0 },
    addItem: jest.fn(),
    clearAll: jest.fn(),
    getItemQuantity: jest.fn(),
    isEmpty: true,
  }),
}));

jest.mock('../../realtime', () => ({
  useServerSentEvents: () => ({
    isConnected: true,
    connectionError: null,
  }),
}));

jest.mock('../../hooks/useKioskSSE', () => ({
  useKioskSSE: () => ({
    isConnected: true,
    connectionError: null,
  }),
}));

jest.mock('../utils/kioskMessageHandlers', () => ({
  createKioskMessageHandler: () => jest.fn(),
}));

jest.mock('../usePaymentMonitoringOrchestration', () => ({
  usePaymentMonitoringOrchestration: () => ({
    qrCodeUrl: '',
    isGeneratingQR: false,
    monitoringStartTime: null,
    generateQR: jest.fn(),
    clearQR: jest.fn(),
    stopMonitoring: jest.fn(),
    handleCancelQRPayment: jest.fn(),
  }),
}));

jest.mock('../usePreloadScreens', () => ({
  usePreloadScreens: () => undefined,
}));

describe('useKioskOrchestration', () => {
  it('returns products screen view-model by default', () => {
    const { result } = renderHook(() => useKioskOrchestration());
    expect(result.current.screen).toBe('products');
    expect(result.current.productsVM.products).toEqual([]);
    expect(result.current.errorVM.showError).toBe(false);
  });

  it('exposes fullscreen button flag when not on confirmation', () => {
    const { result } = renderHook(() => useKioskOrchestration());
    expect(result.current.showFullscreenButton).toBe(true);
  });
});
