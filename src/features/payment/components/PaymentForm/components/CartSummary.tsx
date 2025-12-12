import type { Cart} from 'pi-kiosk-shared';
import { CSS_CLASSES, formatPrice } from 'pi-kiosk-shared';
import styles from '../PaymentForm.module.css';

interface CartSummaryProps {
  cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps): JSX.Element | null {
  if (!cart || cart.items.length === 0) {
    return null;
  }

  const sizeClass = cart.items.length === 1 ? styles.size1 :
                     cart.items.length === 2 ? styles.size2 :
                     cart.items.length === 3 ? styles.size3 :
                     '';

  return (
    <div className={`${styles.cartSummary} ${CSS_CLASSES.CARD} ${sizeClass}`}>
      <h2>🛒 Košík ({cart.totalItems} položek)</h2>
      <div className={`${styles.cartItemsSummary} ${sizeClass}`}>
        {[...cart.items]
          .sort((a, b) => (b.product.price * b.quantity) - (a.product.price * a.quantity))
          .map((item) => (
            <div key={item.product.id} className={styles.cartItemSummary}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>
                  <span className={styles.itemQuantity}>{item.quantity}×</span>
                  <span>{item.product.name}</span>
                </span>
              </div>
              <div className={styles.itemPrice}>
                {formatPrice(item.product.price * item.quantity)}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
