// React import not needed with new JSX transform
import { PaymentData, MultiProductPaymentData, UI_MESSAGES, CSS_CLASSES, formatPrice, TransactionStatus } from 'pi-kiosk-shared';

interface ConfirmationScreenProps {
  paymentData: PaymentData | MultiProductPaymentData;
  onContinue: () => void;
}

export function ConfirmationScreen({ paymentData, onContinue }: ConfirmationScreenProps) {
  // Check if this is a payment completion from FIO bank
  const isPaymentCompleted = 'status' in paymentData && paymentData.status === TransactionStatus.COMPLETED;
  const isPaymentTimeout = 'status' in paymentData && paymentData.status === TransactionStatus.TIMEOUT;
  const isPaymentFailed = 'status' in paymentData && paymentData.status === TransactionStatus.FAILED;
  
  return (
    <div className={`confirmation-screen ${CSS_CLASSES.SCREEN}`}>
      <div className="success-icon" role="img" aria-label="Success">
        {isPaymentCompleted ? '✅' : isPaymentTimeout ? '⏰' : isPaymentFailed ? '❌' : '✅'}
      </div>
      <h2 className="confirmation-title">
        {isPaymentCompleted ? 'Zaplaceno!' : 
         isPaymentTimeout ? 'Platba vypršela' : 
         isPaymentFailed ? 'Platba se nezdařila' : 
         UI_MESSAGES.PAYMENT_SUCCESS}
      </h2>
      
      <div className="payment-details">
        <h3>Detaily platby</h3>
        
        {/* Single Product Payment */}
        {'productName' in paymentData && (
          <div className="detail-row">
            <span className="detail-label">Produkt:</span>
            <span className="detail-value">{paymentData.productName}</span>
          </div>
        )}
        
        {/* Multi-Product Payment */}
        {'items' in paymentData && (
          <div className="detail-row">
            <span className="detail-label">Položky:</span>
            <span className="detail-value">{paymentData.items.length} produktů</span>
          </div>
        )}
        
        <div className="detail-row">
          <span className="detail-label">Částka:</span>
          <span className="detail-value">{formatPrice('amount' in paymentData ? paymentData.amount : paymentData.totalAmount)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Email:</span>
          <span className="detail-value">{paymentData.customerEmail}</span>
        </div>
      </div>
      
      <button 
        onClick={onContinue} 
        className="continue-btn"
        type="button"
        aria-label="Zpět k produktům"
      >
        🏠 Zpět k produktům
      </button>
    </div>
  );
}
