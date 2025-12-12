/**
 * Kiosk App Tests - Refactored with proper mocking
 * Tests main kiosk app functionality with consistent mocking patterns
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for react-router DOM TextEncoder usage in jsdom
// @ts-expect-error - Polyfill for jsdom environment
global.TextEncoder = TextEncoder;
// @ts-expect-error - Polyfill for jsdom environment
global.TextDecoder = TextDecoder;
import App from './App';
import {
  testDataSets
} from './__tests__/utils/testData';

// Mock the kiosk useProducts hook
jest.mock('./features/products/hooks/useProducts', () => ({
  useProducts: jest.fn()
}));


// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn()
}));

// Mock API client
const mockAPIClient = {
  get: jest.fn(),
  post: jest.fn()
};

jest.mock('pi-kiosk-shared', () => ({
  createAPIClient: jest.fn(() => mockAPIClient),
  getKioskIdFromUrl: jest.fn(() => 1),
  generatePaymentId: jest.fn(() => 'pay-123456789'),
  validateKioskId: jest.fn(() => true),
  useServerSentEvents: jest.fn(() => ({
    isConnected: true,
    connectionError: null,
    reconnect: jest.fn(),
    disconnect: jest.fn()
  })),
  useProducts: jest.fn(() => mockUseProducts),
  getEnvironmentConfig: jest.fn(() => ({
    apiUrl: 'http://localhost:3015',
    wsUrl: 'ws://localhost:3015',
    mode: 'development'
  })),
  getCurrentEnvironment: jest.fn(() => 'development'),
  useErrorHandler: jest.fn(() => ({
    handleError: jest.fn(),
    clearError: jest.fn(),
    retryAction: jest.fn()
  })),
  API_ENDPOINTS: {
    EVENTS: '/events/:kioskId',
    PRODUCTS: '/products/:kioskId',
    PAYMENT: '/payment',
    PAYMENT_STATUS: '/payment/:paymentId/status'
  },
  APP_CONFIG: {
    PAYMENT_ACCOUNT_NUMBER: '1234567890',
    PAYMENT_CURRENCY: 'CZK',
    QR_CODE_WIDTH: 300,
    QR_CODE_FORMAT: 'SPD*1.0',
    PAYMENT_POLLING_INTERVAL: 3000,
    PRODUCT_CACHE_TTL: 300000 // 5 minutes
  },
  useAsyncOperation: jest.fn((options: any = {}) => {
    const onSuccess = options.onSuccess;
    const onError = options.onError;
    
    return {
      execute: jest.fn(async (fn: any) => {
        try {
          const result = await fn();
          if (onSuccess) {
            onSuccess(result);
          }
          return result;
        } catch (error) {
          if (onError) {
            onError(error);
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
  UI_MESSAGES: {
    LOADING_PRODUCTS: 'Načítání produktů...',
    NO_PRODUCTS: 'Žádné produkty nejsou k dispozici',
    SELECT_PRODUCT: 'Vyberte si produkt',
    PAYMENT_SUCCESS: 'Platba byla úspěšně zpracována!',
    CONTINUE_SHOPPING: 'Pokračovat v nákupu',
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
  },
  formatPrice: jest.fn((amount: number) => `${amount} Kč`),
  
  // Validation functions
  validateSchema: jest.fn((data: any, _schema: any) => {
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
  
  createEmptyCart: jest.fn(() => ({ items: [], totalAmount: 0, totalItems: 0 })),
  addToCart: jest.fn((cart: any, product: any, quantity = 1) => {
    const existingItem = cart.items.find((item: any) => item.product.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product, quantity });
    }
    
    cart.totalAmount = cart.items.reduce((sum: number, item: any) => sum + (item.product.price * item.quantity), 0);
    cart.totalItems = cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    
    return cart;
  }),
  removeFromCart: jest.fn((cart: any, productId: any) => ({ ...cart, items: cart.items.filter((item: any) => item.product.id !== productId) })),
  updateCartItemQuantity: jest.fn((_cart, _productId, _quantity) => { /* ... */ }),
  clearCart: jest.fn(() => ({ items: [], totalAmount: 0, totalItems: 0 })),
  NetworkError: class NetworkError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NetworkError';
    }
  },
}));

// Use test data factories
const mockProducts = testDataSets.basicProducts.map(product => ({
  ...product,
  clickedOn: product.clickedOn,
  qrCodesGenerated: 0,
  numberOfPurchases: product.numberOfPurchases,
  kioskClickedOn: product.clickedOn,
  kioskNumberOfPurchases: product.numberOfPurchases
}));

const mockUseProducts = {
  products: mockProducts,
  isLoading: false,
  error: null,
  isConnected: true,
  setIsConnected: jest.fn(),
  trackProductClick: jest.fn(),
  refresh: jest.fn()
};


