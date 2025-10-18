import { KioskProduct } from 'pi-kiosk-shared';
import { ProductGrid } from '../ProductGrid';
import { ConnectionStatus } from '../../../../shared/components';
import { CartHeader } from '../../../cart/components/CartHeader';

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
  isConnected,
  qrCodeUrl
}: ProductsScreenProps) {
  return (
    <div className="products-screen">
      <div className="products-header">
        {!isCartEmpty && !qrCodeUrl ? (
          <CartHeader
            isEmpty={false} // CartHeader handles its own isEmpty logic
            totalItems={totalItems}
            onCheckout={onCheckout}
            onClear={onClearCart}
          />
        ) : !qrCodeUrl ? (
          <div className="header-left">
            <h2 className="product-select-title">Vyberte si produkt</h2>
          </div>
        ) : null}
        
        {isCartEmpty && <ConnectionStatus isConnected={isConnected} />}
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