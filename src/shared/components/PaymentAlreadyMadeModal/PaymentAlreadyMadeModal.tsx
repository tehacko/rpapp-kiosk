import { useEffect } from 'react';
import styles from './PaymentAlreadyMadeModal.module.css';

interface PaymentAlreadyMadeModalProps {
  isOpen: boolean;
  customerEmail: string;
  receiptEmailStatus?: 'sent' | 'pending' | 'failed' | 'none';
  onClose: () => void;
}

export function PaymentAlreadyMadeModal({
  isOpen,
  customerEmail,
  receiptEmailStatus = 'none',
  onClose,
}: PaymentAlreadyMadeModalProps): JSX.Element | null {
  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return (): void => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine email message based on status
  let emailMessage = '';
  if (receiptEmailStatus === 'sent') {
    emailMessage = `Účtenka byla odeslána na email: ${customerEmail}`;
  } else if (receiptEmailStatus === 'pending') {
    emailMessage = `Účtenka bude odeslána na email: ${customerEmail}`;
  } else if (receiptEmailStatus === 'failed') {
    emailMessage = `Odeslání účtenky na email ${customerEmail} se nezdařilo. Kontaktujte prosím podporu.`;
  } else {
    // 'none' or unknown status - default message
    emailMessage = `Účtenka bude odeslána na email: ${customerEmail}`;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalIcon}>ℹ️</div>
          <h2 className={styles.modalTitle}>Platba již byla vytvořena</h2>
        </div>
        
        <div className={styles.modalBody}>
          <p className={styles.modalMessage}>
            Pro tento nákup již byla vytvořena platba. Zobrazuji existující QR kód.
          </p>
          
          {customerEmail && (
            <div className={styles.emailInfo}>
              <p className={styles.emailMessage}>
                {emailMessage}
              </p>
              {receiptEmailStatus === 'sent' && (
                <p className={styles.emailHint}>Zkontrolujte prosím svou emailovou schránku.</p>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            className={styles.closeButton}
            type="button"
          >
            Rozumím
          </button>
        </div>
      </div>
    </div>
  );
}
