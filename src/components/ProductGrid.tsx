// React is not needed with new JSX transform
import { KioskProduct, UI_MESSAGES, CSS_CLASSES, useErrorHandler, formatPrice } from 'pi-kiosk-shared';

interface ProductGridProps {
  products: KioskProduct[];
  onAddToCart: (product: KioskProduct) => void;
  getItemQuantity: (productId: number) => number;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function ProductGrid({ products, onAddToCart, getItemQuantity, isLoading, error, onRetry }: ProductGridProps) {
  const { retryAction } = useErrorHandler();

  const handleRetry = () => {
    retryAction(onRetry);
  };

  const handleAddToCart = (e: React.MouseEvent, product: KioskProduct) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Adding product to cart:', product.name, 'Event:', e.type);
    onAddToCart(product);
  };

  if (isLoading) {
    return (
      <div className={`loading-state ${CSS_CLASSES.LOADING}`}>
        <div className="spinner" aria-label="Loading"></div>
        <p>{UI_MESSAGES.LOADING_PRODUCTS}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`error-state ${CSS_CLASSES.ERROR}`} role="alert">
        <div className="error-icon">❌</div>
        <p className="error-message">
          {error.message || UI_MESSAGES.NETWORK_ERROR}
        </p>
        <button 
          onClick={handleRetry} 
          className={`retry-btn ${CSS_CLASSES.BUTTON_PRIMARY}`}
          type="button"
        >
          🔄 Zkusit znovu
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="empty-state" role="status">
        <div className="empty-icon">📦</div>
        <p>{UI_MESSAGES.NO_PRODUCTS}</p>
      </div>
    );
  }

  // Filter out products that are not available (quantity 0 or inactive)
  const availableProducts = products.filter(product => product.quantityInStock > 0);

  return (
    <div className={`products-grid ${CSS_CLASSES.GRID}`} role="grid">
      {availableProducts.map((product) => (
        <div 
          key={product.id} 
          className={`product-card ${CSS_CLASSES.CARD}`}
          role="gridcell"
          tabIndex={-1}
          aria-label={`${product.name} - ${formatPrice(product.price)}`}
        >
          
          <div className="product-info">
            <h3 className="product-name">{product.name}</h3>
          </div>
          
          <div className="product-bottom-section">
            <button
              onClick={(e) => handleAddToCart(e, product)}
              className="add-to-cart-btn"
              title="Přidat do košíku"
              type="button"
            >
              🛒 Přidat do košíku
            </button>
          </div>
          
          {getItemQuantity(product.id) > 0 && (
            <div className="cart-quantity">
              🛒 V košíku: {getItemQuantity(product.id)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
