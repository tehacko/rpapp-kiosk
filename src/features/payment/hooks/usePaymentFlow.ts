import { useCallback, useState } from 'react';

type PaymentMethod = 'qr' | 'thepay' | undefined;

interface PaymentFlowOptions {
  paymentStep: number;
  setPaymentStep: (step: number) => void;
  email: string;
  setEmail: (email: string) => void;
  selectedPaymentMethod: PaymentMethod;
  setSelectedPaymentMethod: (method: PaymentMethod) => void;
  onValidateEmail: (email: string) => string | null;
  onEmptyCartError: () => void;
}

export interface PaymentFlowState {
  validationError: string | null;
}

interface PaymentFlowHandlers {
  handleNext: () => void;
  handleBack: (isCartEmpty: boolean, onClearCart: () => void, onGoToProducts: () => void) => void;
  ensurePaymentMethodSelected: (method: PaymentMethod) => boolean;
}

export function usePaymentFlow({
  paymentStep,
  setPaymentStep,
  email,
  setEmail: _setEmail,
  selectedPaymentMethod: _selectedPaymentMethod,
  setSelectedPaymentMethod: _setSelectedPaymentMethod,
  onValidateEmail,
  onEmptyCartError,
}: PaymentFlowOptions): [PaymentFlowState, PaymentFlowHandlers] {
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleNext = useCallback((): void => {
    console.info('🟢 usePaymentFlow.handleNext called', { paymentStep, email });
    if (paymentStep === 2) {
      console.info('📧 Validating email on step 2');
      const error = onValidateEmail(email);
      if (error) {
        console.warn('❌ Email validation failed:', error);
        setValidationError(error);
        window.dispatchEvent(new CustomEvent('payment-email-validation-error', {
          detail: { error }
        }));
        return;
      }
      console.info('✅ Email validation passed');
      setValidationError(null);
    }
    console.info(`➡️ Moving from step ${paymentStep} to step ${paymentStep + 1}`);
    setPaymentStep(paymentStep + 1);
  }, [paymentStep, email, onValidateEmail, setPaymentStep]);

  const handleBack = useCallback((_isCartEmpty: boolean, _onClearCart: () => void, onGoToProducts: () => void) => {
    if (paymentStep === 1) {
      // Go back to products screen but preserve cart (user might want to add more items)
      // Cart is only cleared when explicitly requested (e.g., "Clear Cart" button)
      onGoToProducts();
      setPaymentStep(1);
      return;
    }
    setPaymentStep(paymentStep - 1);
  }, [paymentStep, setPaymentStep]);

  const ensurePaymentMethodSelected = useCallback((method: PaymentMethod) => {
    if (!method) {
      onEmptyCartError();
      return false;
    }
    return true;
  }, [onEmptyCartError]);

  return [
    {
      validationError,
    },
    {
      handleNext,
      handleBack,
      ensurePaymentMethodSelected,
    }
  ];
}
