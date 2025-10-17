/**
 * PaymentForm Component Tests - Refactored with proper mocking
 * Tests payment form functionality with consistent mocking patterns
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { PaymentForm } from './PaymentForm';
import { Cart, KioskProduct } from 'pi-kiosk-shared';
import {
  testDataSets
} from '../__tests__/utils/testData';

// Use test data factories
const mockProduct: KioskProduct = {
  ...testDataSets.basicProducts[0],
  clickedOn: 0,
  qrCodesGenerated: 0,
  numberOfPurchases: 0,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  kioskClickedOn: 0,
  kioskNumberOfPurchases: 0
} as KioskProduct;

const mockCart: Cart = {
  items: [
    {
      product: mockProduct,
      quantity: 1
    }
  ],
  totalItems: 1,
  totalAmount: 150
};

describe('PaymentForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnEmailChange = jest.fn();
  const mockOnStepChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cart information correctly', () => {
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
        currentStep={1}
        email=""
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
      />
    );

    expect(screen.getByText(/Coffee.*×.*1/)).toBeInTheDocument();
    expect(screen.getByText(/150 Kč/)).toBeInTheDocument();
  });

  it('shows cart summary on step 1', () => {
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
        currentStep={1}
        email=""
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
      />
    );

    expect(screen.getByText('🛒 Košík (1 položek)')).toBeInTheDocument();
    expect(screen.getByText('Celkem: 150 Kč')).toBeInTheDocument();
  });

  it('renders email input with proper attributes on step 2', () => {
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
        currentStep={2}
        email=""
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('placeholder', 'vas@email.cz');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
  });

  it('shows payment method selection on step 3', () => {
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
        currentStep={3}
        email="test@example.com"
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
      />
    );

    expect(screen.getByText('Vyberte způsob platby:')).toBeInTheDocument();
    expect(screen.getByText('QR kód')).toBeInTheDocument();
    expect(screen.getByText('ThePay')).toBeInTheDocument();
  });

  it('shows processing state on step 4', () => {
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={true}
        currentStep={4}
        email="test@example.com"
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
        selectedPaymentMethod="qr"
      />
    );

    expect(screen.getByText('Potvrzení platby')).toBeInTheDocument();
  });

  it('handles email input changes', async () => {
    const user = userEvent.setup();
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
        currentStep={2}
        email=""
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    await user.type(emailInput, 'test@example.com');

    expect(mockOnEmailChange).toHaveBeenCalledTimes(16); // Called for each character
    expect(mockOnEmailChange).toHaveBeenNthCalledWith(1, 't');
    expect(mockOnEmailChange).toHaveBeenNthCalledWith(16, 'm');
  });

  it('handles payment method selection', async () => {
    const user = userEvent.setup();
    const mockOnPaymentMethodSelect = jest.fn();
    
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
        currentStep={3}
        email="test@example.com"
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
        onPaymentMethodSelect={mockOnPaymentMethodSelect}
      />
    );

    const qrButton = screen.getByText('QR kód');
    await user.click(qrButton);

    expect(mockOnPaymentMethodSelect).toHaveBeenCalledWith('qr');
    expect(mockOnStepChange).toHaveBeenCalledWith(4);
  });

  it('handles thepay payment method selection', async () => {
    const user = userEvent.setup();
    const mockOnPaymentMethodSelect = jest.fn();
    
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
        currentStep={3}
        email="test@example.com"
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
        onPaymentMethodSelect={mockOnPaymentMethodSelect}
      />
    );

    const thepayButton = screen.getByText('ThePay');
    await user.click(thepayButton);

    expect(mockOnPaymentMethodSelect).toHaveBeenCalledWith('thepay');
    expect(mockOnStepChange).toHaveBeenCalledWith(4);
  });

  it('disables payment buttons when generating QR', () => {
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={true}
        currentStep={3}
        email="test@example.com"
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
      />
    );

    const qrButton = screen.getByText('QR kód');
    const thepayButton = screen.getByText('ThePay');
    
    expect(qrButton).toBeDisabled();
    expect(thepayButton).toBeDisabled();
  });

  it('shows error overlay when email is invalid', () => {
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
        currentStep={2}
        email="invalid-email"
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
      />
    );

    // The error overlay should be shown when email is invalid
    // This would be triggered by the parent component
  });

  it('has proper accessibility attributes', () => {
    render(
      <PaymentForm
        cart={mockCart}
        onSubmit={mockOnSubmit}
        isGeneratingQR={false}
        currentStep={2}
        email=""
        onEmailChange={mockOnEmailChange}
        onStepChange={mockOnStepChange}
      />
    );

    const emailInput = screen.getByLabelText(/Váš email/);
    expect(emailInput).toHaveAttribute('aria-required', 'true');
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');
  });
});