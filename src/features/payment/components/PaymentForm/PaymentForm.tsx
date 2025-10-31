import React, { useState } from 'react';
import { 
  Cart, 
  Cart as CartType,
  UI_MESSAGES, 
  CSS_CLASSES, 
  formatPrice
} from 'pi-kiosk-shared';

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
}

export function PaymentForm({ cart, onSubmit, isGeneratingQR, currentStep, email, onEmailChange, onStepChange, selectedPaymentMethod, onPaymentMethodSelect }: PaymentFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);

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

  const handleCloseError = () => {
    setShowErrorOverlay(false);
    setErrors({});
  };

  const handlePaymentMethodSubmit = (paymentMethod: 'qr' | 'thepay') => {
    if (onPaymentMethodSelect) {
      onPaymentMethodSelect(paymentMethod);
    }
    onStepChange(4); // Move to payment processing step
  };

  const handleConfirmPayment = () => {
    console.log('PaymentForm: handleConfirmPayment called', { selectedPaymentMethod, email: email.trim() });
    
    // Validate email before submitting
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrors({ email: 'Email je povinný' });
      setShowErrorOverlay(true);
      console.log('PaymentForm: email is empty, showing error');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrors({ email: 'Neplatný formát emailu' });
      setShowErrorOverlay(true);
      console.log('PaymentForm: invalid email format, showing error');
      return;
    }
    
    if (selectedPaymentMethod) {
      console.log('PaymentForm: calling onSubmit with', { email: trimmedEmail, selectedPaymentMethod });
      onSubmit(cart, trimmedEmail, selectedPaymentMethod);
    } else {
      console.log('PaymentForm: no selectedPaymentMethod, not calling onSubmit');
    }
  };

  return (
    <div className="payment-form-container">
      {/* Error Overlay */}
      {showErrorOverlay && (
        <div className="error-overlay">
          <div className="error-overlay-content">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Chyba při zadávání emailu</h3>
            <p className="error-message-text">
              {errors.email || 'Zadejte prosím platnou emailovou adresu pro pokračování v platbě.'}
            </p>
            <button 
              onClick={handleCloseError}
              className="error-ok-btn"
              type="button"
            >
              OK
            </button>
          </div>
        </div>
      )}
      
      {/* Cart Display - Only shown on step 1 (cart approval) */}
      {currentStep === 1 && cart && cart.items.length > 0 && (
        <div className={`cart-summary ${CSS_CLASSES.CARD}`}>
          <h2>🛒 Košík ({cart.totalItems} položek)</h2>
          <div className="cart-items-summary">
            {cart.items.map((item) => (
              <div key={item.product.id} className="cart-item-summary">
                <div className="item-info">
                  <span className="item-name">{item.product.name} × {item.quantity}</span>
                </div>
                <div className="item-price">
                  {formatPrice(item.product.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
          <div className="cart-total">
            <strong>Celkem: {formatPrice(cart.totalAmount)}</strong>
          </div>
        </div>
      )}

      {/* Step 1: Cart Approval */}
      {currentStep === 1 && (
        <div className="step-content">
          {/* Cart list is shown above */}
        </div>
      )}

      {/* Step 2: Email Input */}
      {currentStep === 2 && (
        <div className="step-content">
          <form className="payment-form" onSubmit={handleEmailSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="customer-email" className="form-label">
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
                className={`${CSS_CLASSES.INPUT} email-input ${errors.email ? CSS_CLASSES.ERROR : ''}`}
                autoComplete="email"
              />
              {errors.email && (
                <span 
                  id="email-error" 
                  className="error-message" 
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
        <div className="step-content">
          <div className="payment-methods">
            <h3 className="payment-methods-title">Vyberte způsob platby:</h3>
            
            <button 
              type="button"
              onClick={() => handlePaymentMethodSubmit('qr')}
              className={`payment-method-btn qr-btn ${CSS_CLASSES.BUTTON_PRIMARY}`}
              disabled={isGeneratingQR}
            >
              <span aria-hidden="true">📱</span>
              QR kód
            </button>
            
            <button 
              type="button"
              onClick={() => handlePaymentMethodSubmit('thepay')}
              className={`payment-method-btn thepay-btn ${CSS_CLASSES.BUTTON_SECONDARY}`}
              disabled={isGeneratingQR}
            >
              <span aria-hidden="true">💳</span>
              ThePay
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Payment Processing Confirmation */}
      {currentStep === 4 && selectedPaymentMethod && (
        <div className="step-content">
          <div className="payment-confirmation">
            <h3 className="payment-confirmation-title">Potvrzení platby</h3>
            
            <div className="payment-details">
              <div className="payment-detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{email}</span>
              </div>
              <div className="payment-detail-row">
                <span className="detail-label">Způsob platby:</span>
                <span className="detail-value">
                  {selectedPaymentMethod === 'qr' ? '📱 QR kód' : '💳 ThePay'}
                </span>
              </div>
              <div className="payment-detail-row">
                <span className="detail-label">Částka:</span>
                <span className="detail-value">{formatPrice(cart.totalAmount)}</span>
              </div>
            </div>

            <div className="payment-actions">
              <button
                type="button"
                onClick={handleConfirmPayment}
                className={`confirm-payment-btn ${selectedPaymentMethod === 'qr' ? CSS_CLASSES.BUTTON_PRIMARY : CSS_CLASSES.BUTTON_SECONDARY}`}
                disabled={isGeneratingQR}
              >
                {selectedPaymentMethod === 'qr' ? 'Generovat QR kód' : 'Přejít k platbě ThePay'}
              </button>
              
              <button
                type="button"
                onClick={() => onStepChange(3)}
                className="back-to-methods-btn"
              >
                ← Zpět na výběr platby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Processing */}
      {currentStep === 5 && (
        <div className="step-content">
          <div className="processing-message">
            {isGeneratingQR ? (
              <>
                <div className="spinner" aria-hidden="true"></div>
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