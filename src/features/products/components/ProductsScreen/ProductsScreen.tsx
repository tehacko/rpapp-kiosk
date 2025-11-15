import React, { useMemo } from 'react';
import { KioskProduct } from 'pi-kiosk-shared';
import { ProductGrid } from '../ProductGrid';
import { CartHeader } from '../../../cart/components/CartHeader';
import styles from './ProductsScreen.module.css';

interface ProductsScreenProps {
  products: KioskProduct[];
  onAddToCart: (product: KioskProduct) => void;
  getItemQuantity: (productId: number) => number;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  isCartEmpty: boolean;
  totalItems: number;
  onCheckout: () => void;
  onClearCart: () => void;
  isConnected: boolean;
  qrCodeUrl?: string;
}

function ProductsScreenComponent({
  products,
  onAddToCart,
  getItemQuantity,
  isLoading,
  error,
  onRetry,
  isCartEmpty,
  totalItems,
  onCheckout,
  onClearCart,
  isConnected: _isConnected,
  qrCodeUrl
}: ProductsScreenProps) {
  // Memoize header content to prevent unnecessary re-renders
  const headerContent = useMemo(() => {
    if (!isCartEmpty && !qrCodeUrl) {
  return (
          <CartHeader
            isEmpty={false} // CartHeader handles its own isEmpty logic
            totalItems={totalItems}
            onCheckout={onCheckout}
            onClear={onClearCart}
          />
      );
    } else if (!qrCodeUrl) {
      return (
          <div className={styles.headerLeft}>
            <h2 className={styles.productSelectTitle}>Vyberte si produkt</h2>
          </div>
      );
    }
    return null;
  }, [isCartEmpty, qrCodeUrl, totalItems, onCheckout, onClearCart]);

  return (
    <div className={styles.productsScreen}>
      <div className={styles.productsHeader}>{headerContent}</div>

      <ProductGrid
        products={products}
        onAddToCart={onAddToCart}
        getItemQuantity={getItemQuantity}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
      />
    </div>
  );
}

// Export memoized ProductsScreen
export const ProductsScreen = React.memo(ProductsScreenComponent, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.products === nextProps.products &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.error === nextProps.error &&
    prevProps.isCartEmpty === nextProps.isCartEmpty &&
    prevProps.totalItems === nextProps.totalItems &&
    prevProps.isConnected === nextProps.isConnected &&
    prevProps.qrCodeUrl === nextProps.qrCodeUrl &&
    prevProps.onAddToCart === nextProps.onAddToCart &&
    prevProps.getItemQuantity === nextProps.getItemQuantity &&
    prevProps.onRetry === nextProps.onRetry &&
    prevProps.onCheckout === nextProps.onCheckout &&
    prevProps.onClearCart === nextProps.onClearCart
  );
});

ProductsScreen.displayName = 'ProductsScreen';