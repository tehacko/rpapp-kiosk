import { renderHook, act } from '@testing-library/react';
import { useQRGeneration } from './useQRGeneration';

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,test-qr-image'),
}));

// Mock shared functions
jest.mock('pi-kiosk-shared', () => ({
  API_ENDPOINTS: {
    PAYMENT_CREATE_MULTI_QR: '/api/payments/create-multi-qr',
  },
  APP_CONFIG: {
    QR_CODE_WIDTH: 300,
  },
  TransactionStatus: {
    INITIATED: 'INITIATED',
  },
  useErrorHandler: jest.fn(() => ({
    handleError: jest.fn(),
  })),
}));

import QRCode from 'qrcode';

const mockQRCode = QRCode as jest.Mocked<typeof QRCode>;
(mockQRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,test-qr-image');

const mockAPIClient = {
  post: jest.fn(),
};

const mockCallbacks = {
  onPaymentDataGenerated: jest.fn() as jest.MockedFunction<(data: any) => void>,
  onPaymentMonitoringStart: jest.fn() as jest.MockedFunction<(paymentId: string) => Promise<void>>,
  onPaymentComplete: jest.fn() as jest.MockedFunction<(data: any) => void>,
  onPaymentTimeout: jest.fn() as jest.MockedFunction<(data: any) => void>,
  onPaymentFailed: jest.fn() as jest.MockedFunction<(data: any) => void>,
};

const mockCart = {
  items: [
    {
      product: { id: 1, name: 'Test Product', price: 100 },
      quantity: 2,
    },
  ],
  totalAmount: 200,
  totalItems: 2,
  kioskId: 1,
};

describe('useQRGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() =>
      useQRGeneration({
        apiClient: mockAPIClient as any,
        kioskId: 1,
        ...mockCallbacks,
      })
    );

    expect(result.current.qrCodeUrl).toBe('');
    expect(result.current.isGenerating).toBe(false);
    expect(typeof result.current.generateQR).toBe('function');
    expect(typeof result.current.clearQR).toBe('function');
  });

  it('generates QR code successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        paymentId: 'test-payment-123',
        qrCodeData: 'test-qr-data',
        amount: 200,
        customerEmail: 'test@example.com',
      },
    };

    mockAPIClient.post.mockResolvedValue(mockResponse);
    mockCallbacks.onPaymentMonitoringStart.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useQRGeneration({
        apiClient: mockAPIClient as any,
        kioskId: 1,
        ...mockCallbacks,
      })
    );

    await act(async () => {
      await result.current.generateQR(mockCart as any, 'test@example.com');
    });

    expect(mockAPIClient.post).toHaveBeenCalledWith('/api/payments/create-multi-qr', {
      items: [{ productId: 1, quantity: 2 }],
      totalAmount: 200,
      customerEmail: 'test@example.com',
      kioskId: 1,
    });

    expect(mockQRCode.toDataURL).toHaveBeenCalledWith('test-qr-data', {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });

    expect(result.current.qrCodeUrl).toBe('data:image/png;base64,test-qr-image');
    expect(mockCallbacks.onPaymentDataGenerated).toHaveBeenCalledWith({
      items: mockCart.items,
      totalAmount: 200,
      customerEmail: 'test@example.com',
      qrCode: 'test-qr-data',
      paymentId: 'test-payment-123',
      status: 'INITIATED',
    });
    expect(mockCallbacks.onPaymentMonitoringStart).toHaveBeenCalledWith('test-payment-123');
  });

  it('handles API error gracefully', async () => {
    const mockResponse = {
      success: false,
      error: 'API Error',
    };

    mockAPIClient.post.mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      useQRGeneration({
        apiClient: mockAPIClient as any,
        kioskId: 1,
        ...mockCallbacks,
      })
    );

    await act(async () => {
      await result.current.generateQR(mockCart as any, 'test@example.com');
    });

    expect(result.current.qrCodeUrl).toBe('');
    expect(mockCallbacks.onPaymentDataGenerated).toHaveBeenCalledWith(null as any);
  });

  it('handles QR generation error gracefully', async () => {
    const mockResponse = {
      success: true,
      data: {
        paymentId: 'test-payment-123',
        qrCodeData: 'test-qr-data',
        amount: 200,
        customerEmail: 'test@example.com',
      },
    };

    mockAPIClient.post.mockResolvedValue(mockResponse);
    (mockQRCode.toDataURL as jest.Mock).mockRejectedValue(new Error('QR generation failed'));

    const { result } = renderHook(() =>
      useQRGeneration({
        apiClient: mockAPIClient as any,
        kioskId: 1,
        ...mockCallbacks,
      })
    );

    await act(async () => {
      await result.current.generateQR(mockCart as any, 'test@example.com');
    });

    expect(result.current.qrCodeUrl).toBe('');
    expect(mockCallbacks.onPaymentDataGenerated).toHaveBeenCalledWith(null as any);
  });

  it('clears QR code', () => {
    const { result } = renderHook(() =>
      useQRGeneration({
        apiClient: mockAPIClient as any,
        kioskId: 1,
        ...mockCallbacks,
      })
    );

    act(() => {
      result.current.clearQR();
    });

    expect(result.current.qrCodeUrl).toBe('');
  });

  it('sets isGenerating state correctly', async () => {
    const mockResponse = {
      success: true,
      data: {
        paymentId: 'test-payment-123',
        qrCodeData: 'test-qr-data',
        amount: 200,
        customerEmail: 'test@example.com',
      },
    };

    mockAPIClient.post.mockResolvedValue(mockResponse);
    mockCallbacks.onPaymentMonitoringStart.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useQRGeneration({
        apiClient: mockAPIClient as any,
        kioskId: 1,
        ...mockCallbacks,
      })
    );

    expect(result.current.isGenerating).toBe(false);

    act(() => {
      result.current.generateQR(mockCart as any, 'test@example.com');
    });

    expect(result.current.isGenerating).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isGenerating).toBe(false);
  });
});
