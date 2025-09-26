// React is not needed with new JSX transform
import { Product, UI_MESSAGES, CSS_CLASSES, useErrorHandler, formatPrice } from 'pi-kiosk-shared';

interface ProductGridProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function ProductGrid({ products, onSelectProduct, isLoading, error, onRetry }: ProductGridProps) {
  const { retryAction } = useErrorHandler();

  const handleProductSelect = (product: Product) => {
    try {
      onSelectProduct(product);
    } catch (error) {
      console.error('Error selecting product:', error);
    }
  };

  const handleRetry = () => {
    retryAction(onRetry);
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

  return (
    <div className={`products-grid ${CSS_CLASSES.GRID}`} role="grid">
      {products.map((product) => (
        <div 
          key={product.id} 
          className={`product-card ${CSS_CLASSES.CARD}`}
          onClick={() => handleProductSelect(product)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleProductSelect(product);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Select ${product.name} for ${formatPrice(product.price)}`}
        >
          <div className="product-image">
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name}
                loading="lazy"
                onError={(e) => {
                  // Fallback to emoji if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.parentElement?.querySelector('.image-fallback');
                  if (fallback) {
                    fallback.textContent = product.image || '📦';
                    (fallback as HTMLElement).style.display = 'block';
                  }
                }}
              />
            ) : (
              <span className="product-emoji" aria-hidden="true">
                {product.image || '📦'}
              </span>
            )}
            <span className="image-fallback" style={{ display: 'none' }} aria-hidden="true"></span>
          </div>
          
          <div className="product-info">
            <h3 className="product-name">{product.name}</h3>
            <p className="product-description">{product.description}</p>
            <div className="product-price" aria-label={`Price: ${formatPrice(product.price)}`}>
              {formatPrice(product.price)}
            </div>
          </div>
          
          {product.quantityInStock <= 5 && product.quantityInStock > 0 && (
            <div className="low-stock-indicator" aria-label="Low stock">
              ⚠️ Pouze {product.quantityInStock} ks
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
