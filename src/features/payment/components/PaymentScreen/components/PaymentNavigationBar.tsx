import { useRef } from 'react';
import type { Cart } from 'pi-kiosk-shared';
import styles from '../PaymentScreen.module.css';

interface PaymentNavigationBarProps {
  paymentStep: number;
  cart: Cart;
  show: boolean;
  onBack: () => void;
  onNext: () => void | Promise<void>;
}

export function PaymentNavigationBar({
  paymentStep,
  cart,
  show,
  onBack,
  onNext
}: PaymentNavigationBarProps): JSX.Element | null {
  const isProcessingRef = useRef(false);

  if (!show) {
    return null;
  }

  const sizeClass = paymentStep === 1 && cart.items.length === 1 ? styles.size1 :
                     paymentStep === 1 && cart.items.length === 2 ? styles.size2 :
                     paymentStep === 1 && cart.items.length === 3 ? styles.size3 :
                     '';

  const getNextButtonText = (): string => {
    if (paymentStep === 1 || paymentStep === 2) {
      return '➡️ Další krok';
    }
    return '💳 Zaplatit';
  };

  const handleNextClick = async (): Promise<void> => {
    // Prevent multiple rapid clicks
    if (isProcessingRef.current) {
      console.info('🟡 Button click ignored - already processing', { paymentStep });
      return;
    }

    try {
      isProcessingRef.current = true;
      console.info('🟢 Green button clicked', { paymentStep });
      await onNext();
    } finally {
      // Reset after a short delay to allow async operations to complete
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  };

  return (
    <div className={`${styles.paymentButtonsBar} ${sizeClass}`}>
      <div className={styles.cartButtonsHeader}>
        <button onClick={onBack} className={styles.clearCartBtnHeader} type="button">
          ← Zpět
        </button>
        {paymentStep !== 3 && (
          <button 
            onClick={handleNextClick}
            className={styles.checkoutBtnHeader} 
            type="button"
            disabled={isProcessingRef.current}
          >
            {getNextButtonText()}
          </button>
        )}
      </div>
    </div>
  );
}
