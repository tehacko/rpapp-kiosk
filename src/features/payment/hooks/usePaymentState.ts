import { useState, useCallback } from 'react';
import type { PaymentData, MultiProductPaymentData, Cart as CartType } from 'pi-kiosk-shared';

export function usePaymentState(): {
  email: string;
  selectedPaymentMethod: 'qr' | 'thepay' | undefined;
  paymentData: PaymentData | MultiProductPaymentData | null;
  setEmail: (email: string) => void;
  setSelectedPaymentMethod: (method: 'qr' | 'thepay' | undefined) => void;
  setPaymentData: (data: PaymentData | MultiProductPaymentData | null) => void;
  handlePaymentSubmit: (cart: CartType, customerEmail: string, paymentMethod: 'qr' | 'thepay') => Promise<void>;
  resetPaymentState: () => void;
} {
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
