/**
 * useProducts Hook Tests - Refactored with proper mocking
 * Tests products hook functionality with consistent mocking patterns
 */
import { renderHook, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { useProducts } from './useProducts';
import { createAPIClient } from 'pi-kiosk-shared';
import {
  testDataSets
} from '../../../__tests__/utils/testData';

// Mock the shared package
jest.mock('pi-kiosk-shared', () => ({
  createAPIClient: jest.fn(),
  getKioskIdFromUrl: jest.fn(() => 1),
  getKioskSecretFromUrl: jest.fn(() => null),
  useErrorHandler: jest.fn(() => ({
    handleError: jest.fn(),
    retryAction: jest.fn()
  })),
  UI_MESSAGES: {
    LOADING_PRODUCTS: 'Načítání produktů...',
    NO_PRODUCTS: 'Žádné produkty nejsou k dispozici'
  },
  CSS_CLASSES: {
    LOADING: 'loading',
    ERROR: 'error'
  },
  APP_CONFIG: {
    apiUrl: 'http://localhost:3015',
    wsUrl: 'ws://localhost:3015',
    PAYMENT_ACCOUNT_NUMBER: '1234567890',
    PAYMENT_CURRENCY: 'CZK',
    QR_CODE_WIDTH: 300,
    QR_CODE_FORMAT: 'SPD*1.0',
    PAYMENT_POLLING_INTERVAL: 3000,
    PRODUCT_CACHE_TTL: 300000 // 5 minutes
  }
}));

// Mock SWR
jest.mock('swr', () => {
  const mockSWR = jest.fn();
  return {
    __esModule: true,
    default: mockSWR
  };
});

// Use test data factories
const mockProducts = testDataSets.basicProducts.map((product: any) => ({
  ...product,
  clickedOn: product.clickedOn,
  qrCodesGenerated: 0,
  numberOfPurchases: product.numberOfPurchases,
  kioskClickedOn: product.clickedOn,
  kioskNumberOfPurchases: product.numberOfPurchases
}));

const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  request: jest.fn()
} as any;

