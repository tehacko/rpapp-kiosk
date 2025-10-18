import { renderHook, act } from '@testing-library/react';
import { usePaymentNavigation } from './usePaymentNavigation';

describe('usePaymentNavigation', () => {
  it('initializes with correct default state', () => {
    const { result } = renderHook(() => usePaymentNavigation());

    expect(result.current.currentScreen).toBe('products');
    expect(result.current.paymentStep).toBe(1);
    expect(typeof result.current.goToPayment).toBe('function');
    expect(typeof result.current.goToProducts).toBe('function');
    expect(typeof result.current.goToConfirmation).toBe('function');
    expect(typeof result.current.setPaymentStep).toBe('function');
  });

  it('navigates to payment screen', () => {
    const { result } = renderHook(() => usePaymentNavigation());

    act(() => {
      result.current.goToPayment();
    });

    expect(result.current.currentScreen).toBe('payment');
    expect(result.current.paymentStep).toBe(1);
  });

  it('navigates to products screen', () => {
    const { result } = renderHook(() => usePaymentNavigation());

    // First go to payment
    act(() => {
      result.current.goToPayment();
    });

    expect(result.current.currentScreen).toBe('payment');

    // Then go back to products
    act(() => {
      result.current.goToProducts();
    });

    expect(result.current.currentScreen).toBe('products');
    expect(result.current.paymentStep).toBe(1);
  });

  it('navigates to confirmation screen', () => {
    const { result } = renderHook(() => usePaymentNavigation());
    const mockPaymentData = {
      paymentId: 'test-123',
      amount: 100,
      totalAmount: 100,
      customerEmail: 'test@example.com',
      qrCode: 'test-qr',
      items: []
    };

    act(() => {
      result.current.goToConfirmation(mockPaymentData);
    });

    expect(result.current.currentScreen).toBe('confirmation');
    expect(result.current.paymentStep).toBe(1);
  });

  it('updates payment step', () => {
    const { result } = renderHook(() => usePaymentNavigation());

    act(() => {
      result.current.setPaymentStep(3);
    });

    expect(result.current.paymentStep).toBe(3);
  });

  it('maintains screen when updating payment step', () => {
    const { result } = renderHook(() => usePaymentNavigation());

    // Go to payment first
    act(() => {
      result.current.goToPayment();
    });

    expect(result.current.currentScreen).toBe('payment');

    // Update payment step
    act(() => {
      result.current.setPaymentStep(2);
    });

    expect(result.current.currentScreen).toBe('payment');
    expect(result.current.paymentStep).toBe(2);
  });
});
