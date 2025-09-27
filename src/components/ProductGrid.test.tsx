import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductGrid } from './ProductGrid';
import { Product } from 'pi-kiosk-shared';

const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Test Product 1',
    description: 'A test product',
    price: 100,
    image: '📦',
    imageUrl: undefined,
    quantityInStock: 5,
    clickedOn: 0,
    numberOfPurchases: 0
  },
  {
    id: 2,
    name: 'Test Product 2',
    description: 'Another test product',
    price: 200,
    image: '🍕',
    imageUrl: 'https://example.com/image.jpg',
    quantityInStock: 3,
    clickedOn: 0,
    numberOfPurchases: 0
  },
  {
    id: 3,
    name: 'Low Stock Product',
    description: 'A product with low stock',
    price: 150,
    image: '🥤',
    imageUrl: undefined,
    quantityInStock: 2,
    clickedOn: 0,
    numberOfPurchases: 0
  }
];

describe('ProductGrid', () => {
  const mockOnSelectProduct = jest.fn();
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders products correctly', () => {
    render(
      <ProductGrid
        products={mockProducts}
        onSelectProduct={mockOnSelectProduct}
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
        onSelectProduct={mockOnSelectProduct}
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
        onSelectProduct={mockOnSelectProduct}
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
        onSelectProduct={mockOnSelectProduct}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Žádné produkty nejsou k dispozici')).toBeInTheDocument();
  });

  it('calls onSelectProduct when product is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ProductGrid
        products={mockProducts}
        onSelectProduct={mockOnSelectProduct}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    const productCard = screen.getByText('Test Product 1').closest('.product-card');
    await user.click(productCard!);

    expect(mockOnSelectProduct).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('calls onSelectProduct when product is activated with keyboard', async () => {
    const user = userEvent.setup();
    render(
      <ProductGrid
        products={mockProducts}
        onSelectProduct={mockOnSelectProduct}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    const productCard = screen.getByText('Test Product 1').closest('.product-card');
    (productCard as HTMLElement).focus();
    await user.keyboard('{Enter}');

    expect(mockOnSelectProduct).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('calls onSelectProduct when product is activated with space key', async () => {
    const user = userEvent.setup();
    render(
      <ProductGrid
        products={mockProducts}
        onSelectProduct={mockOnSelectProduct}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    const productCard = screen.getByText('Test Product 1').closest('.product-card');
    (productCard as HTMLElement).focus();
    await user.keyboard(' ');

    expect(mockOnSelectProduct).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const error = new Error('Failed to load products');
    render(
      <ProductGrid
        products={[]}
        onSelectProduct={mockOnSelectProduct}
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
        onSelectProduct={mockOnSelectProduct}
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
        onSelectProduct={mockOnSelectProduct}
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
        onSelectProduct={mockOnSelectProduct}
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
        onSelectProduct={mockOnSelectProduct}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    const productCards = screen.getAllByRole('button');
    expect(productCards).toHaveLength(3);

    productCards.forEach((card, index) => {
      expect(card).toHaveAttribute('aria-label', `Select ${mockProducts[index].name} for ${mockProducts[index].price} Kč`);
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  it('handles error in onSelectProduct gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    
    const errorOnSelect = jest.fn().mockImplementation(() => {
      throw new Error('Selection error');
    });

    render(
      <ProductGrid
        products={mockProducts}
        onSelectProduct={errorOnSelect}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    const productCard = screen.getByText('Test Product 1').closest('.product-card');
    await user.click(productCard!);

    expect(consoleSpy).toHaveBeenCalledWith('Error selecting product:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});