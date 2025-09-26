import React, { useState } from 'react';
import { 
  Product, 
  validateSchema, 
  validationSchemas, 
  useErrorHandler,
  UI_MESSAGES,
  CSS_CLASSES,
  formatPrice
} from 'pi-kiosk-shared';

interface PaymentFormProps {
  product: Product;
  onSubmit: (email: string) => void;
  isGeneratingQR: boolean;
}

export function PaymentForm({ product, onSubmit, isGeneratingQR }: PaymentFormProps) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { handleError } = useErrorHandler();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate using shared validation schema
      const validation = validateSchema({ email: email.trim() }, validationSchemas.customerEmail);
      
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }
      
      setErrors({});
      onSubmit(email.trim());
    } catch (error) {
      handleError(error as Error, 'PaymentForm.handleSubmit');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear errors when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  return (
    <div className="payment-form-container">
      <div className={`selected-product ${CSS_CLASSES.CARD}`}>
        <div className="product-image">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name}
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.parentElement?.querySelector('.image-fallback');
                if (fallback) {
                  fallback.textContent = product.image || '📦';
                  (fallback as HTMLElement).style.display = 'block';
                }
              }}
            />
          ) : (
            <span className="product-emoji" aria-hidden="true">
              {product.image || '📦'}
            </span>
          )}
          <span className="image-fallback" style={{ display: 'none' }} aria-hidden="true"></span>
        </div>
        
        <div className="product-details">
          <h2 className="product-name">{product.name}</h2>
          <p className="product-description">{product.description}</p>
          <div className="product-price" aria-label={`Price: ${formatPrice(product.price)}`}>
            {formatPrice(product.price)}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="payment-form" noValidate>
        <div className="form-group">
          <label htmlFor="customer-email" className="form-label">
            Váš email:
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
            disabled={isGeneratingQR}
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
        
        <button 
          type="submit" 
          className={`generate-qr-btn ${CSS_CLASSES.BUTTON_PRIMARY}`}
          disabled={isGeneratingQR}
          aria-describedby="submit-button-description"
        >
          {isGeneratingQR ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              <span className="sr-only">Generuji QR kód</span>
              {UI_MESSAGES.GENERATING_QR}
            </>
          ) : (
            <>
              <span aria-hidden="true">🏷️</span>
              Generovat QR kód
            </>
          )}
        </button>
        
        <div id="submit-button-description" className="sr-only">
          Stiskněte pro vygenerování QR kódu pro platbu
        </div>
      </form>
    </div>
  );
}
