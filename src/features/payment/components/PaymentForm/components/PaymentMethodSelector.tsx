import { CSS_CLASSES } from '../../../../../shared/constants';
import type { ProviderStatus } from '../../../hooks/usePaymentProviderStatus';
import styles from '../PaymentForm.module.css';

interface PaymentMethodSelectorProps {
  isGeneratingQR: boolean;
  onPaymentMethodSelect: (method: 'qr' | 'thepay') => void;
  qrProviderStatus?: ProviderStatus | null;
  thepayProviderStatus?: ProviderStatus | null;
}

export function PaymentMethodSelector({
  isGeneratingQR,
  onPaymentMethodSelect,
  qrProviderStatus,
  thepayProviderStatus
}: PaymentMethodSelectorProps): JSX.Element {
  const handlePaymentMethodSubmit = (paymentMethod: 'qr' | 'thepay'): void => {
    onPaymentMethodSelect(paymentMethod);
  };

  const isQRAvailable = qrProviderStatus === null || qrProviderStatus === undefined || qrProviderStatus.available;
  const isThePayAvailable = thepayProviderStatus === null || thepayProviderStatus === undefined || thepayProviderStatus.available;

  return (
    <div className={styles.stepContent}>
      <div className={styles.paymentMethods}>
        <h3 className={styles.paymentMethodsTitle}>Vyberte způsob platby:</h3>
        
        {/* QR Payment Button */}
        <button 
          type="button"
          onClick={() => handlePaymentMethodSubmit('qr')}
          className={`${styles.paymentMethodBtn} ${styles.qrBtn} ${CSS_CLASSES.BUTTON_PRIMARY} ${!isQRAvailable ? styles.unavailable : ''}`}
          disabled={isGeneratingQR || !isQRAvailable}
          aria-disabled={!isQRAvailable}
        >
          <span aria-hidden="true">📱</span>
          QR kód
          {!isQRAvailable && (
            <span className={styles.unavailableInline}>(dočasně nedostupné)</span>
          )}
        </button>
        
        {/* ThePay Button */}
        <button 
          type="button"
          onClick={() => handlePaymentMethodSubmit('thepay')}
          className={`${styles.paymentMethodBtn} ${styles.thepayBtn} ${CSS_CLASSES.BUTTON_SECONDARY} ${!isThePayAvailable ? styles.unavailable : ''}`}
          disabled={isGeneratingQR || !isThePayAvailable}
          aria-disabled={!isThePayAvailable}
        >
          <span aria-hidden="true">💳</span>
          ThePay
          {!isThePayAvailable && (
            <span className={styles.unavailableInline}>(dočasně nedostupné)</span>
          )}
        </button>
      </div>
    </div>
  );
}
