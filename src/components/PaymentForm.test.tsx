import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from './PaymentForm';
import { Product } from 'pi-kiosk-shared';

const mockProduct: Product = {
  id: 1,
  name: 'Test Product',
  description: 'A test product for payment',
  price: 150,
  image: '📦',
  imageUrl: 'https://example.com/product.jpg',
  quantityInStock: 5,
  clickedOn: 0,
  numberOfPurchases: 0
};

describe('PaymentForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders product information correctly', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('A test product for payment')).toBeInTheDocument();
    expect(screen.getByText('150 Kč')).toBeInTheDocument();
  });

  it('displays product image correctly', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const image = screen.getByAltText('Test Product');
    expect(image).toHaveAttribute('src', 'https://example.com/product.jpg');
  });

  it('shows emoji fallback when no image URL', () => {
    const productWithoutImage = { ...mockProduct, imageUrl: undefined };
    
    render(
      <PaymentForm
        product={productWithoutImage}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('handles image loading errors', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const image = screen.getByAltText('Test Product');
    fireEvent.error(image);

    // Should show fallback emoji
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('renders email input with proper attributes', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('placeholder', 'vas@email.cz');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
  });

  it('shows submit button with correct text', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const submitButton = screen.getByRole('button', { name: /generovat qr kód/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  it('shows loading state when generating QR', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /generuji qr kód/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Generuji QR kód...')).toBeInTheDocument();
  });

  it('validates email input and shows error', async () => {
    const user = userEvent.setup();
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    const submitButton = screen.getByRole('button', { name: /generovat qr kód/i });

    // Try to submit with invalid email
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Zadejte platnou emailovou adresu')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup();
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    const submitButton = screen.getByRole('button', { name: /generovat qr kód/i });

    // Submit with invalid email to show error
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Zadejte platnou emailovou adresu')).toBeInTheDocument();
    });

    // Start typing again
    await user.clear(emailInput);
    await user.type(emailInput, 'valid@email.com');

    // Error should be cleared
    expect(screen.queryByText('Zadejte platnou emailovou adresu')).not.toBeInTheDocument();
  });

  it('calls onSubmit with valid email', async () => {
    const user = userEvent.setup();
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    const submitButton = screen.getByRole('button', { name: /generovat qr kód/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com');
  });

  it('trims whitespace from email input', async () => {
    const user = userEvent.setup();
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    const submitButton = screen.getByRole('button', { name: /generovat qr kód/i });

    await user.type(emailInput, '  test@example.com  ');
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com');
  });

  it('handles form submission with Enter key', async () => {
    const user = userEvent.setup();
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);

    await user.type(emailInput, 'test@example.com');
    await user.keyboard('{Enter}');

    expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com');
  });

  it('prevents form submission when disabled', async () => {
    const user = userEvent.setup();
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={true}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    const submitButton = screen.getByRole('button', { name: /generuji qr kód/i });

    expect(submitButton).toBeDisabled();

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    expect(emailInput).toHaveAttribute('aria-required', 'true');
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');

    const submitButton = screen.getByRole('button', { name: /generovat qr kód/i });
    expect(submitButton).toHaveAttribute('aria-describedby', 'submit-button-description');
  });

  it('shows accessibility description for submit button', () => {
    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
      />
    );

    expect(screen.getByText('Stiskněte pro vygenerování QR kódu pro platbu')).toBeInTheDocument();
  });

  it('handles error in onSubmit gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    
    const errorOnSubmit = jest.fn().mockImplementation(() => {
      throw new Error('Submit error');
    });

    render(
      <PaymentForm
        product={mockProduct}
        onSubmit={errorOnSubmit}
        isGeneratingQR={false}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    const submitButton = screen.getByRole('button', { name: /generovat qr kód/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    expect(consoleSpy).toHaveBeenCalledWith('Error in PaymentForm.handleSubmit:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});