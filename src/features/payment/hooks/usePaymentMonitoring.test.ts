import { renderHook, act } from '@testing-library/react';
import { usePaymentMonitoring } from './usePaymentMonitoring';

// Mock shared functions
jest.mock('pi-kiosk-shared', () => ({
  createAPIClient: jest.fn(),
  useErrorHandler: jest.fn(),
  API_ENDPOINTS: {
    PAYMENT_START_MONITORING: '/api/payments/start-monitoring',
    PAYMENT_CHECK_STATUS: '/api/payments/check-status/:paymentId',
  },
  TransactionStatus: {
    COMPLETED: 'COMPLETED',
    TIMEOUT: 'TIMEOUT',
    FAILED: 'FAILED',
  },
  PaymentData: {},
  MultiProductPaymentData: {},
}));

import { createAPIClient, useErrorHandler } from 'pi-kiosk-shared';

const mockCreateAPIClient = createAPIClient as jest.MockedFunction<typeof createAPIClient>;
const mockUseErrorHandler = useErrorHandler as jest.MockedFunction<typeof useErrorHandler>;

const mockAPIClient = {
  post: jest.fn().mockResolvedValue({ success: true }),
  get: jest.fn().mockResolvedValue({ success: true, data: { status: 'PENDING' } }),
};

const mockHandleError = jest.fn();

describe('usePaymentMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCreateAPIClient.mockReturnValue(mockAPIClient as any);
    mockUseErrorHandler.mockReturnValue({
      handleError: mockHandleError,
      error: null,
      errorMessage: '',
      isErrorVisible: false,
      clearError: jest.fn(),
      retryAction: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => usePaymentMonitoring());

    expect(result.current).toBeDefined();
    expect(result.current).not.toBeNull();
    expect(typeof result.current.startMonitoring).toBe('function');
    expect(typeof result.current.stopMonitoring).toBe('function');
  });

  it('starts SSE monitoring when SSE is connected', async () => {
    const mockResponse = {
      success: true,
      message: 'Monitoring started',
    };

    mockAPIClient.post.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => usePaymentMonitoring());
    expect(result.current).not.toBeNull();

    const onPaymentComplete = jest.fn();
    const onPaymentTimeout = jest.fn();
    const onPaymentFailed = jest.fn();

    await act(async () => {
      await result.current.startMonitoring(
        'test-payment-id',
        true, // SSE connected
        onPaymentComplete,
        onPaymentTimeout,
        onPaymentFailed
      );
    });

    expect(mockAPIClient.post).toHaveBeenCalledWith('/api/payments/start-monitoring', {
      paymentId: 'test-payment-id',
    });

    expect(onPaymentComplete).not.toHaveBeenCalled();
    expect(onPaymentTimeout).not.toHaveBeenCalled();
    expect(onPaymentFailed).not.toHaveBeenCalled();
  });

  it('falls back to polling when SSE is not connected', async () => {
    const { result } = renderHook(() => usePaymentMonitoring());
    expect(result.current).not.toBeNull();

    const onPaymentComplete = jest.fn();
    const onPaymentTimeout = jest.fn();
    const onPaymentFailed = jest.fn();

    await act(async () => {
      await result.current.startMonitoring(
        'test-payment-id',
        false, // SSE not connected
        onPaymentComplete,
        onPaymentTimeout,
        onPaymentFailed
      );
    });

    // Should not call SSE endpoint
    expect(mockAPIClient.post).not.toHaveBeenCalled();

    // Should start polling (we can't easily test the interval without waiting)
    expect(result.current).toBeDefined();
  });

  it('falls back to polling when SSE monitoring fails', async () => {
    const mockResponse = {
      success: false,
      message: 'SSE monitoring failed',
    };

    mockAPIClient.post.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => usePaymentMonitoring());
    expect(result.current).not.toBeNull();

    const onPaymentComplete = jest.fn();
    const onPaymentTimeout = jest.fn();
    const onPaymentFailed = jest.fn();

    await act(async () => {
      await result.current.startMonitoring(
        'test-payment-id',
        true, // SSE connected
        onPaymentComplete,
        onPaymentTimeout,
        onPaymentFailed
      );
    });

    expect(mockAPIClient.post).toHaveBeenCalledWith('/api/payments/start-monitoring', {
      paymentId: 'test-payment-id',
    });

    // Should fall back to polling
    expect(result.current).toBeDefined();
  });

  it('handles polling timeout correctly', async () => {
    const { result } = renderHook(() => usePaymentMonitoring());
    expect(result.current).not.toBeNull();

    const onPaymentComplete = jest.fn();
    const onPaymentTimeout = jest.fn();
    const onPaymentFailed = jest.fn();

    // Start monitoring with polling fallback
    await act(async () => {
      await result.current.startMonitoring(
        'test-payment-id',
        false, // SSE not connected
        onPaymentComplete,
        onPaymentTimeout,
        onPaymentFailed
      );
    });

    // Fast-forward time to trigger timeout (5 minutes = 300000ms)
    act(() => {
      jest.advanceTimersByTime(300000);
    });

    // Wait for async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(onPaymentTimeout).toHaveBeenCalledWith({
      paymentId: 'test-payment-id',
      amount: 0,
      totalAmount: 0,
      customerEmail: '',
      qrCode: '',
      items: [],
      status: 'TIMEOUT',
    });
  }, 30000);

  it('handles polling success correctly', async () => {
    const mockResponse = {
      success: true,
      data: {
        status: 'COMPLETED',
        amount: 100,
        customerEmail: 'test@example.com',
        qrCode: 'test-qr',
        items: [{ id: 1, quantity: 2 }],
      },
    };

    mockAPIClient.get.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => usePaymentMonitoring());
    expect(result.current).not.toBeNull();

    const onPaymentComplete = jest.fn();
    const onPaymentTimeout = jest.fn();
    const onPaymentFailed = jest.fn();

    // Start monitoring with polling fallback
    await act(async () => {
      await result.current.startMonitoring(
        'test-payment-id',
        false, // SSE not connected
        onPaymentComplete,
        onPaymentTimeout,
        onPaymentFailed
      );
    });

    // Fast-forward time to trigger polling
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Wait for async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockAPIClient.get).toHaveBeenCalledWith('/api/payments/check-status/test-payment-id');
    expect(onPaymentComplete).toHaveBeenCalledWith({
      paymentId: 'test-payment-id',
      amount: 100,
      totalAmount: 100,
      customerEmail: 'test@example.com',
      qrCode: 'test-qr',
      items: [{ id: 1, quantity: 2 }],
      status: 'COMPLETED',
    });
  });

  it('stops monitoring correctly', () => {
    const { result } = renderHook(() => usePaymentMonitoring());
    expect(result.current).not.toBeNull();

    act(() => {
      result.current.stopMonitoring();
    });

    // Should not throw any errors
    expect(result.current).toBeDefined();
  });

  it('handles polling errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAPIClient.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => usePaymentMonitoring());
    expect(result.current).not.toBeNull();

    const onPaymentComplete = jest.fn();
    const onPaymentTimeout = jest.fn();
    const onPaymentFailed = jest.fn();

    // Start monitoring with polling fallback
    await act(async () => {
      await result.current.startMonitoring(
        'test-payment-id',
        false, // SSE not connected
        onPaymentComplete,
        onPaymentTimeout,
        onPaymentFailed
      );
    });

    // Fast-forward time to trigger polling
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Wait for async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(consoleSpy).toHaveBeenCalledWith('❌ Polling fallback error:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
