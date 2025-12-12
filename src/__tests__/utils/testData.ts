// Test data for kiosk app tests
import type { KioskProduct, Cart, MultiProductPaymentData } from 'pi-kiosk-shared';

// This file contains test data, not tests
describe('Test Data', () => {
  it('should export test data', () => {
    expect(testDataSets).toBeDefined();
  });
});

export const testDataSets = {
  basicProducts: [
    {
      id: 1,
      name: 'Coffee',
      price: 100,
      description: 'Hot coffee',
      imageUrl: '☕',
      clickedOn: 0,
      qrCodesGenerated: 0,
      numberOfPurchases: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      quantityInStock: 5,
      kioskClickedOn: 0,
      kioskNumberOfPurchases: 0
    },
    {
      id: 2,
      name: 'Sandwich',
      price: 200,
      description: 'Fresh sandwich',
      imageUrl: '🥪',
      clickedOn: 0,
      qrCodesGenerated: 0,
      numberOfPurchases: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      quantityInStock: 3,
      kioskClickedOn: 0,
      kioskNumberOfPurchases: 0
    },
    {
      id: 3,
      name: 'Cake',
      price: 150,
      description: 'Delicious cake',
      imageUrl: '🍰',
      clickedOn: 0,
      qrCodesGenerated: 0,
      numberOfPurchases: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      quantityInStock: 2,
      kioskClickedOn: 0,
      kioskNumberOfPurchases: 0
    }
  ] as KioskProduct[],

  productsWithStock: [
    {
      id: 4,
      name: 'Tea',
      price: 80,
      description: 'Hot tea',
      imageUrl: '🍵',
      clickedOn: 0,
      qrCodesGenerated: 0,
      numberOfPurchases: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      quantityInStock: 10,
      kioskClickedOn: 0,
      kioskNumberOfPurchases: 0
    },
    {
      id: 5,
      name: 'Cookie',
      price: 50,
      description: 'Sweet cookie',
      imageUrl: '🍪',
      clickedOn: 0,
      qrCodesGenerated: 0,
      numberOfPurchases: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      quantityInStock: 8,
      kioskClickedOn: 0,
      kioskNumberOfPurchases: 0
    }
  ] as KioskProduct[],

  emptyCart: {
    items: [],
    totalItems: 0,
    totalAmount: 0
  } as Cart,

  cartWithItems: {
    items: [
      {
        product: {
          id: 1,
          name: 'Coffee',
          price: 100,
          description: 'Hot coffee',
          imageUrl: '☕',
          clickedOn: 0,
          qrCodesGenerated: 0,
          numberOfPurchases: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          quantityInStock: 5,
          kioskClickedOn: 0,
          kioskNumberOfPurchases: 0
        } as KioskProduct,
        quantity: 2
      }
    ],
    totalItems: 2,
    totalAmount: 200
  } as Cart,

  completedPayment: {
    paymentId: 'test-payment-123',
    amount: 200,
    totalAmount: 200,
    customerEmail: 'test@example.com',
    qrCode: 'test-qr-code',
    items: [
      {
        product: {
          id: 1,
          name: 'Coffee',
          price: 100,
          description: 'Hot coffee',
          imageUrl: '☕',
          clickedOn: 0,
          qrCodesGenerated: 0,
          numberOfPurchases: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          quantityInStock: 5,
          kioskClickedOn: 0,
          kioskNumberOfPurchases: 0
        } as KioskProduct,
        quantity: 2
      }
    ]
  } as MultiProductPaymentData,

  thePayPaymentData: {
    paymentId: 'thepay-123',
    amount: 150,
    totalAmount: 150,
    customerEmail: 'thepay@example.com',
    qrCode: 'thepay-qr',
    items: [
      {
        product: {
          id: 3,
          name: 'Cake',
          price: 150,
          description: 'Delicious cake',
          imageUrl: '🍰',
          clickedOn: 0,
          qrCodesGenerated: 0,
          numberOfPurchases: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          quantityInStock: 2,
          kioskClickedOn: 0,
          kioskNumberOfPurchases: 0
        } as KioskProduct,
        quantity: 1
      }
    ]
  } as MultiProductPaymentData
};