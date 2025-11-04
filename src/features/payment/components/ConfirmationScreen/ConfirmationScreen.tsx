// React import not needed with new JSX transform
import { PaymentData, MultiProductPaymentData, UI_MESSAGES, CSS_CLASSES, formatPrice, TransactionStatus } from 'pi-kiosk-shared';
import styles from './ConfirmationScreen.module.css';

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
    <div className={`${styles.confirmationScreen} ${CSS_CLASSES.SCREEN}`}>
      <div className={styles.successIcon} role="img" aria-label="Success">
        {isPaymentCompleted ? '✅' : isPaymentTimeout ? '⏰' : isPaymentFailed ? '❌' : '✅'}
      </div>
      <h2 className={styles.confirmationTitle}>
        {isPaymentCompleted ? 'Zaplaceno!' : 
         isPaymentTimeout ? 'Platba vypršela' : 
         isPaymentFailed ? 'Platba se nezdařila' : 
         UI_MESSAGES.PAYMENT_SUCCESS}
      </h2>
      
      <div className={styles.paymentDetails}>
        <h3>Detaily platby</h3>
        
        {/* Single Product Payment */}
        {'productName' in paymentData && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Produkt:</span>
            <span className={styles.detailValue}>{paymentData.productName}</span>
          </div>
        )}
        
        {/* Multi-Product Payment */}
        {'items' in paymentData && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Položky:</span>
            <span className={styles.detailValue}>{paymentData.items.length} produktů</span>
          </div>
        )}
        
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Částka:</span>
          <span className={styles.detailValue}>{formatPrice('amount' in paymentData ? paymentData.amount : paymentData.totalAmount)}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Email:</span>
          <span className={styles.detailValue}>{paymentData.customerEmail}</span>
        </div>
      </div>
      
      <button 
        onClick={onContinue} 
        className={styles.continueBtn}
        type="button"
        aria-label="Zpět k produktům"
      >
        🏠 Zpět k produktům
      </button>
    </div>
  );
}
