import React, { useState } from 'react';
import { 
  Cart,
  UI_MESSAGES,
  CSS_CLASSES,
  formatPrice
} from 'pi-kiosk-shared';

interface PaymentFormProps {
  cart: Cart;
  onSubmit: (email: string, paymentMethod: 'qr' | 'stripe') => void;
  isGeneratingQR: boolean;
  currentStep: number;
  email: string;
  onEmailChange: (email: string) => void;
  onStepChange: (step: number) => void;
}

export function PaymentForm({ cart, onSubmit, isGeneratingQR, currentStep, email, onEmailChange, onStepChange }: PaymentFormProps) {
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

  const handlePaymentMethodSubmit = (paymentMethod: 'qr' | 'stripe') => {
    onStepChange(4); // Move to processing step
    onSubmit(email.trim(), paymentMethod);
  };

  return (
    <div className="payment-form-container">
      {/* Error Overlay */}
      {showErrorOverlay && (
        <div className="error-overlay">
          <div className="error-overlay-content">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Neplatný email</h3>
            <p className="error-message-text">
              Zadejte prosím platnou emailovou adresu pro pokračování v platbě.
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
              onClick={() => handlePaymentMethodSubmit('stripe')}
              className={`payment-method-btn stripe-btn ${CSS_CLASSES.BUTTON_SECONDARY}`}
              disabled={isGeneratingQR}
            >
              <span aria-hidden="true">💳</span>
              Stripe
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Processing */}
      {currentStep === 4 && (
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