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

export function ProductsScreen({
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
  return (
    <div className={styles.productsScreen}>
      <div className={styles.productsHeader}>
        {!isCartEmpty && !qrCodeUrl ? (
          <CartHeader
            isEmpty={false} // CartHeader handles its own isEmpty logic
            totalItems={totalItems}
            onCheckout={onCheckout}
            onClear={onClearCart}
          />
        ) : !qrCodeUrl ? (
          <div className={styles.headerLeft}>
            <h2 className={styles.productSelectTitle}>Vyberte si produkt</h2>
          </div>
        ) : null}
      </div>

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