import React, { useState } from 'react';
import { 
  Cart, 
  Cart as CartType,
  UI_MESSAGES, 
  CSS_CLASSES, 
  formatPrice
} from 'pi-kiosk-shared';
import type { ProviderStatus } from '../../hooks/usePaymentProviderStatus';
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
}: PaymentFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Listen for email validation errors from parent
  React.useEffect(() => {
    const handleValidationError = (event: CustomEvent) => {
      setErrors({ email: event.detail.error });
    };

    window.addEventListener('payment-email-validation-error', handleValidationError as EventListener);
    return () => {
      window.removeEventListener('payment-email-validation-error', handleValidationError as EventListener);
    };
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onEmailChange(value);

    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This form submission is now handled by the header button
  };

  const handlePaymentMethodSubmit = (paymentMethod: 'qr' | 'thepay') => {
    // Validate email before submitting payment
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrors({ email: 'Email je povinný' });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrors({ email: 'Neplatný formát emailu' });
      return;
    }

    // Clear any errors
    setErrors({});

    if (onPaymentMethodSelect) {
      onPaymentMethodSelect(paymentMethod);
    }
    
    // Directly call onSubmit to skip step 4 (confirmation screen)
    console.log('PaymentForm: calling onSubmit directly with', { email: trimmedEmail, paymentMethod });
    onSubmit(cart, trimmedEmail, paymentMethod);
  };

  return (
    <div className={styles.paymentFormContainer}>
      {/* Cart Display - Only shown on step 1 (cart approval) */}
      {currentStep === 1 && cart && cart.items.length > 0 && (
        <div className={`${styles.cartSummary} ${CSS_CLASSES.CARD} ${
          cart.items.length === 1 ? styles.size1 :
          cart.items.length === 2 ? styles.size2 :
          cart.items.length === 3 ? styles.size3 :
          ''
        }`}>
          <h2>🛒 Košík ({cart.totalItems} položek)</h2>
          <div className={`${styles.cartItemsSummary} ${
            cart.items.length === 1 ? styles.size1 :
            cart.items.length === 2 ? styles.size2 :
            cart.items.length === 3 ? styles.size3 :
            ''
          }`}>
            {[...cart.items]
              .sort((a, b) => (b.product.price * b.quantity) - (a.product.price * a.quantity))
              .map((item) => (
              <div key={item.product.id} className={styles.cartItemSummary}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>
                    <span className={styles.itemQuantity}>{item.quantity}×</span>
                    <span>{item.product.name}</span>
                  </span>
                </div>
                <div className={styles.itemPrice}>
                  {formatPrice(item.product.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Cart Approval - no stepContent needed, cart is shown above */}

      {/* Step 2: Email Input */}
      {currentStep === 2 && (
        <div className={styles.stepContent}>
          <form className={styles.paymentForm} onSubmit={handleEmailSubmit} noValidate>
            <div className={styles.formGroup}>
              <label htmlFor="customer-email" className={styles.formLabel}>
                {UI_MESSAGES.EMAIL_LABEL}
                <span className="required-indicator" aria-label="Required">*</span>
              </label>
              <input
                type="email"
                id="customer-email"
                name="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="vas@email.cz"
                required
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={`${CSS_CLASSES.INPUT} ${styles.emailInput} ${errors.email ? CSS_CLASSES.ERROR : ''}`}
                autoComplete="email"
              />
              {errors.email && (
                <span 
                  id="email-error" 
                  className={styles.errorMessage} 
                  role="alert"
                  aria-live="polite"
                >
                  {errors.email}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Payment Method Selection */}
      {currentStep === 3 && (
        <div className={styles.stepContent}>
          <div className={styles.paymentMethods}>
            <h3 className={styles.paymentMethodsTitle}>Vyberte způsob platby:</h3>
            
            {/* QR Payment Button */}
            <div className={styles.paymentMethodWrapper}>
            <button 
              type="button"
              onClick={() => handlePaymentMethodSubmit('qr')}
                className={`${styles.paymentMethodBtn} ${styles.qrBtn} ${CSS_CLASSES.BUTTON_PRIMARY} ${qrProviderStatus && !qrProviderStatus.available ? styles.unavailable : ''}`}
                disabled={isGeneratingQR || (qrProviderStatus !== null && qrProviderStatus !== undefined && !qrProviderStatus.available)}
                aria-disabled={qrProviderStatus !== null && qrProviderStatus !== undefined && !qrProviderStatus.available}
            >
              <span aria-hidden="true">📱</span>
              QR kód
            </button>
              {qrProviderStatus && !qrProviderStatus.available && (
                <span className={styles.unavailableHint} role="status">
                  Dočasně nedostupné
                </span>
              )}
            </div>
            
            {/* ThePay Button */}
            <div className={styles.paymentMethodWrapper}>
            <button 
              type="button"
              onClick={() => handlePaymentMethodSubmit('thepay')}
                className={`${styles.paymentMethodBtn} ${styles.thepayBtn} ${CSS_CLASSES.BUTTON_SECONDARY} ${thepayProviderStatus && !thepayProviderStatus.available ? styles.unavailable : ''}`}
                disabled={isGeneratingQR || (thepayProviderStatus !== null && thepayProviderStatus !== undefined && !thepayProviderStatus.available)}
                aria-disabled={thepayProviderStatus !== null && thepayProviderStatus !== undefined && !thepayProviderStatus.available}
            >
              <span aria-hidden="true">💳</span>
              ThePay
            </button>
              {thepayProviderStatus && !thepayProviderStatus.available && (
                <span className={styles.unavailableHint} role="status">
                  Dočasně nedostupné
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Processing */}
      {currentStep === 5 && (
        <div className={styles.stepContent}>
          <div className={styles.processingMessage}>
            {isGeneratingQR ? (
              <>
                <div className={styles.processingSpinner} aria-hidden="true"></div>
                <div>Generuji QR kód...</div>
              </>
            ) : (
              <div>Zpracovávám platbu...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}