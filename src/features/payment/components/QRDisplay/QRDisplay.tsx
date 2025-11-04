// React import not needed with new JSX transform
import { PaymentData, MultiProductPaymentData, CSS_CLASSES, formatPrice } from 'pi-kiosk-shared';
import styles from './QRDisplay.module.css';

interface QRDisplayProps {
  qrCodeUrl: string;
  paymentData?: PaymentData | MultiProductPaymentData | { amount?: number | string };
  onCancel: () => void;
  title?: string;
  instructions?: string;
  statusText?: string;
  amount?: string | number;
}

export function QRDisplay({ 
  qrCodeUrl, 
  paymentData,
  onCancel,
  title = "Naskenujte QR kód",
  instructions = "Dokončete platbu na vašem telefonu",
  statusText = "Čekám na platbu",
  amount
}: QRDisplayProps) {
  // Extract amount from paymentData if not provided directly
  let displayAmount: string | undefined;
  if (amount !== undefined) {
    displayAmount = typeof amount === 'number' ? formatPrice(amount) : amount;
  } else if (paymentData) {
    if ('amount' in paymentData && paymentData.amount) {
      displayAmount = formatPrice(typeof paymentData.amount === 'number' ? paymentData.amount : parseFloat(String(paymentData.amount)));
    } else if ('totalAmount' in paymentData && paymentData.totalAmount) {
      displayAmount = formatPrice(paymentData.totalAmount);
    }
  }

  return (
    <div className={`${styles.qrSection} ${CSS_CLASSES.CARD}`}>
      <div className={styles.qrContent}>
        {/* QR Code on Left */}
        <div className={styles.qrCodeContainer}>
          <img 
            src={qrCodeUrl} 
            alt="QR Code pro platbu" 
            className={styles.qrCode}
            loading="lazy"
          />
        </div>
        
        {/* Payment Info on Right */}
        <div className={styles.qrInfoPanel}>
          <h2 className={styles.qrTitle}>{title}</h2>
          
          <div className={`${styles.paymentStatus} ${CSS_CLASSES.LOADING}`}>
            <p className={styles.statusText}>{statusText}</p>
            {displayAmount && (
              <p className={styles.amountText}>{displayAmount}</p>
            )}
            <div className={styles.loadingSpinner} aria-hidden="true"></div>
          </div>
          
          <p className={styles.instructions}>{instructions}</p>
        </div>
      </div>
      
      <div className={styles.qrActions}>
        <button
          onClick={onCancel}
          className={styles.cancelQrBtn}
          type="button"
          aria-label="Zrušit platbu"
        >
          ← Zpět k výběru platby
        </button>
      </div>
    </div>
  );
}
