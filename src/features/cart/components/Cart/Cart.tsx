import React from 'react';
import type { Cart as CartType, CartItem } from 'pi-kiosk-shared';
import { formatPrice } from 'pi-kiosk-shared';
import styles from './Cart.module.css';

interface CartProps {
  cart: CartType;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export function Cart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout
}: CartProps): JSX.Element {
  if (cart.items.length === 0) {
    return (
      <div className={styles.cartEmpty}>
        <div className={styles.emptyIcon}>🛒</div>
        <p>Košík je prázdný</p>
        <p>Přidejte produkty pro pokračování</p>
      </div>
    );
  }

  return (
    <div className={styles.cart}>
      <div className={styles.cartHeader}>
        <h3>🛒 Košík ({cart.totalItems})</h3>
        <button 
          onClick={onClearCart}
          className={styles.clearCartBtn}
          title="Vymazat košík"
        >
          🗑️ Vymazat
        </button>
      </div>
      
      <div className={styles.cartItems}>
        {cart.items.map((item: CartItem) => (
          <div key={item.product.id} className={styles.cartItem}>
            <div className={styles.itemImage}>
              {item.product.imageUrl ? (
                <img 
                  src={item.product.imageUrl} 
                  alt={item.product.name}
                  loading="lazy"
                />
              ) : (
                <span className={styles.imageFallback}>{item.product.image ?? '📦'}</span>
              )}
            </div>
            
            <div className={styles.itemDetails}>
              <h4 className={styles.itemName}>{item.product.name}</h4>
              <p className={styles.itemPrice}>{formatPrice(item.product.price)}</p>
            </div>
            
            <div className={styles.itemControls}>
              <div className={styles.quantityControls}>
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  className={styles.quantityBtn}
                  disabled={item.quantity <= 1}
                >
                  -
                </button>
                <span className={styles.quantity}>{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  className={styles.quantityBtn}
                >
                  +
                </button>
              </div>
              
              <button
                onClick={() => onRemoveItem(item.product.id)}
                className={styles.removeBtn}
                title="Odebrat z košíku"
              >
                ❌
              </button>
            </div>
            
            <div className={styles.itemTotal}>
              {formatPrice(item.product.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>
      
      <div className={styles.cartFooter}>
        <div className={styles.cartTotal}>
          <div className={styles.totalLine}>
            <span>Celkem:</span>
            <span className={styles.totalAmount}>{formatPrice(cart.totalAmount)}</span>
          </div>
        </div>
        
        <button
          onClick={onProceedToCheckout}
          className={styles.checkoutBtn}
        >
          💳 Pokračovat k platbě
        </button>
      </div>
    </div>
  );
}
