import React from 'react';
import { Cart as CartType, CartItem } from 'pi-kiosk-shared';
import { formatPrice } from 'pi-kiosk-shared';
import './Cart.css';

interface CartProps {
  cart: CartType;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export const Cart: React.FC<CartProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout
}) => {
  if (cart.items.length === 0) {
    return (
      <div className="cart-empty">
        <div className="empty-icon">🛒</div>
        <p>Košík je prázdný</p>
        <p>Přidejte produkty pro pokračování</p>
      </div>
    );
  }

  return (
    <div className="cart">
      <div className="cart-header">
        <h3>🛒 Košík ({cart.totalItems})</h3>
        <button 
          onClick={onClearCart}
          className="clear-cart-btn"
          title="Vymazat košík"
        >
          🗑️ Vymazat
        </button>
      </div>
      
      <div className="cart-items">
        {cart.items.map((item: CartItem) => (
          <div key={item.product.id} className="cart-item">
            <div className="item-image">
              {item.product.imageUrl ? (
                <img 
                  src={item.product.imageUrl} 
                  alt={item.product.name}
                  loading="lazy"
                />
              ) : (
                <span className="image-fallback">{item.product.image || '📦'}</span>
              )}
            </div>
            
            <div className="item-details">
              <h4 className="item-name">{item.product.name}</h4>
              <p className="item-price">{formatPrice(item.product.price)}</p>
            </div>
            
            <div className="item-controls">
              <div className="quantity-controls">
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  className="quantity-btn"
                  disabled={item.quantity <= 1}
                >
                  -
                </button>
                <span className="quantity">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                  className="quantity-btn"
                >
                  +
                </button>
              </div>
              
              <button
                onClick={() => onRemoveItem(item.product.id)}
                className="remove-btn"
                title="Odebrat z košíku"
              >
                ❌
              </button>
            </div>
            
            <div className="item-total">
              {formatPrice(item.product.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="cart-footer">
        <div className="cart-total">
          <div className="total-line">
            <span>Celkem:</span>
            <span className="total-amount">{formatPrice(cart.totalAmount)}</span>
          </div>
        </div>
        
        <button
          onClick={onProceedToCheckout}
          className="checkout-btn"
        >
          💳 Pokračovat k platbě
        </button>
      </div>
    </div>
  );
};
