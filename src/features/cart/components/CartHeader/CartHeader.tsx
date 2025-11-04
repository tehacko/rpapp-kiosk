import styles from './CartHeader.module.css';

interface CartHeaderProps {
  isEmpty: boolean;
  totalItems: number;
  onCheckout: () => void;
  onClear: () => void;
}

export function CartHeader({ 
  isEmpty, 
  totalItems, 
  onCheckout, 
  onClear
}: CartHeaderProps) {
  if (isEmpty) {
    return null;
  }

  return (
    <div className={styles.cartHeader}>
      <div className={styles.cartButtonsHeader}>
        <button
          onClick={onCheckout}
          className={styles.checkoutBtnHeader}
          type="button"
        >
          💳 Zaplatit
        </button>
        <button
          onClick={onClear}
          className={styles.clearCartBtnHeader}
          type="button"
        >
          🛒 Vyprázdnit košík ({totalItems})
        </button>
      </div>
    </div>
  );
}
