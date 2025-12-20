import type { PaymentData, MultiProductPaymentData} from 'pi-kiosk-shared';
import { CSS_CLASSES } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';
import { usePaymentTimer } from './hooks';
import styles from './QRDisplay.module.css';

interface QRDisplayProps {
  qrCodeUrl: string;
  paymentData?: PaymentData | MultiProductPaymentData | { amount?: number | string };
  onCancel: () => void;
  title?: string;
  instructions?: string;
  statusText?: string;
  amount?: string | number;
  showTimer?: boolean; // Show timer for FIO payment checks
  checkInterval?: number; // Interval in seconds (default 31 for FIO)
  monitoringStartTime?: number | null; // Timestamp when monitoring started (for synchronized timer)
}

export function QRDisplay({ 
  qrCodeUrl, 
  paymentData,
  onCancel,
  title = "Naskenujte QR kód",
  amount,
  showTimer = false,
  checkInterval,
  monitoringStartTime = null
}: QRDisplayProps): JSX.Element | null {
  // Extract paymentId from paymentData for timer hook
  const paymentId = paymentData && 'paymentId' in paymentData ? paymentData.paymentId : null;

  // Timer logic extracted to hook
  const { timeUntilNextCheck, isChecking } = usePaymentTimer({
    showTimer,
    checkInterval,
    monitoringStartTime,
    paymentId: paymentId ?? undefined
  });

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
          {showTimer && (
            <div className={styles.timerContainer}>
              {isChecking ? (
                <p className={styles.checkingText}>Kontroluji...</p>
              ) : (
                <p className={styles.timerText}>Další kontrola platby za {timeUntilNextCheck} s</p>
              )}
            </div>
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