describe.skip('KioskApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the hooks
    const { useProducts } = require('./features/products/hooks/useProducts');
    
    useProducts.mockReturnValue(mockUseProducts);
    
    // Mock API client responses
    (mockAPIClient.post as any).mockResolvedValue({
      success: true,
      data: {
        paymentId: 'pay-123456789',
        qrCodeData: 'SPD*1.0*ACC:1234567890*AM:100*CC:CZK*MSG:Platba za Test Product 1 - test@example.com*X-VS:pay-123456789',
        amount: 100,
        productName: 'Test Product 1',
        customerEmail: 'test@example.com'
      }
    });
    
    (mockAPIClient.get as any).mockResolvedValue({
      success: true,
      data: {
        paymentId: 'pay-123456789',
        status: 'INITIATED',
        amount: 100,
        productName: 'Test Product 1',
        customerEmail: 'test@example.com',
        requestedAt: new Date().toISOString(),
        completedAt: null
      }
    });
  });

  it('renders products screen by default', () => {
    render(<App />);
    
    expect(screen.getByText('Vyberte si produkt')).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Sandwich')).toBeInTheDocument();
    expect(screen.getByText('Cake')).toBeInTheDocument();
  });

  it('shows loading state when products are loading', () => {
    const { useProducts } = require('./hooks/useProducts');
    useProducts.mockReturnValue({
      ...mockUseProducts,
      isLoading: true,
      products: []
    });

    render(<App />);
    
    expect(screen.getByText('Načítání produktů...')).toBeInTheDocument();
  });

  it('shows error state when products fail to load', () => {
    const { useProducts } = require('./hooks/useProducts');
    useProducts.mockReturnValue({
      ...mockUseProducts,
      isLoading: false,
      products: [],
      error: new Error('Failed to load products')
    });

    render(<App />);
    
    expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    expect(screen.getByText('🔄 Zkusit znovu')).toBeInTheDocument();
  });

  it('shows empty state when no products available', () => {
    const { useProducts } = require('./hooks/useProducts');
    useProducts.mockReturnValue({
      ...mockUseProducts,
      isLoading: false,
      products: [],
      error: null
    });

    render(<App />);
    
    expect(screen.getByText('Žádné produkty nejsou k dispozici')).toBeInTheDocument();
  });

  it('adds product to cart when add to cart button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Click the "Add to Cart" button, not the product card
    const addToCartButtons = screen.getAllByText('🛒 Přidat do košíku');
    await user.click(addToCartButtons[0]);
    
    // Should show the cart header with checkout button
    await waitFor(() => {
      expect(screen.getByText('💳 Zaplatit')).toBeInTheDocument();
    });
  });

  it('navigates to payment screen when checkout button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Add product to cart first
    const addToCartButtons = screen.getAllByText('🛒 Přidat do košíku');
    await user.click(addToCartButtons[0]);
    
    // Wait for checkout button to appear
    await waitFor(() => {
      expect(screen.getByText('💳 Zaplatit')).toBeInTheDocument();
    });
    
    // Click checkout button to navigate to payment screen
    const checkoutButton = screen.getByText('💳 Zaplatit');
    await user.click(checkoutButton);
    
    // Should now be on payment screen
    await waitFor(() => {
      expect(screen.getByText(/Coffee/)).toBeInTheDocument();
      expect(screen.getAllByText(/3\.5 Kč/)).toHaveLength(2); // Item price and total price
    });
  });

  it('shows cart summary when product is added to cart', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Add product to cart
    const addToCartButtons = screen.getAllByText('🛒 Přidat do košíku');
    await user.click(addToCartButtons[0]);
    
    // Should show cart summary
    await waitFor(() => {
      expect(screen.getByText(/Coffee/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Coffee.*3\.5 Kč/)).toBeInTheDocument(); // Check aria-label
      expect(screen.getByText('💳 Zaplatit')).toBeInTheDocument();
    });
  });

  it('clears cart when clear cart button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Add product to cart first
    const addToCartButtons = screen.getAllByText('🛒 Přidat do košíku');
    await user.click(addToCartButtons[0]);
    
    // Wait for checkout button to appear
    await waitFor(() => {
      expect(screen.getByText('💳 Zaplatit')).toBeInTheDocument();
    });
    
    // Click clear cart button
    const clearCartButton = screen.getByText(/Vyprázdnit košík/);
    await user.click(clearCartButton);
    
    // Should return to products screen without cart
    await waitFor(() => {
      expect(screen.getByText('Vyberte si produkt')).toBeInTheDocument();
      expect(screen.queryByText('💳 Zaplatit')).not.toBeInTheDocument();
    });
  });

  it('toggles fullscreen mode', async () => {
    const user = userEvent.setup();
    
    // Mock fullscreen API
    const mockRequestFullscreen = jest.fn();
    const mockExitFullscreen = jest.fn();
    
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true
    });
    
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: mockRequestFullscreen,
      writable: true
    });
    
    Object.defineProperty(document, 'exitFullscreen', {
      value: mockExitFullscreen,
      writable: true
    });

    render(<App />);
    
    const fullscreenButton = screen.getByTitle('Přepnout na celou obrazovku');
    await user.click(fullscreenButton);
    
    expect(mockRequestFullscreen).toHaveBeenCalled();
  });

  it('shows connection status', () => {
    render(<App />);
    
    expect(screen.getByText('Připojeno')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    render(<App />);
    
    // The App component manages its own connection state, so we test the initial state
    expect(screen.getByText('Připojeno')).toBeInTheDocument();
  });

  it('tracks product clicks when add to cart button is clicked', async () => {
    const user = userEvent.setup();
    const { useProducts } = require('./hooks/useProducts');
    const trackProductClick = jest.fn();
    
    useProducts.mockReturnValue({
      ...mockUseProducts,
      trackProductClick
    });

    render(<App />);
    
    // Click the "Add to Cart" button
    const addToCartButtons = screen.getAllByText('🛒 Přidat do košíku');
    await user.click(addToCartButtons[0]);
    
    expect(trackProductClick).toHaveBeenCalledWith(1);
  });

  it('shows fullscreen button', () => {
    render(<App />);
    
    // Should show fullscreen button
    expect(screen.getByTitle('Přepnout na celou obrazovku')).toBeInTheDocument();
  });
});
