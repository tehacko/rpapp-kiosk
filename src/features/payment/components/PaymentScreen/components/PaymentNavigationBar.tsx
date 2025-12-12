import type { Cart } from 'pi-kiosk-shared';
import styles from '../PaymentScreen.module.css';

interface PaymentNavigationBarProps {
  paymentStep: number;
  cart: Cart;
  show: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function PaymentNavigationBar({
  paymentStep,
  cart,
  show,
  onBack,
  onNext
}: PaymentNavigationBarProps): JSX.Element | null {
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

  return (
    <div className={`${styles.paymentButtonsBar} ${sizeClass}`}>
      <div className={styles.cartButtonsHeader}>
        <button onClick={onBack} className={styles.clearCartBtnHeader} type="button">
          ← Zpět
        </button>
        {paymentStep !== 3 && (
          <button onClick={onNext} className={styles.checkoutBtnHeader} type="button">
            {getNextButtonText()}
          </button>
        )}
      </div>
    </div>
  );
}
