// Jest setup for React Testing Library
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure React Testing Library for React 18
configure({
  asyncUtilTimeout: 5000,
  // React 18's automatic batching support
  reactStrictMode: true,
});

// Mock environment variables for tests
process.env.REACT_APP_API_URL = 'http://localhost:3015';
process.env.REACT_APP_WS_URL = 'ws://localhost:3015';
process.env.NODE_ENV = 'test';

// Mock pi-kiosk-shared completely
jest.mock('pi-kiosk-shared', () => ({
  // Types
  Product: {},
  PaymentData: {},
  ScreenType: {},
  AppError: {},
  NetworkError: {},
  
  // Functions
  getKioskIdFromUrl: jest.fn(() => 1),
  validateKioskId: jest.fn(() => true),
  createAPIClient: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  })),
  useErrorHandler: jest.fn(() => ({
    handleError: jest.fn((error, context) => {
      console.error(`Error in ${context}:`, error);
    }),
    clearError: jest.fn(),
    retryAction: jest.fn()
  })),
  useAsyncOperation: jest.fn((options = {}) => {
    const onSuccess = options.onSuccess as (() => void) | undefined;
    const onError = options.onError as ((error: Error) => void) | undefined;
    
    return {
      execute: jest.fn(async (fn) => {
        try {
          const result = await fn();
          if (onSuccess) {
            onSuccess();
          }
          return result;
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
          throw error;
        }
      }),
      data: null,
      loading: false,
      error: null,
      reset: jest.fn(),
      setData: jest.fn()
    };
  }),
  useServerSentEvents: jest.fn(() => ({
    isConnected: true,
    connectionError: null,
    reconnect: jest.fn(),
    disconnect: jest.fn()
  })),
  useProducts: jest.fn(() => ({
    products: [],
    isLoading: false,
    error: null,
    isConnected: true,
    setIsConnected: jest.fn(),
    trackProductClick: jest.fn(),
    refresh: jest.fn()
  })),
  formatPrice: jest.fn((amount: number) => `${amount} Kč`),
  generatePaymentId: jest.fn(() => 'pay-123456789'),
  
  // Validation functions
  validateSchema: jest.fn((data, _schema) => {
    const errors: Record<string, string> = {};
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Zadejte platnou emailovou adresu';
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }),
  validationSchemas: {
    customerEmail: {
      email: {
        required: true,
        email: true
      }
    }
  },
  getEnvironmentConfig: jest.fn(() => ({
    apiUrl: 'http://localhost:3015',
    wsUrl: 'ws://localhost:3015',
    mode: 'development'
  })),
  
  // Constants
  APP_CONFIG: {
    apiUrl: 'http://localhost:3015',
    wsUrl: 'ws://localhost:3015',
    PAYMENT_ACCOUNT_NUMBER: '1234567890',
    PAYMENT_CURRENCY: 'CZK',
    QR_CODE_WIDTH: 300,
    QR_CODE_FORMAT: 'SPD*1.0',
    PAYMENT_POLLING_INTERVAL: 3000,
    PRODUCT_CACHE_TTL: 300000 // 5 minutes
  },
  UI_MESSAGES: {
    PAYMENT_WAITING: 'Čekám na platbu...',
    PAYMENT_SUCCESS: 'Platba byla úspěšně zpracována!',
    PAYMENT_FAILED: 'Platba selhala',
    CONNECTION_ERROR: 'Chyba připojení',
    LOADING_PRODUCTS: 'Načítání produktů...',
    NO_PRODUCTS: 'Žádné produkty nejsou k dispozici',
    SELECT_PRODUCT: 'Vyberte si produkt',
    CONTINUE_SHOPPING: 'Pokračovat v nákupu',
    YOUR_EMAIL: 'Váš email',
    EMAIL_LABEL: 'Váš email',
    FULLSCREEN_TOGGLE: 'Přepnout na celou obrazovku',
    GENERATE_QR: 'Generovat QR kód',
    GENERATING_QR: 'Generuji QR kód...',
    SCAN_QR_CODE: 'Naskenujte QR kód pro platbu',
    INVALID_EMAIL: 'Zadejte platnou emailovou adresu'
  },
  CSS_CLASSES: {
    CARD: 'card',
    LOADING: 'loading',
    ERROR: 'error',
    SUCCESS: 'success',
    BUTTON_PRIMARY: 'btn-primary',
    GRID: 'grid',
    CONFIRMATION_SCREEN: 'confirmation-screen',
    CONTINUE_BTN: 'continue-btn',
    GENERATE_QR_BTN: 'generate-qr-btn',
    EMAIL_INPUT: 'email-input',
    FORM_LABEL: 'form-label',
    REQUIRED_INDICATOR: 'required-indicator',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected'
  }
}));

// Mock window.location for URL parsing tests
Object.defineProperty(window, 'location', {
  value: {
    search: '?kioskId=1',
    href: 'http://localhost:3000/?kioskId=1'
  },
  writable: true
});

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  send: jest.fn(),
  readyState: 1, // OPEN
})) as unknown as typeof WebSocket;

// Add the missing constants
(global.WebSocket as unknown as { CONNECTING: number; OPEN: number; CLOSING: number; CLOSED: number }).CONNECTING = 0;
(global.WebSocket as unknown as { CONNECTING: number; OPEN: number; CLOSING: number; CLOSED: number }).OPEN = 1;
(global.WebSocket as unknown as { CONNECTING: number; OPEN: number; CLOSING: number; CLOSED: number }).CLOSING = 2;
(global.WebSocket as unknown as { CONNECTING: number; OPEN: number; CLOSED: number }).CLOSED = 3;

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code')
}));

// Mock fullscreen API
Object.defineProperty(document.documentElement, 'requestFullscreen', {
  value: jest.fn().mockResolvedValue(undefined),
  writable: true
});

Object.defineProperty(document, 'exitFullscreen', {
  value: jest.fn().mockResolvedValue(undefined),
  writable: true
});

Object.defineProperty(document, 'fullscreenElement', {
  value: null,
  writable: true
});

// Suppress React act() warnings in tests
const originalError = console.error;
console.error = function(...args: unknown[]): void {
  if (typeof args[0] === 'string' && args[0].includes('Warning: An update to')) {
    return;
  }
  originalError.apply(console, args);
};
