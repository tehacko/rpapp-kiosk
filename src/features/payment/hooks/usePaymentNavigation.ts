import { useState, useCallback } from 'react';
import { ScreenType, PaymentData, MultiProductPaymentData } from 'pi-kiosk-shared';

interface PaymentNavigationState {
  currentScreen: ScreenType;
  paymentStep: number;
}

interface PaymentNavigationActions {
  goToPayment: () => void;
  goToProducts: () => void;
  goToConfirmation: (data: PaymentData | MultiProductPaymentData) => void;
  setPaymentStep: (step: number) => void;
}

export function usePaymentNavigation(): PaymentNavigationState & PaymentNavigationActions {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('products');
  const [paymentStep, setPaymentStep] = useState(1);

  const goToPayment = useCallback(() => {
    setCurrentScreen('payment');
    setPaymentStep(1);
  }, []);

  const goToProducts = useCallback(() => {
    setCurrentScreen('products');
    setPaymentStep(1);
  }, []);

  const goToConfirmation = useCallback((_data: PaymentData | MultiProductPaymentData) => {
    setCurrentScreen('confirmation');
    setPaymentStep(1);
  }, []);

  const setPaymentStepCallback = useCallback((step: number) => {
    setPaymentStep(step);
  }, []);

  return {
    currentScreen,
    paymentStep,
    goToPayment,
    goToProducts,
    goToConfirmation,
    setPaymentStep: setPaymentStepCallback
  };
}
