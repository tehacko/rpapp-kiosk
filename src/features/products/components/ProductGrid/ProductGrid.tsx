// React is not needed with new JSX transform
import React, { useMemo, useCallback } from 'react';
import type { KioskProduct} from 'pi-kiosk-shared';
import { UI_MESSAGES, CSS_CLASSES } from '../../../../shared/constants';
import { useErrorHandler } from '../../../../shared/hooks';
import { formatPrice } from '../../../../shared/utils';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  products: KioskProduct[];
  onAddToCart: (product: KioskProduct) => void;
  getItemQuantity: (productId: number) => number;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

function ProductGridComponent({ products, onAddToCart, getItemQuantity, isLoading, error, onRetry }: ProductGridProps): JSX.Element {
  const { retryAction } = useErrorHandler();

  // Memoize available products filter - use products directly for immediate updates
  const availableProducts = useMemo(() => {
    return products.filter(product => product.quantityInStock > 0);
  }, [products]);

  const handleRetry = useCallback(() => {
    retryAction(onRetry);
  }, [retryAction, onRetry]);

  const handleAddToCart = useCallback((e: React.MouseEvent, product: KioskProduct) => {
    e.preventDefault();
    e.stopPropagation();
    console.info('Adding product to cart:', product.name, 'Event:', e.type);
    onAddToCart(product);
  }, [onAddToCart]);

  if (isLoading) {
    return (
      <div className={`${styles.loadingState} ${CSS_CLASSES.LOADING}`}>
        <div className={styles.spinner} aria-label="Loading" />
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

  return (
    <div className={`${styles.productsGrid} ${CSS_CLASSES.GRID}`} role="grid">
      {availableProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
          getItemQuantity={getItemQuantity}
        />
      ))}
    </div>
  );
}

// Memoized ProductCard component
interface ProductCardProps {
  product: KioskProduct;
  onAddToCart: (e: React.MouseEvent, product: KioskProduct) => void;
  getItemQuantity: (productId: number) => number;
}

const ProductCard = React.memo<ProductCardProps>(
  ({ product, onAddToCart, getItemQuantity }) => {
    const quantity = useMemo(
      () => getItemQuantity(product.id),
      [getItemQuantity, product.id]
    );

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        onAddToCart(e, product);
      },
      [onAddToCart, product]
    );

    return (
      <div
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
            onClick={handleClick}
            className={styles.addToCartBtn}
            title="Přidat do košíku"
            type="button"
          >
            🛒 Přidat do košíku
          </button>
        </div>

        {quantity > 0 && (
          <div className={styles.cartQuantity}>🛒 V košíku: {quantity}</div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.product.quantityInStock === nextProps.product.quantityInStock &&
      prevProps.getItemQuantity(prevProps.product.id) ===
        nextProps.getItemQuantity(nextProps.product.id)
    );
  }
);

ProductCard.displayName = 'ProductCard';

// Export memoized ProductGrid
export const ProductGrid = React.memo(ProductGridComponent, (prevProps, nextProps) => {
  // Custom comparison: re-render if products array changes (length or content)
  // Check length first (fast), then reference equality
  if (prevProps.products.length !== nextProps.products.length) {
    return false; // Re-render if length changed
  }
  
  // Check if any product IDs changed (more thorough than reference check)
  const prevIds = prevProps.products.map(p => p.id).sort().join(',');
  const nextIds = nextProps.products.map(p => p.id).sort().join(',');
  if (prevIds !== nextIds) {
    return false; // Re-render if product IDs changed
  }
  
  // Only skip re-render if everything else is the same
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.error === nextProps.error &&
    prevProps.onAddToCart === nextProps.onAddToCart &&
    prevProps.getItemQuantity === nextProps.getItemQuantity &&
    prevProps.onRetry === nextProps.onRetry
  );
});

ProductGrid.displayName = 'ProductGrid';
