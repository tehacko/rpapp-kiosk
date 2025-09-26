// Tests for ProductGrid component
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductGrid } from './ProductGrid';
import { Product } from 'pi-kiosk-shared';

const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Test Product 1',
    description: 'Test description 1',
    price: 100,
    image: '🍕',
    quantityInStock: 10,
    clickedOn: 0,
    numberOfPurchases: 0
  },
  {
    id: 2,
    name: 'Test Product 2',
    description: 'Test description 2',
    price: 200,
    imageUrl: 'https://example.com/image.jpg',
    quantityInStock: 5,
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

  test('renders loading state', () => {
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
  });

  test('renders error state with retry button', () => {
    const error = new Error('Network error');
    
    render(
      <ProductGrid
        products={[]}
        onSelectProduct={mockOnSelectProduct}
        isLoading={false}
        error={error}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('🔄 Zkusit znovu')).toBeInTheDocument();

    fireEvent.click(screen.getByText('🔄 Zkusit znovu'));
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  test('renders empty state', () => {
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

  test('renders products correctly', () => {
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
    expect(screen.getByText('100 Kč')).toBeInTheDocument();
    expect(screen.getByText('200 Kč')).toBeInTheDocument();
  });

  test('calls onSelectProduct when product is clicked', () => {
    render(
      <ProductGrid
        products={mockProducts}
        onSelectProduct={mockOnSelectProduct}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.click(screen.getByText('Test Product 1'));
    expect(mockOnSelectProduct).toHaveBeenCalledWith(mockProducts[0]);
  });

  test('shows low stock indicator for products with 5 or fewer items', () => {
    render(
      <ProductGrid
        products={mockProducts}
        onSelectProduct={mockOnSelectProduct}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('⚠️ Pouze 5 ks')).toBeInTheDocument();
    expect(screen.queryByText('⚠️ Pouze 10 ks')).not.toBeInTheDocument();
  });

  test('handles keyboard navigation', () => {
    render(
      <ProductGrid
        products={mockProducts}
        onSelectProduct={mockOnSelectProduct}
        isLoading={false}
        error={null}
        onRetry={mockOnRetry}
      />
    );

    const firstProduct = screen.getByText('Test Product 1').closest('[role="button"]');
    
    fireEvent.keyDown(firstProduct!, { key: 'Enter' });
    expect(mockOnSelectProduct).toHaveBeenCalledWith(mockProducts[0]);

    fireEvent.keyDown(firstProduct!, { key: ' ' });
    expect(mockOnSelectProduct).toHaveBeenCalledTimes(2);
  });
});
