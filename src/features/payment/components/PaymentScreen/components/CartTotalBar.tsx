import type { Cart} from 'pi-kiosk-shared';
import { formatPrice } from '../../../../../shared/utils';
import styles from '../PaymentScreen.module.css';

interface CartTotalBarProps {
  cart: Cart;
  show: boolean;
}

export function CartTotalBar({ cart, show }: CartTotalBarProps): JSX.Element | null {
  if (!show || !cart) {
    return null;
  }

  const sizeClass = cart.items.length === 1 ? styles.size1 :
                     cart.items.length === 2 ? styles.size2 :
                     cart.items.length === 3 ? styles.size3 :
                     '';

  return (
    <div className={`${styles.cartTotalBar} ${sizeClass}`}>
      <strong>Celkem: {formatPrice(cart.totalAmount)}</strong>
    </div>
  );
}
