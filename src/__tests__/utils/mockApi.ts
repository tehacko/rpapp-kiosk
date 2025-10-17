/**
 * Mock API Client for Kiosk App Tests
 * Provides consistent API mocking utilities for kiosk application tests
 */

export interface MockApiResponse<T = any> {
  ok: boolean;
  status: number;
  json: () => Promise<T>;
  text: () => Promise<string>;
}

export interface MockApiClient {
  get: jest.MockedFunction<(url: string) => Promise<MockApiResponse<any>>>;
  post: jest.MockedFunction<(url: string, data?: any) => Promise<MockApiResponse<any>>>;
  put: jest.MockedFunction<(url: string, data?: any) => Promise<MockApiResponse<any>>>;
  delete: jest.MockedFunction<(url: string) => Promise<MockApiResponse<any>>>;
}

export const createMockApiClient = (): MockApiClient => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  };

  return mockClient as MockApiClient;
};

export const createMockResponse = <T>(
  data: T,
  status: number = 200,
  ok: boolean = true
): MockApiResponse<T> => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data))
});

export const createMockErrorResponse = (
  error: string,
  status: number = 500
): MockApiResponse<any> => ({
  ok: false,
  status,
  json: jest.fn().mockResolvedValue({ error }),
  text: jest.fn().mockResolvedValue(JSON.stringify({ error }))
});

// Mock API responses for common kiosk endpoints
export const mockApiResponses = {
  // Products
  productsList: {
    success: true,
    data: {
      products: [
        {
          id: 1,
          name: 'Coffee',
          description: 'Hot coffee',
          price: 3.50,
          image: '☕',
          imageUrl: null,
          quantityInStock: 10,
          clickedOn: 5,
          numberOfPurchases: 2,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'Sandwich',
          description: 'Fresh sandwich',
          price: 5.00,
          image: '🥪',
          imageUrl: 'https://example.com/sandwich.jpg',
          quantityInStock: 5,
          clickedOn: 3,
          numberOfPurchases: 1,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 3,
          name: 'Pizza',
          description: 'Delicious pizza',
          price: 8.50,
          image: '🍕',
          imageUrl: null,
          quantityInStock: 0,
          clickedOn: 0,
          numberOfPurchases: 0,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z'
        }
      ]
    }
  },

  // Product click tracking
  productClick: {
    success: true,
    message: 'Product click tracked successfully'
  },

  // Payment
  paymentCreate: {
    success: true,
    data: {
      paymentId: 'pay_123456789',
      qrCodeData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      amount: 3.50,
      productName: 'Coffee',
      expiresAt: '2023-01-01T01:00:00Z'
    }
  },

  paymentStatus: {
    success: true,
    data: {
      paymentId: 'pay_123456789',
      status: 'PENDING',
      amount: 3.50,
      productName: 'Coffee',
      createdAt: '2023-01-01T00:00:00Z'
    }
  },

  paymentComplete: {
    success: true,
    data: {
      paymentId: 'pay_123456789',
      status: 'COMPLETED',
      amount: 3.50,
      productName: 'Coffee',
      completedAt: '2023-01-01T00:05:00Z',
      receiptUrl: 'https://example.com/receipt/123456789'
    }
  },

  // Health check
  healthCheck: {
    status: 'OK',
    mode: 'PRODUCTION',
    database: {
      available: true,
      error: null,
      status: 'connected'
    }
  },

  // Error responses
  notFound: {
    success: false,
    error: 'Resource not found'
  },

  unauthorized: {
    success: false,
    error: 'Authentication required'
  },

  validationError: {
    success: false,
    error: 'Validation failed',
    details: {
      kioskId: 'Kiosk ID is required',
      productId: 'Product ID is required'
    }
  },

  serverError: {
    success: false,
    error: 'Internal server error'
  },

  // WebSocket messages
  websocketMessages: {
    productUpdate: {
      type: 'PRODUCT_UPDATE',
      data: {
        productId: 1,
        quantityInStock: 8,
        clickedOn: 6
      }
    },
    paymentUpdate: {
      type: 'PAYMENT_UPDATE',
      data: {
        paymentId: 'pay_123456789',
        status: 'COMPLETED'
      }
    },
    inventoryUpdate: {
      type: 'INVENTORY_UPDATE',
      data: {
        kioskId: 1,
        updates: [
          { productId: 1, quantityInStock: 8 },
          { productId: 2, quantityInStock: 4 }
        ]
      }
    }
  }
};

