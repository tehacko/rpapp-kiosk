import { render, screen, fireEvent } from '@testing-library/react';
import { CartHeader } from './CartHeader';

describe('CartHeader', () => {
  const mockOnCheckout = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when cart is not empty', () => {
    render(
      <CartHeader
        isEmpty={false}
        totalItems={3}
        onCheckout={mockOnCheckout}
        onClear={mockOnClear}
      />
    );

    expect(screen.getByText('💳 Zaplatit')).toBeInTheDocument();
    expect(screen.getByText('🛒 Vyprázdnit košík (3)')).toBeInTheDocument();
  });

  it('does not render when cart is empty', () => {
    render(
      <CartHeader
        isEmpty={true}
        totalItems={0}
        onCheckout={mockOnCheckout}
        onClear={mockOnClear}
      />
    );

    expect(screen.queryByText('💳 Zaplatit')).not.toBeInTheDocument();
    expect(screen.queryByText('🛒 Vyprázdnit košík')).not.toBeInTheDocument();
  });

  it('calls onCheckout when checkout button is clicked', () => {
    render(
      <CartHeader
        isEmpty={false}
        totalItems={3}
        onCheckout={mockOnCheckout}
        onClear={mockOnClear}
      />
    );

    fireEvent.click(screen.getByText('💳 Zaplatit'));
    expect(mockOnCheckout).toHaveBeenCalledTimes(1);
  });

  it('calls onClear when clear cart button is clicked', () => {
    render(
      <CartHeader
        isEmpty={false}
        totalItems={3}
        onCheckout={mockOnCheckout}
        onClear={mockOnClear}
      />
    );

    fireEvent.click(screen.getByText('🛒 Vyprázdnit košík (3)'));
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });
});
