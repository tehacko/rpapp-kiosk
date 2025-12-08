import React, { useCallback } from 'react';
import styles from './CartHeader.module.css';

interface CartHeaderProps {
  isEmpty: boolean;
  totalItems: number;
  onCheckout: () => void;
  onClear: () => void;
  /** Disable checkout button (e.g., when all payments are unavailable) */
  disabled?: boolean;
}

function CartHeaderComponent({ 
  isEmpty, 
  totalItems, 
  onCheckout, 
  onClear,
  disabled = false
}: CartHeaderProps) {
  const handleCheckout = useCallback(() => {
    onCheckout();
  }, [onCheckout]);

  const handleClear = useCallback(() => {
    onClear();
  }, [onClear]);

  if (isEmpty) {
    return null;
  }

  return (
    <div className={styles.cartHeader}>
      <div className={styles.cartButtonsHeader}>
        <button
          onClick={handleClear}
          className={styles.clearCartBtnHeader}
          type="button"
        >
          🛒 Vyprázdnit košík ({totalItems})
        </button>
        <button
          onClick={handleCheckout}
          className={`${styles.checkoutBtnHeader} ${disabled ? styles.disabled : ''}`}
          type="button"
          disabled={disabled}
          aria-disabled={disabled}
          title={disabled ? 'Platby jsou dočasně nedostupné' : undefined}
        >
          💳 Zaplatit
        </button>
      </div>
    </div>
  );
}

// Export memoized CartHeader
export const CartHeader = React.memo(CartHeaderComponent, (prevProps, nextProps) => {
  return (
    prevProps.isEmpty === nextProps.isEmpty &&
    prevProps.totalItems === nextProps.totalItems &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.onCheckout === nextProps.onCheckout &&
    prevProps.onClear === nextProps.onClear
  );
});

CartHeader.displayName = 'CartHeader';
