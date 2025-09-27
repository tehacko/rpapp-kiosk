// React import not needed with new JSX transform
import { PaymentData, UI_MESSAGES, CSS_CLASSES, formatPrice } from 'pi-kiosk-shared';

interface ConfirmationScreenProps {
  paymentData: PaymentData;
  onContinue: () => void;
}

export function ConfirmationScreen({ paymentData, onContinue }: ConfirmationScreenProps) {
  return (
    <div className={`confirmation-screen ${CSS_CLASSES.SCREEN}`}>
      <div className="success-icon" role="img" aria-label="Success">✅</div>
      <h2 className="confirmation-title">{UI_MESSAGES.PAYMENT_SUCCESS}</h2>
      
      <div className={`payment-details ${CSS_CLASSES.CARD}`}>
        <h3>Detaily platby</h3>
        <div className="detail-row">
          <span className="detail-label">Produkt:</span>
          <span className="detail-value">{paymentData.productName}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Částka:</span>
          <span className="detail-value">{formatPrice(paymentData.amount)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Email:</span>
          <span className="detail-value">{paymentData.customerEmail}</span>
        </div>
      </div>
      
      <button 
        onClick={onContinue} 
        className={`continue-btn ${CSS_CLASSES.BUTTON_PRIMARY}`}
        type="button"
        aria-label={UI_MESSAGES.CONTINUE_SHOPPING}
      >
        🏠 {UI_MESSAGES.CONTINUE_SHOPPING}
      </button>
    </div>
  );
}