describe('useProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createAPIClient as jest.Mock).mockReturnValue(mockApiClient);
  });

  it('returns default values when no data', () => {
    const mockSWR = require('swr').default;
    mockSWR.mockReturnValue({
      data: undefined,
      error: null,
      mutate: jest.fn(),
      isLoading: false,
      isValidating: false
    });

    const { result } = renderHook(() => useProducts());

    expect(result.current.products).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.hasProducts).toBe(false);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('returns products when data is available', () => {
    const mockSWR = require('swr').default;
    const mockMutate = jest.fn();
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: mockMutate,
      isLoading: false,
      isValidating: false
    });

    const { result } = renderHook(() => useProducts());

    expect(result.current.products).toEqual(mockProducts);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.hasProducts).toBe(true);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('handles loading state', () => {
    const mockSWR = require('swr').default;
    mockSWR.mockReturnValue({
      data: undefined,
      error: null,
      mutate: jest.fn(),
      isLoading: true,
      isValidating: false
    });

    const { result } = renderHook(() => useProducts());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.products).toEqual([]);
  });

  it('handles error state', () => {
    const mockSWR = require('swr').default;
    const mockError = new Error('Failed to fetch products');
    mockSWR.mockReturnValue({
      data: undefined,
      error: mockError,
      mutate: jest.fn(),
      isLoading: false,
      isValidating: false
    });

    const { result } = renderHook(() => useProducts());

    expect(result.current.error).toBe(mockError);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.hasError).toBe(true);
  });

  it('handles validating state', () => {
    const mockSWR = require('swr').default;
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: jest.fn(),
      isLoading: false,
      isValidating: true
    });

    const { result } = renderHook(() => useProducts());

    expect(result.current.isValidating).toBe(true);
    expect(result.current.products).toEqual(mockProducts);
  });

  it('calls trackProductClick correctly', async () => {
    const mockSWR = require('swr').default;
    const mockMutate = jest.fn();
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: mockMutate,
      isLoading: false,
      isValidating: false
    });

    mockApiClient.post.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await result.current.trackProductClick(1);
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/products/1/click', { kioskId: 1 });
  });

  it('handles trackProductClick error gracefully', async () => {
    const mockSWR = require('swr').default;
    const mockMutate = jest.fn();
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: mockMutate,
      isLoading: false,
      isValidating: false
    });

    mockApiClient.post.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await result.current.trackProductClick(1);
    });

    // Should not throw, just log error
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/products/1/click', { kioskId: 1 });
  });

  it('calls refresh correctly', () => {
    const mockSWR = require('swr').default;
    const mockMutate = jest.fn();
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: mockMutate,
      isLoading: false,
      isValidating: false
    });

    const { result } = renderHook(() => useProducts());

    act(() => {
      result.current.refresh();
    });

    expect(mockMutate).toHaveBeenCalled();
  });

  it('calls revalidate correctly', () => {
    const mockSWR = require('swr').default;
    const mockMutate = jest.fn();
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: mockMutate,
      isLoading: false,
      isValidating: false
    });

    const { result } = renderHook(() => useProducts());

    act(() => {
      result.current.revalidate();
    });

    expect(mockMutate).toHaveBeenCalledWith(undefined, { revalidate: true });
  });

  it('handles WebSocket messages correctly', () => {
    const mockSWR = require('swr').default;
    const mockMutate = jest.fn();
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: mockMutate,
      isLoading: false,
      isValidating: false
    });

    renderHook(() => useProducts());

    // Simulate WebSocket message
    act(() => {
      const event = new CustomEvent('websocket-message', {
        detail: {
          data: JSON.stringify({
            type: 'product_update',
            updateType: 'inventory_updated'
          })
        }
      });
      window.dispatchEvent(event);
    });

    expect(mockMutate).toHaveBeenCalledWith(undefined, { revalidate: true });
  });

  it('handles admin refresh requests', () => {
    const mockSWR = require('swr').default;
    const mockMutate = jest.fn();
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: mockMutate,
      isLoading: false,
      isValidating: false
    });

    renderHook(() => useProducts());

    // Simulate admin refresh request
    act(() => {
      const event = new CustomEvent('admin-refresh-requested');
      window.dispatchEvent(event);
    });

    expect(mockMutate).toHaveBeenCalledWith(undefined, { revalidate: true });
  });

  it('handles force refresh requests', () => {
    const mockSWR = require('swr').default;
    const mockMutate = jest.fn();
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: mockMutate,
      isLoading: false,
      isValidating: false
    });

    renderHook(() => useProducts());

    // Simulate force refresh request
    act(() => {
      const event = new CustomEvent('force-refresh');
      window.dispatchEvent(event);
    });

    expect(mockMutate).toHaveBeenCalledWith(undefined, { revalidate: true });
  });

  it('uses custom kiosk ID when provided', () => {
    const mockSWR = require('swr').default;
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: jest.fn(),
      isLoading: false,
      isValidating: false
    });

    renderHook(() => useProducts({ kioskId: 5 }));

    expect(mockSWR).toHaveBeenCalledWith(
      '/api/products?kioskId=5',
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('uses custom API client when provided', () => {
    const customApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn()
    } as any;

    const mockSWR = require('swr').default;
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: jest.fn(),
      isLoading: false,
      isValidating: false
    });

    renderHook(() => useProducts({ apiClient: customApiClient }));

    // The custom API client should be used in the fetcher function
    expect(mockSWR).toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const mockSWR = require('swr').default;
    const mockMutate = jest.fn();
    mockSWR.mockReturnValue({
      data: mockProducts,
      error: null,
      mutate: mockMutate,
      isLoading: false,
      isValidating: false
    });

    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useProducts());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('websocket-message', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('admin-refresh-requested', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('force-refresh', expect.any(Function));
  });
});
