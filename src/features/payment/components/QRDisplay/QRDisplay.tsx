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
      {/* Left side - Text content */}
      <div className={styles.qrLeftContent}>
        <div className={styles.qrInfoPanel}>
          <h2 className={styles.qrTitle}>{title}</h2>
          {displayAmount && (
            <p className={styles.amountText}>{displayAmount}</p>
          )}
        </div>
        
        <div className={styles.qrActions}>
          <button
            onClick={onCancel}
            className={styles.cancelQrBtn}
            type="button"
            aria-label="Zpět"
          >
            ← Zpět
          </button>
        </div>
      </div>
      
      {/* Right side - QR Code */}
      <div className={styles.qrRightContent}>
        <img 
          src={qrCodeUrl} 
          alt="QR Code pro platbu" 
          className={styles.qrCode}
          loading="lazy"
        />
      </div>
    </div>
  );
}