// Helper function to setup common API mocks
export const setupApiMocks = (mockClient: MockApiClient) => {
  // Default successful responses
  mockClient.get.mockImplementation((url: string) => {
    if (url.includes('/api/products')) {
      return Promise.resolve(createMockResponse(mockApiResponses.productsList));
    }
    if (url.includes('/health')) {
      return Promise.resolve(createMockResponse(mockApiResponses.healthCheck));
    }
    if (url.includes('/api/payments/') && url.includes('/status')) {
      return Promise.resolve(createMockResponse(mockApiResponses.paymentStatus));
    }
    return Promise.resolve(createMockResponse(mockApiResponses.notFound, 404, false));
  });

  mockClient.post.mockImplementation((url: string, _data?: any) => {
    if (url.includes('/api/products/') && url.includes('/click')) {
      return Promise.resolve(createMockResponse(mockApiResponses.productClick));
    }
    if (url.includes('/api/payments')) {
      return Promise.resolve(createMockResponse(mockApiResponses.paymentCreate, 201));
    }
    return Promise.resolve(createMockResponse(mockApiResponses.notFound, 404, false));
  });

  mockClient.put.mockImplementation((url: string, _data?: any) => {
    if (url.includes('/api/payments/') && url.includes('/complete')) {
      return Promise.resolve(createMockResponse(mockApiResponses.paymentComplete));
    }
    return Promise.resolve(createMockResponse(mockApiResponses.notFound, 404, false));
  });

  mockClient.delete.mockImplementation((_url: string) => {
    return Promise.resolve(createMockResponse({ success: true, message: 'Payment cancelled' }));
  });
};

// Helper function to reset all mocks
export const resetApiMocks = (mockClient: MockApiClient) => {
  mockClient.get.mockReset();
  mockClient.post.mockReset();
  mockClient.put.mockReset();
  mockClient.delete.mockReset();
};

// Helper function to simulate network errors
export const simulateNetworkError = (mockClient: MockApiClient) => {
  const networkError = new Error('Network error');
  mockClient.get.mockRejectedValue(networkError);
  mockClient.post.mockRejectedValue(networkError);
  mockClient.put.mockRejectedValue(networkError);
  mockClient.delete.mockRejectedValue(networkError);
};

// Helper function to simulate slow responses
export const simulateSlowResponse = (mockClient: MockApiClient, delay: number = 2000) => {
  const slowResponse = (response: MockApiResponse<any>) => 
    new Promise<MockApiResponse<any>>(resolve => 
      setTimeout(() => resolve(response), delay)
    );

  mockClient.get.mockImplementation((_url: string) => 
    slowResponse(createMockResponse(mockApiResponses.productsList))
  );
  mockClient.post.mockImplementation((_url: string) => 
    slowResponse(createMockResponse(mockApiResponses.paymentCreate))
  );
  mockClient.put.mockImplementation((_url: string) => 
    slowResponse(createMockResponse(mockApiResponses.paymentComplete))
  );
  mockClient.delete.mockImplementation((_url: string) => 
    slowResponse(createMockResponse({ success: true }))
  );
};

// WebSocket mock utilities
export const createMockWebSocket = () => {
  const mockWebSocket = {
    readyState: WebSocket.CONNECTING,
    url: 'ws://localhost:3000',
    protocol: '',
    extensions: '',
    bufferedAmount: 0,
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    close: jest.fn(),
    send: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  };

  return mockWebSocket as unknown as WebSocket;
};

// Helper function to simulate WebSocket messages
export const simulateWebSocketMessage = (mockWebSocket: any, message: any) => {
  const event = new MessageEvent('message', {
    data: JSON.stringify(message)
  });
  
  if (mockWebSocket.onmessage) {
    mockWebSocket.onmessage(event);
  }
  
  // Also trigger event listeners
  const listeners = mockWebSocket.addEventListener.mock.calls
    .filter((call: any) => call[0] === 'message')
    .map((call: any) => call[1]);
  
  listeners.forEach((listener: any) => listener(event));
};

// Helper function to simulate WebSocket connection
export const simulateWebSocketConnection = (mockWebSocket: any) => {
  mockWebSocket.readyState = WebSocket.OPEN;
  
  if (mockWebSocket.onopen) {
    mockWebSocket.onopen(new Event('open'));
  }
  
  // Also trigger event listeners
  const listeners = mockWebSocket.addEventListener.mock.calls
    .filter((call: any) => call[0] === 'open')
    .map((call: any) => call[1]);
  
  listeners.forEach((listener: any) => listener(new Event('open')));
};

// Helper function to simulate WebSocket disconnection
export const simulateWebSocketDisconnection = (mockWebSocket: any) => {
  mockWebSocket.readyState = WebSocket.CLOSED;
  
  if (mockWebSocket.onclose) {
    mockWebSocket.onclose(new CloseEvent('close'));
  }
  
  // Also trigger event listeners
  const listeners = mockWebSocket.addEventListener.mock.calls
    .filter((call: any) => call[0] === 'close')
    .map((call: any) => call[1]);
  
  listeners.forEach((listener: any) => listener(new CloseEvent('close')));
};
