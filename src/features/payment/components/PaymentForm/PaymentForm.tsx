import { useEffect } from 'react';
import type { Cart, Cart as CartType } from 'pi-kiosk-shared';
import type { ProviderStatus } from '../../hooks/usePaymentProviderStatus';
import { CartSummary, EmailInputForm, PaymentMethodSelector, ProcessingIndicator } from './components';
import { useEmailValidation } from './hooks';
import styles from './PaymentForm.module.css';

interface PaymentFormProps {
  cart: Cart;
  onSubmit: (cart: CartType, email: string, paymentMethod: 'qr' | 'thepay') => Promise<void>;
  isGeneratingQR: boolean;
  currentStep: number;
  email: string;
  onEmailChange: (email: string) => void;
  onStepChange: (step: number) => void;
  selectedPaymentMethod?: 'qr' | 'thepay';
  onPaymentMethodSelect?: (method: 'qr' | 'thepay') => void;
  /** Provider status for QR payments (from usePaymentProviderStatus) */
  qrProviderStatus?: ProviderStatus | null;
  /** Provider status for ThePay payments (from usePaymentProviderStatus) */
  thepayProviderStatus?: ProviderStatus | null;
}

export function PaymentForm({ 
  cart, 
  onSubmit, 
  isGeneratingQR, 
  currentStep, 
  email, 
  onEmailChange, 
  onStepChange: _onStepChange, 
  selectedPaymentMethod: _selectedPaymentMethod, 
  onPaymentMethodSelect,
  qrProviderStatus,
  thepayProviderStatus
}: PaymentFormProps): JSX.Element {
  const { error: emailError, validateEmail, clearError } = useEmailValidation();

  // Listen for email validation errors from parent (backward compatibility)
  useEffect(() => {
    const handleValidationError = (_event: CustomEvent): void => {
      // This is handled by the parent via usePaymentFlow hook
      // We keep this for backward compatibility but prefer prop-based validation
    };

    window.addEventListener('payment-email-validation-error', handleValidationError as EventListener);
    return (): void => {
      window.removeEventListener('payment-email-validation-error', handleValidationError as EventListener);
    };
  }, []);

  const handlePaymentMethodSelect = (paymentMethod: 'qr' | 'thepay'): void => {
    // Validate email before submitting payment
    if (!validateEmail(email)) {
      return;
    }

    if (onPaymentMethodSelect) {
      onPaymentMethodSelect(paymentMethod);
    }
    
    // Directly call onSubmit to skip step 4 (confirmation screen)
    console.info('PaymentForm: calling onSubmit directly with', { email: email.trim(), paymentMethod });
    void onSubmit(cart, email.trim(), paymentMethod);
  };

  return (
    <div className={styles.paymentFormContainer}>
      {/* Step 1: Cart Display */}
      {currentStep === 1 && <CartSummary cart={cart} />}

      {/* Step 2: Email Input */}
      {currentStep === 2 && (
        <EmailInputForm
          email={email}
          error={emailError ?? undefined}
          onEmailChange={onEmailChange}
          onErrorClear={clearError}
        />
      )}

      {/* Step 3: Payment Method Selection */}
      {currentStep === 3 && (
        <PaymentMethodSelector
          isGeneratingQR={isGeneratingQR}
          onPaymentMethodSelect={handlePaymentMethodSelect}
          qrProviderStatus={qrProviderStatus}
          thepayProviderStatus={thepayProviderStatus}
        />
      )}

      {/* Step 5: Processing */}
      {currentStep === 5 && <ProcessingIndicator isGeneratingQR={isGeneratingQR} />}
    </div>
  );
}