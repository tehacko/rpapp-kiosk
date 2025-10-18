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
    <div className="cart-header">
      <div className="cart-buttons-header">
        <button
          onClick={onCheckout}
          className="checkout-btn-header"
          type="button"
        >
          💳 Zaplatit
        </button>
        <button
          onClick={onClear}
          className="clear-cart-btn-header"
          type="button"
        >
          🛒 Vyprázdnit košík ({totalItems})
        </button>
      </div>
    </div>
  );
}
