/**
 * ProductGrid Component Tests - Refactored with proper mocking
 * Tests product grid functionality with consistent mocking patterns
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { ProductGrid } from './ProductGrid';
import { KioskProduct } from 'pi-kiosk-shared';
import {
  testDataSets
} from '../../../../__tests__/utils/testData';

// Mock useErrorHandler and shared utilities
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
    retryAction: jest.fn((action: any) => action())
  }),
  formatPrice: (price: number) => `${price} Kč`
}));

// Use test data factories
const mockProducts: KioskProduct[] = testDataSets.basicProducts.map((product: any) => ({
  ...product,
  clickedOn: product.clickedOn,
  qrCodesGenerated: 0,
  numberOfPurchases: product.numberOfPurchases,
  kioskClickedOn: product.clickedOn,
  kioskNumberOfPurchases: product.numberOfPurchases
})) as KioskProduct[];

describe('ProductGrid', () => {
  const mockOnAddToCart = jest.fn();
  const mockGetItemQuantity = jest.fn(() => 0);
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAddToCart.mockClear();
    mockGetItemQuantity.mockClear();
    mockOnRetry.mockClear();
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

    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Sandwich')).toBeInTheDocument();
    expect(screen.getByText('Cake')).toBeInTheDocument();
    // Pizza is filtered out because quantityInStock = 0
    // Prices are only in aria-label, not displayed as text
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

    const addToCartButtons = screen.getAllByText('🛒 Přidat do košíku');
    await user.click(addToCartButtons[0]); // Click the first button (Coffee)

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

  it('filters out products with no stock', () => {
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

    // Pizza should not be displayed because quantityInStock = 0
    expect(screen.queryByText('Pizza')).not.toBeInTheDocument();
    expect(screen.queryByText('Delicious pizza')).not.toBeInTheDocument();
  });

  it('displays product names correctly', () => {
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

    // Check that product names are displayed
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Sandwich')).toBeInTheDocument();
    expect(screen.getByText('Cake')).toBeInTheDocument();
  });

  it('handles cart quantity display correctly', () => {
    const mockGetItemQuantityWithItems = jest.fn((productId: number) => {
      if (productId === 1) return 2; // Coffee has 2 items in cart
      return 0;
    });

    render(
      <ProductGrid
        products={mockProducts}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantityWithItems}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    // Should show cart quantity for Coffee
    expect(screen.getByText('🛒 V košíku: 2')).toBeInTheDocument();
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

  it('filters out products with zero stock', () => {
    const outOfStockProduct = { ...mockProducts[2], quantityInStock: 0 }; // Pizza is out of stock
    const productsWithOutOfStock = [outOfStockProduct, ...mockProducts.slice(0, 2)];

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

    // Only products with stock > 0 should be displayed
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('Sandwich')).toBeInTheDocument();
    expect(screen.queryByText('Pizza')).not.toBeInTheDocument();
  });

  it('handles products with very high stock', () => {
    const highStockProduct = { ...mockProducts[0], quantityInStock: 999999 };
    const productsWithHighStock = [highStockProduct, ...mockProducts.slice(1)];

    render(
      <ProductGrid
        products={productsWithHighStock}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Coffee')).toBeInTheDocument();
    const addToCartButtons = screen.getAllByText('🛒 Přidat do košíku');
    expect(addToCartButtons[0]).not.toBeDisabled();
  });

  it('handles products with special characters in names', () => {
    const specialCharProduct = { 
      ...mockProducts[0], 
      name: 'Special Product !@#$%^&*()',
      description: 'Product with special characters'
    };
    const productsWithSpecialChars = [specialCharProduct, ...mockProducts.slice(1)];

    render(
      <ProductGrid
        products={productsWithSpecialChars}
        onAddToCart={mockOnAddToCart}
        getItemQuantity={mockGetItemQuantity}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Special Product !@#$%^&*()')).toBeInTheDocument();
  });
});