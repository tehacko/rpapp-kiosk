/**
 * Test Data Factories for Kiosk App Tests
 * Provides consistent test data generation for kiosk application tests
 */

export interface TestKioskProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  imageUrl?: string;
  quantityInStock: number;
  clickedOn: number;
  numberOfPurchases: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestCartItem {
  product: TestKioskProduct;
  quantity: number;
}

export interface TestPayment {
  id: string;
  productId: number;
  productName: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  qrCodeData?: string;
  createdAt: string;
  completedAt?: string;
  receiptUrl?: string;
}

export interface TestKioskConfig {
  kioskId: number;
  name: string;
  location: string;
  isActive: boolean;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
  };
}

// Base factory function
const createBaseEntity = <T>(overrides: Partial<T> = {}): T => ({
  ...overrides
} as T);

// Kiosk product factory
export const createTestKioskProduct = (overrides: Partial<TestKioskProduct> = {}): TestKioskProduct => {
  const defaults: TestKioskProduct = {
    id: Math.floor(Math.random() * 1000) + 1,
    name: 'Test Product',
    description: 'Test product description',
    price: 10.00,
    image: '📦',
    imageUrl: undefined,
    quantityInStock: 10,
    clickedOn: 0,
    numberOfPurchases: 0,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  return createBaseEntity({ ...defaults, ...overrides });
};

// Cart item factory
export const createTestCartItem = (overrides: Partial<TestCartItem> = {}): TestCartItem => {
  const defaults: TestCartItem = {
    product: createTestKioskProduct(),
    quantity: 1
  };

  return createBaseEntity({ ...defaults, ...overrides });
};

// Payment factory
export const createTestPayment = (overrides: Partial<TestPayment> = {}): TestPayment => {
  const defaults: TestPayment = {
    id: 'pay_' + Math.random().toString(36).substr(2, 9),
    productId: 1,
    productName: 'Test Product',
    amount: 10.00,
    status: 'PENDING',
    qrCodeData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    createdAt: '2023-01-01T00:00:00Z'
  };

  return createBaseEntity({ ...defaults, ...overrides });
};

// Kiosk config factory
export const createTestKioskConfig = (overrides: Partial<TestKioskConfig> = {}): TestKioskConfig => {
  const defaults: TestKioskConfig = {
    kioskId: 1,
    name: 'Test Kiosk',
    location: 'Test Location',
    isActive: true,
    theme: {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d'
    }
  };

  return createBaseEntity({ ...defaults, ...overrides });
};

// Collection factories
export const createTestKioskProducts = (count: number, overrides: Partial<TestKioskProduct> = {}): TestKioskProduct[] => {
  return Array.from({ length: count }, (_, index) => 
    createTestKioskProduct({ 
      ...overrides, 
      id: (overrides.id || 0) + index + 1,
      name: `${overrides.name || 'Test Product'} ${index + 1}`
    })
  );
};

export const createTestCartItems = (count: number, overrides: Partial<TestCartItem> = {}): TestCartItem[] => {
  return Array.from({ length: count }, (_, index) => 
    createTestCartItem({ 
      ...overrides, 
      product: createTestKioskProduct({ 
        id: (overrides.product?.id || 0) + index + 1,
        name: `${overrides.product?.name || 'Test Product'} ${index + 1}`
      })
    })
  );
};

// Predefined test data sets
export const testDataSets = {
  // Basic products
  basicProducts: [
    createTestKioskProduct({ 
      id: 1, 
      name: 'Coffee', 
      description: 'Hot coffee', 
      price: 3.50, 
      image: '☕',
      quantityInStock: 10,
      clickedOn: 5,
      numberOfPurchases: 2
    }),
    createTestKioskProduct({ 
      id: 2, 
      name: 'Sandwich', 
      description: 'Fresh sandwich', 
      price: 5.00, 
      image: '🥪',
      imageUrl: 'https://example.com/sandwich.jpg',
      quantityInStock: 5,
      clickedOn: 3,
      numberOfPurchases: 1
    }),
    createTestKioskProduct({ 
      id: 3, 
      name: 'Pizza', 
      description: 'Delicious pizza', 
      price: 8.50, 
      image: '🍕',
      quantityInStock: 0,
      clickedOn: 0,
      numberOfPurchases: 0
    }),
    createTestKioskProduct({ 
      id: 4, 
      name: 'Cake', 
      description: 'Sweet cake', 
      price: 4.50, 
      image: '🍰',
      quantityInStock: 2,
      clickedOn: 1,
      numberOfPurchases: 0
    })
  ],

  // Cart scenarios
  emptyCart: [],
  
  singleItemCart: [
    createTestCartItem({
      product: createTestKioskProduct({ id: 1, name: 'Coffee', price: 3.50 }),
      quantity: 1
    })
  ],

  multipleItemsCart: [
    createTestCartItem({
      product: createTestKioskProduct({ id: 1, name: 'Coffee', price: 3.50 }),
      quantity: 2
    }),
    createTestCartItem({
      product: createTestKioskProduct({ id: 2, name: 'Sandwich', price: 5.00 }),
      quantity: 1
    })
  ],

  // Payment scenarios
  pendingPayment: createTestPayment({
    id: 'pay_pending_123',
    productId: 1,
    productName: 'Coffee',
    amount: 3.50,
    status: 'PENDING'
  }),

  completedPayment: createTestPayment({
    id: 'pay_completed_123',
    productId: 1,
    productName: 'Coffee',
    amount: 3.50,
    status: 'COMPLETED',
    completedAt: '2023-01-01T00:05:00Z',
    receiptUrl: 'https://example.com/receipt/123'
  }),

  failedPayment: createTestPayment({
    id: 'pay_failed_123',
    productId: 1,
    productName: 'Coffee',
    amount: 3.50,
    status: 'FAILED'
  }),

  // Edge case data
  edgeCaseProducts: [
    createTestKioskProduct({ 
      id: 1, 
      name: '', 
      price: 10, 
      quantityInStock: 5 
    }), // Empty name
    createTestKioskProduct({ 
      id: 2, 
      name: 'A'.repeat(1000), 
      price: 10, 
      quantityInStock: 5 
    }), // Very long name
    createTestKioskProduct({ 
      id: 3, 
      name: 'Special Chars !@#$%', 
      price: 10, 
      quantityInStock: 5 
    }), // Special characters
    createTestKioskProduct({ 
      id: 4, 
      name: 'Zero Price', 
      price: 0, 
      quantityInStock: 5 
    }), // Zero price
    createTestKioskProduct({ 
      id: 5, 
      name: 'Negative Price', 
      price: -10, 
      quantityInStock: 5 
    }), // Negative price
    createTestKioskProduct({ 
      id: 6, 
      name: 'Very Expensive', 
      price: 999999.99, 
      quantityInStock: 5 
    }), // Very high price
    createTestKioskProduct({ 
      id: 7, 
      name: 'Out of Stock', 
      price: 10, 
      quantityInStock: 0 
    }), // Out of stock
    createTestKioskProduct({ 
      id: 8, 
      name: 'Low Stock', 
      price: 10, 
      quantityInStock: 1 
    }), // Low stock
    createTestKioskProduct({ 
      id: 9, 
      name: 'High Stock', 
      price: 10, 
      quantityInStock: 999999 
    }), // Very high stock
  ],

  // Cart edge cases
  edgeCaseCart: [
    createTestCartItem({
      product: createTestKioskProduct({ id: 1, name: 'Product 1', price: 10 }),
      quantity: 0 // Zero quantity
    }),
    createTestCartItem({
      product: createTestKioskProduct({ id: 2, name: 'Product 2', price: 10 }),
      quantity: -1 // Negative quantity
    }),
    createTestCartItem({
      product: createTestKioskProduct({ id: 3, name: 'Product 3', price: 10 }),
      quantity: 999999 // Very high quantity
    })
  ]
};

// Helper functions for common test scenarios
export const createKioskWithProducts = (kioskId: number, productCount: number = 4) => {
  const kioskConfig = createTestKioskConfig({ kioskId });
  const products = createTestKioskProducts(productCount);
  
  return { kioskConfig, products };
};

export const createCartWithItems = (itemCount: number = 3) => {
  const products = createTestKioskProducts(itemCount);
  const cartItems = products.map(product => 
    createTestCartItem({ product, quantity: Math.floor(Math.random() * 3) + 1 })
  );
  
  return { products, cartItems };
};

export const createPaymentFlow = (productId: number, productName: string, amount: number) => {
  const pendingPayment = createTestPayment({
    productId,
    productName,
    amount,
    status: 'PENDING'
  });
  
  const completedPayment = createTestPayment({
    ...pendingPayment,
    status: 'COMPLETED',
    completedAt: '2023-01-01T00:05:00Z',
    receiptUrl: 'https://example.com/receipt/123'
  });
  
  return { pendingPayment, completedPayment };
};

// Mock form data generators
export const createProductClickData = (productId: number, kioskId: number = 1) => ({
  productId,
  kioskId
});

export const createPaymentData = (productId: number, kioskId: number = 1) => ({
  productId,
  kioskId,
  customerEmail: 'test@example.com'
});

// Validation test data
export const validationTestData = {
  invalidProductClicks: [
    { productId: null, kioskId: 1 }, // Null product ID
    { productId: 1, kioskId: null }, // Null kiosk ID
    { productId: 'invalid', kioskId: 1 }, // Invalid product ID type
    { productId: 1, kioskId: 'invalid' }, // Invalid kiosk ID type
    { productId: -1, kioskId: 1 }, // Negative product ID
    { productId: 1, kioskId: -1 }, // Negative kiosk ID
  ],

  invalidPayments: [
    { productId: null, kioskId: 1, customerEmail: 'test@example.com' }, // Null product ID
    { productId: 1, kioskId: null, customerEmail: 'test@example.com' }, // Null kiosk ID
    { productId: 1, kioskId: 1, customerEmail: '' }, // Empty email
    { productId: 1, kioskId: 1, customerEmail: 'invalid-email' }, // Invalid email
    { productId: 1, kioskId: 1, customerEmail: null }, // Null email
  ],

  invalidCartQuantities: [
    { productId: 1, quantity: 0 }, // Zero quantity
    { productId: 1, quantity: -1 }, // Negative quantity
    { productId: 1, quantity: 'invalid' }, // Invalid quantity type
    { productId: 1, quantity: null }, // Null quantity
    { productId: 1, quantity: 999999 }, // Very high quantity
  ]
};

// Mock WebSocket message generators
export const createWebSocketMessage = (type: string, data: any) => ({
  type,
  data,
  timestamp: new Date().toISOString()
});

export const createProductUpdateMessage = (productId: number, updates: Partial<TestKioskProduct>) => 
  createWebSocketMessage('PRODUCT_UPDATE', {
    productId,
    ...updates
  });

export const createPaymentUpdateMessage = (paymentId: string, status: string) => 
  createWebSocketMessage('PAYMENT_UPDATE', {
    paymentId,
    status
  });

export const createInventoryUpdateMessage = (kioskId: number, updates: Array<{productId: number, quantityInStock: number}>) => 
  createWebSocketMessage('INVENTORY_UPDATE', {
    kioskId,
    updates
  });
