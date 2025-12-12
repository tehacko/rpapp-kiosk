import { useEffect } from 'react';

interface PreloadOptions {
  totalItems: number;
  currentScreen: 'products' | 'payment' | 'confirmation';
  paymentStep: number;
  selectedPaymentMethod: 'qr' | 'thepay' | undefined;
}

export function usePreloadScreens({
  totalItems,
  currentScreen,
  paymentStep,
  selectedPaymentMethod,
}: PreloadOptions): void {
  useEffect(() => {
    if (totalItems > 0 && currentScreen === 'products') {
      void import('../../payment/components/PaymentScreen/PaymentScreen');
      void import('../../payment/components/QRDisplay/QRDisplay');
      void import('../../payment/components/ThePayPayment/ThePayPayment');
    }
  }, [totalItems, currentScreen]);

  useEffect(() => {
    if (paymentStep === 5 && currentScreen === 'payment') {
      void import('../../payment/components/ConfirmationScreen/ConfirmationScreen');
    }
  }, [paymentStep, currentScreen]);

  useEffect(() => {
    if (selectedPaymentMethod === 'qr' && currentScreen === 'payment' && paymentStep >= 3) {
      void import('../../payment/components/QRDisplay/QRDisplay');
    }
  }, [selectedPaymentMethod, currentScreen, paymentStep]);

  useEffect(() => {
    if (selectedPaymentMethod === 'thepay' && currentScreen === 'payment' && paymentStep >= 3) {
      void import('../../payment/components/ThePayPayment/ThePayPayment');
    }
  }, [selectedPaymentMethod, currentScreen, paymentStep]);
}
