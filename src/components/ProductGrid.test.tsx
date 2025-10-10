import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductGrid } from './ProductGrid';
import { KioskProduct } from 'pi-kiosk-shared';

// Mock useErrorHandler
jest.mock('pi-kiosk-shared', () => ({
  KioskProduct: {},
  UI_MESSAGES: {
    LOADING_PRODUCTS: 'Načítání produktů...',
    NO_PRODUCTS: 'Žádné produkty nejsou k dispozici',
    NETWORK_ERROR: 'Chyba sítě'
  },
  CSS_CLASSES: {
    LOADING: 'loading',
    ERROR: 'error',
    CARD: 'card',
    GRID: 'grid',
    BUTTON_PRIMARY: 'btn-primary'
  },
  useErrorHandler: () => ({
    retryAction: jest.fn((action) => action())
  }),
  formatPrice: (price: number) => `${price} Kč`
}));

const mockProducts: KioskProduct[] = [
  {
    id: 1,
    name: 'Test Product 1',
    description: 'A test product',
    price: 100,
    image: '📦',
    imageUrl: undefined,
    clickedOn: 0,
    qrCodesGenerated: 0,
    numberOfPurchases: 0,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    quantityInStock: 5,
    kioskClickedOn: 0,
    kioskNumberOfPurchases: 0
  },
  {
    id: 2,
    name: 'Test Product 2',
    description: 'Another test product',
    price: 200,
    image: '🍕',
    imageUrl: 'https://example.com/image.jpg',
    clickedOn: 0,
    qrCodesGenerated: 0,
    numberOfPurchases: 0,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    quantityInStock: 3,
    kioskClickedOn: 0,
    kioskNumberOfPurchases: 0
  },
  {
    id: 3,
    name: 'Low Stock Product',
    description: 'A product with low stock',
    price: 150,
    image: '🥤',
    imageUrl: undefined,
    clickedOn: 0,
    qrCodesGenerated: 0,
    numberOfPurchases: 0,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    quantityInStock: 2,
    kioskClickedOn: 0,
    kioskNumberOfPurchases: 0
  }
];

describe('ProductGrid', () => {
  const mockOnAddToCart = jest.fn();
  const mockGetItemQuantity = jest.fn(() => 0);
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders products correctly', () => {
    render(
      <ProductGrid
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    expect(screen.getByText('Low Stock Product')).toBeInTheDocument();
    expect(screen.getByText('A test product')).toBeInTheDocument();
    expect(screen.getByText('Another test product')).toBeInTheDocument();
    expect(screen.getByText('A product with low stock')).toBeInTheDocument();
    expect(screen.getByText('100 Kč')).toBeInTheDocument();
    expect(screen.getByText('200 Kč')).toBeInTheDocument();
    expect(screen.getByText('150 Kč')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ProductGrid
        products={[]}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={true}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Načítání produktů...')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    const error = new Error('Failed to load products');
    render(
      <ProductGrid
        products={[]}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={error}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    expect(screen.getByText('🔄 Zkusit znovu')).toBeInTheDocument();
  });

  it('shows empty state when no products', () => {
    render(
      <ProductGrid
        products={[]}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Žádné produkty nejsou k dispozici')).toBeInTheDocument();
  });

  it('calls onAddToCart when add to cart button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ProductGrid
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    const addToCartButton = screen.getByText('🛒 Přidat do košíku');
    await user.click(addToCartButton);

    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const error = new Error('Failed to load products');
    render(
      <ProductGrid
        products={[]}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={error}
        onRetry={mockOnRetry}
      />
    );

    const retryButton = screen.getByText('🔄 Zkusit znovu');
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('shows low stock indicator for products with low stock', () => {
    render(
      <ProductGrid
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('⚠️ Pouze 2 ks')).toBeInTheDocument();
  });

  it('displays product images correctly', () => {
    render(
      <ProductGrid
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    // Check for emoji images (only for products without imageUrl)
    expect(screen.getByText('📦')).toBeInTheDocument();
    expect(screen.getByText('🥤')).toBeInTheDocument();

    // Check for actual image
    const image = screen.getByAltText('Test Product 2');
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('handles image loading errors gracefully', async () => {
    render(
      <ProductGrid
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    const image = screen.getByAltText('Test Product 2');
    
    // Simulate image loading error
    fireEvent.error(image);

    // Should show fallback emoji
    expect(screen.getByText('🍕')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <ProductGrid
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    const addToCartButtons = screen.getAllByText('🛒 Přidat do košíku');
    expect(addToCartButtons).toHaveLength(3);

    addToCartButtons.forEach((button) => {
      expect(button).toHaveAttribute('title', 'Přidat do košíku');
    });
  });

  it('shows cart quantity when item is in cart', () => {
    const mockGetItemQuantityWithCart = jest.fn((productId: number) => {
      return productId === 1 ? 2 : 0;
    });

    render(
      <ProductGrid
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantityWithCart}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('🛒 V košíku: 2')).toBeInTheDocument();
  });

  it('disables add to cart button when product is out of stock', () => {
    const outOfStockProduct = { ...mockProducts[0], quantityInStock: 0 };
    const productsWithOutOfStock = [outOfStockProduct, ...mockProducts.slice(1)];

    render(
      <ProductGrid
        products={productsWithOutOfStock}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    const addToCartButtons = screen.getAllByText('🛒 Přidat do košíku');
    expect(addToCartButtons[0]).toBeDisabled();
  });
});