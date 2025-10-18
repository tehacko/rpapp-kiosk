import { renderHook, act } from '@testing-library/react';
import { usePaymentState } from './usePaymentState';

describe('usePaymentState', () => {
  it('initializes with correct default state', () => {
    const { result } = renderHook(() => usePaymentState());

    expect(result.current.email).toBe('');
    expect(result.current.selectedPaymentMethod).toBeUndefined();
    expect(result.current.paymentData).toBeNull();
    expect(typeof result.current.setEmail).toBe('function');
    expect(typeof result.current.setSelectedPaymentMethod).toBe('function');
    expect(typeof result.current.setPaymentData).toBe('function');
    expect(typeof result.current.handlePaymentSubmit).toBe('function');
    expect(typeof result.current.resetPaymentState).toBe('function');
  });

  it('updates email', () => {
    const { result } = renderHook(() => usePaymentState());

    act(() => {
      result.current.setEmail('test@example.com');
    });

    expect(result.current.email).toBe('test@example.com');
  });

  it('updates selected payment method', () => {
    const { result } = renderHook(() => usePaymentState());

    act(() => {
      result.current.setSelectedPaymentMethod('qr');
    });

    expect(result.current.selectedPaymentMethod).toBe('qr');

    act(() => {
      result.current.setSelectedPaymentMethod('thepay');
    });

    expect(result.current.selectedPaymentMethod).toBe('thepay');
  });

  it('updates payment data', () => {
    const { result } = renderHook(() => usePaymentState());
    const mockPaymentData = {
      paymentId: 'test-123',
      amount: 100,
      totalAmount: 100,
      customerEmail: 'test@example.com',
      qrCode: 'test-qr',
      items: []
    };

    act(() => {
      result.current.setPaymentData(mockPaymentData);
    });

    expect(result.current.paymentData).toEqual(mockPaymentData);
  });

  it('handles payment submit', () => {
    const { result } = renderHook(() => usePaymentState());
    const mockCart = {
      items: [],
      totalItems: 0,
      totalAmount: 0,
      kioskId: 1
    };

    act(() => {
      result.current.handlePaymentSubmit(mockCart, 'test@example.com', 'qr');
    });

    expect(result.current.email).toBe('test@example.com');
    expect(result.current.selectedPaymentMethod).toBe('qr');
  });

  it('resets payment state', () => {
    const { result } = renderHook(() => usePaymentState());
    const mockPaymentData = {
      paymentId: 'test-123',
      amount: 100,
      totalAmount: 100,
      customerEmail: 'test@example.com',
      qrCode: 'test-qr',
      items: []
    };

    // Set some state first
    act(() => {
      result.current.setEmail('test@example.com');
      result.current.setSelectedPaymentMethod('qr');
      result.current.setPaymentData(mockPaymentData);
    });

    expect(result.current.email).toBe('test@example.com');
    expect(result.current.selectedPaymentMethod).toBe('qr');
    expect(result.current.paymentData).toEqual(mockPaymentData);

    // Reset state
    act(() => {
      result.current.resetPaymentState();
    });

    expect(result.current.email).toBe('');
    expect(result.current.selectedPaymentMethod).toBeUndefined();
    expect(result.current.paymentData).toBeNull();
  });
});
