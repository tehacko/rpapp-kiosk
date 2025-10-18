import { useState, useCallback } from 'react';
import { PaymentData, MultiProductPaymentData, Cart as CartType } from 'pi-kiosk-shared';

export function usePaymentState() {
  const [email, setEmail] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'qr' | 'thepay' | undefined>(undefined);
  const [paymentData, setPaymentData] = useState<PaymentData | MultiProductPaymentData | null>(null);

  const handlePaymentSubmit = useCallback(
    async (_cart: CartType, customerEmail: string, paymentMethod: 'qr' | 'thepay') => {
      setEmail(customerEmail);
      setSelectedPaymentMethod(paymentMethod);
      // The actual payment initiation (QR generation or ThePay redirect) will be handled by the orchestrator
    },
    []
  );

  const resetPaymentState = useCallback(() => {
    setEmail('');
    setSelectedPaymentMethod(undefined);
    setPaymentData(null);
  }, []);

  return {
    email,
    selectedPaymentMethod,
    paymentData,
    setEmail,
    setSelectedPaymentMethod,
    setPaymentData,
    handlePaymentSubmit,
    resetPaymentState,
  };
}
