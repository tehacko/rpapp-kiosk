// React is not needed with new JSX transform
import { KioskProduct, UI_MESSAGES, CSS_CLASSES, useErrorHandler, formatPrice } from 'pi-kiosk-shared';
import styles from './ProductGrid.module.css';

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
      <div className={`${styles.loadingState} ${CSS_CLASSES.LOADING}`}>
        <div className={styles.spinner} aria-label="Loading"></div>
        <p>{UI_MESSAGES.LOADING_PRODUCTS}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.errorState} ${CSS_CLASSES.ERROR}`} role="alert">
        <div className={styles.errorIcon}>❌</div>
        <p className={styles.errorMessage}>
          {error.message || UI_MESSAGES.NETWORK_ERROR}
        </p>
        <button 
          onClick={handleRetry} 
          className={`${styles.retryBtn} ${CSS_CLASSES.BUTTON_PRIMARY}`}
          type="button"
        >
          🔄 Zkusit znovu
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={styles.emptyState} role="status">
        <div className={styles.emptyIcon}>📦</div>
        <p>{UI_MESSAGES.NO_PRODUCTS}</p>
      </div>
    );
  }

  // Filter out products that are not available (quantity 0 or inactive)
  const availableProducts = products.filter(product => product.quantityInStock > 0);

  return (
    <div className={`${styles.productsGrid} ${CSS_CLASSES.GRID}`} role="grid">
      {availableProducts.map((product) => (
        <div 
          key={product.id} 
          className={`${styles.productCard} ${CSS_CLASSES.CARD}`}
          role="gridcell"
          tabIndex={-1}
          aria-label={`${product.name} - ${formatPrice(product.price)}`}
        >
          
          <div className={styles.productInfo}>
            <h3 className={styles.productName}>{product.name}</h3>
          </div>
          
          <div className={styles.productBottomSection}>
            <button
              onClick={(e) => handleAddToCart(e, product)}
              className={styles.addToCartBtn}
              title="Přidat do košíku"
              type="button"
            >
              🛒 Přidat do košíku
            </button>
          </div>
          
          {getItemQuantity(product.id) > 0 && (
            <div className={styles.cartQuantity}>
              🛒 V košíku: {getItemQuantity(product.id)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
