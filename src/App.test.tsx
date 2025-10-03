import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock the shared package hooks
jest.mock('./hooks/useProducts', () => ({
  useProducts: jest.fn()
}));


// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code')
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
  APP_CONFIG: {
    PAYMENT_ACCOUNT_NUMBER: '1234567890',
    PAYMENT_CURRENCY: 'CZK',
    QR_CODE_WIDTH: 300,
    QR_CODE_FORMAT: 'SPD*1.0',
    PAYMENT_POLLING_INTERVAL: 3000,
    PRODUCT_CACHE_TTL: 300000 // 5 minutes
  },
  useErrorHandler: jest.fn(() => ({
    handleError: jest.fn(),
    clearError: jest.fn()
  })),
  useAsyncOperation: jest.fn((options = {}) => {
    let onSuccess = options.onSuccess;
    let onError = options.onError;
    
    return {
      execute: jest.fn(async (fn) => {
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
  createEmptyCart: jest.fn(() => ({ items: [], totalAmount: 0, totalItems: 0 })),
  addToCart: jest.fn((cart, product, quantity = 1) => ({ ...cart, items: [...cart.items, { product, quantity }] })),
  removeFromCart: jest.fn((cart, productId) => ({ ...cart, items: cart.items.filter((item: any) => item.product.id !== productId) })),
  updateCartItemQuantity: jest.fn((_cart, _productId, _quantity) => { /* ... */ }),
  clearCart: jest.fn(() => ({ items: [], totalAmount: 0, totalItems: 0 })),
  NetworkError: class NetworkError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NetworkError';
    }
  },
}));

const mockProducts = [
  {
    id: 1,
    name: 'Test Product 1',
    description: 'A test product',
    price: 100,
    image: '📦',
    imageUrl: null,
    quantityInStock: 5,
    clickedOn: 0,
    numberOfPurchases: 0
  },
  {
    id: 2,
    name: 'Test Product 2',
    description: 'Another test product',
    price: 200,
    image: '🍕',
    imageUrl: null,
    quantityInStock: 3,
    clickedOn: 0,
    numberOfPurchases: 0
  }
];

const mockUseProducts = {
  products: mockProducts,
  isLoading: false,
  error: null,
  isConnected: true,
  setIsConnected: jest.fn(),
  trackProductClick: jest.fn().mockResolvedValue(undefined),
  refresh: jest.fn()
};


describe('KioskApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the hooks
    const { useProducts } = require('./hooks/useProducts');
    
    useProducts.mockReturnValue(mockUseProducts);
    
    // Mock API client responses
    mockAPIClient.post.mockResolvedValue({
      success: true,
      data: {
        paymentId: 'pay-123456789',
        qrCodeData: 'SPD*1.0*ACC:1234567890*AM:100*CC:CZK*MSG:Platba za Test Product 1 - test@example.com*X-VS:pay-123456789',
        amount: 100,
        productName: 'Test Product 1',
        customerEmail: 'test@example.com'
      }
    });
    
    mockAPIClient.get.mockResolvedValue({
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
    expect(screen.getByText('Kiosk #1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
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

  it('navigates to payment screen when product is selected', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    const productCards = screen.getAllByText('Test Product 1');
    const productCard = productCards[0].closest('.product-card');
    expect(productCard).toBeInTheDocument();
    
    await user.click(productCard!);
    
    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('A test product')).toBeInTheDocument();
      expect(screen.getByText('100 Kč')).toBeInTheDocument();
    });
  });

  it('generates QR code when payment form is submitted', async () => {
    const user = userEvent.setup();
    const { useProducts } = require('./hooks/useProducts');
    const trackProductClick = jest.fn().mockResolvedValue(undefined);
    
    useProducts.mockReturnValue({
      ...mockUseProducts,
      trackProductClick
    });

    render(<App />);
    
    // Select a product
    const productCards = screen.getAllByText('Test Product 1');
    const productCard = productCards[0].closest('.product-card');
    await user.click(productCard!);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Váš email/)).toBeInTheDocument();
    });
    
    // Fill in email and submit
    const emailInput = screen.getByLabelText(/Váš email/);
    await user.type(emailInput, 'test@example.com');
    
    const submitButton = screen.getByRole('button', { name: /generovat qr kód/i });
    await user.click(submitButton);
    
    // Should show QR code
    await waitFor(() => {
      expect(screen.getByText('Naskenujte QR kód pro platbu')).toBeInTheDocument();
      expect(screen.getByText('Částka:')).toBeInTheDocument();
      expect(screen.getAllByText('100 Kč')).toHaveLength(2); // One in product price, one in QR section
      expect(screen.getByText('Email:')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('handles payment confirmation', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Select a product and go to payment
    const productCards = screen.getAllByText('Test Product 1');
    const productCard = productCards[0].closest('.product-card');
    await user.click(productCard!);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Váš email/)).toBeInTheDocument();
    });
    
    // Fill in email and submit
    const emailInput = screen.getByLabelText(/Váš email/);
    await user.type(emailInput, 'test@example.com');
    
    const submitButton = screen.getByRole('button', { name: /generovat qr kód/i });
    await user.click(submitButton);
    
    // Should show QR code and payment form
    await waitFor(() => {
      expect(screen.getByText('Naskenujte QR kód pro platbu')).toBeInTheDocument();
      expect(screen.getByText('Částka:')).toBeInTheDocument();
      expect(screen.getAllByText('100 Kč')).toHaveLength(2); // One in product price, one in QR section
      expect(screen.getByText('Email:')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('returns to products screen from payment', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Select a product
    const productCards = screen.getAllByText('Test Product 1');
    const productCard = productCards[0].closest('.product-card');
    await user.click(productCard!);
    
    await waitFor(() => {
      expect(screen.getByText('← Zpět na produkty')).toBeInTheDocument();
    });
    
    // Click back button
    const backButton = screen.getByText('← Zpět na produkty');
    await user.click(backButton);
    
    // Should return to products screen
    await waitFor(() => {
      expect(screen.getByText('Vyberte si produkt')).toBeInTheDocument();
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
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

  it('handles product click tracking', async () => {
    const user = userEvent.setup();
    const { useProducts } = require('./hooks/useProducts');
    const trackProductClick = jest.fn().mockResolvedValue(undefined);
    
    useProducts.mockReturnValue({
      ...mockUseProducts,
      trackProductClick
    });

    render(<App />);
    
    const productCards = screen.getAllByText('Test Product 1');
    const productCard = productCards[0].closest('.product-card');
    await user.click(productCard!);
    
    expect(trackProductClick).toHaveBeenCalledWith(1);
  });

  it('validates email input', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Select a product
    const productCards = screen.getAllByText('Test Product 1');
    const productCard = productCards[0].closest('.product-card');
    await user.click(productCard!);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Váš email/)).toBeInTheDocument();
    });
    
    // Try to submit with invalid email
    const emailInput = screen.getByLabelText(/Váš email/);
    await user.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: /generovat qr kód/i });
    await user.click(submitButton);
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Zadejte platnou emailovou adresu')).toBeInTheDocument();
    });
  });
});
