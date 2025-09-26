// Tests for PaymentForm component
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from './PaymentForm';
import { Product } from 'pi-kiosk-shared';

const mockProduct: Product = {
  id: 1,
  name: 'Test Pizza',
  description: 'Delicious test pizza',
  price: 250,
  image: '🍕',
  quantityInStock: 10,
  clickedOn: 0,
  numberOfPurchases: 0
};

describe('PaymentForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders product information correctly', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    expect(screen.getByText('Test Pizza')).toBeInTheDocument();
    expect(screen.getByText('Delicious test pizza')).toBeInTheDocument();
    expect(screen.getByText('250 Kč')).toBeInTheDocument();
    expect(screen.getByText('🍕')).toBeInTheDocument();
  });

  test('renders email input with proper attributes', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/váš email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('placeholder', 'vas@email.cz');
  });

  test('validates email and shows error for invalid email', async () => {
    const user = userEvent.setup();
    
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/váš email/i);
    const submitButton = screen.getByText('Generovat QR kód');

    // Try to submit with invalid email
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Zadejte platnou emailovou adresu')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('validates email and shows error for empty email', async () => {
    const user = userEvent.setup();
    
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const submitButton = screen.getByText('Generovat QR kód');

    // Try to submit without email
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Toto pole je povinné')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('submits form with valid email', async () => {
    const user = userEvent.setup();
    
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/váš email/i);
    const submitButton = screen.getByText('Generovat QR kód');

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com');
    });
  });

  test('clears error when user starts typing', async () => {
    const user = userEvent.setup();
    
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/váš email/i);
    const submitButton = screen.getByText('Generovat QR kód');

    // First, trigger an error
    await user.type(emailInput, 'invalid');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Zadejte platnou emailovou adresu')).toBeInTheDocument();
    });

    // Then start typing to clear the error
    await user.clear(emailInput);
    await user.type(emailInput, 'test@');

    await waitFor(() => {
      expect(screen.queryByText('Zadejte platnou emailovou adresu')).not.toBeInTheDocument();
    });
  });

  test('disables form when generating QR', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={true}
      />
    );

    const emailInput = screen.getByLabelText(/váš email/i);
    const submitButton = screen.getByText('Generuji QR kód...');

    expect(emailInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  test('shows loading state in submit button when generating QR', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={true}
      />
    );

    expect(screen.getByText('Generuji QR kód...')).toBeInTheDocument();
    expect(screen.queryByText('Generovat QR kód')).not.toBeInTheDocument();
  });
});
