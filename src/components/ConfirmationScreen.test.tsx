import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationScreen } from './ConfirmationScreen';
import { PaymentData } from 'pi-kiosk-shared';

const mockPaymentData: PaymentData = {
  productId: 1,
  productName: 'Test Product',
  amount: 150,
  customerEmail: 'test@example.com',
  qrCode: 'SPD*1.0*ACC:1234567890*AM:150*CC:CZK*MSG:Platba za Test Product - test@example.com*X-VS:pay-123456789',
  paymentId: 'pay-123456789'
};

describe('ConfirmationScreen', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders success message and payment details', () => {
    render(
      <ConfirmationScreen
        paymentData={mockPaymentData}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('Platba byla úspěšně zpracována!')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('150 Kč')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows success icon', () => {
    render(
      <ConfirmationScreen
        paymentData={mockPaymentData}
        onContinue={mockOnContinue}
      />
    );

    const successIcon = screen.getByRole('img', { name: 'Success' });
    expect(successIcon).toBeInTheDocument();
    expect(successIcon).toHaveTextContent('✅');
  });

  it('displays payment details in structured format', () => {
    render(
      <ConfirmationScreen
        paymentData={mockPaymentData}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('Detaily platby')).toBeInTheDocument();
    expect(screen.getByText('Produkt:')).toBeInTheDocument();
    expect(screen.getByText('Částka:')).toBeInTheDocument();
    expect(screen.getByText('Email:')).toBeInTheDocument();
  });

  it('shows continue button with correct text', () => {
    render(
      <ConfirmationScreen
        paymentData={mockPaymentData}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByRole('button', { name: /pokračovat v nákupu/i });
    expect(continueButton).toBeInTheDocument();
    expect(continueButton).toHaveTextContent('🏠 Pokračovat v nákupu');
  });

  it('calls onContinue when continue button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationScreen
        paymentData={mockPaymentData}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByRole('button', { name: /pokračovat v nákupu/i });
    await user.click(continueButton);

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it('handles different payment amounts correctly', () => {
    const highAmountPayment = {
      ...mockPaymentData,
      amount: 999.99
    };

    render(
      <ConfirmationScreen
        paymentData={highAmountPayment}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('999.99 Kč')).toBeInTheDocument();
  });

  it('handles different email addresses correctly', () => {
    const differentEmailPayment = {
      ...mockPaymentData,
      customerEmail: 'user@domain.co.uk'
    };

    render(
      <ConfirmationScreen
        paymentData={differentEmailPayment}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('user@domain.co.uk')).toBeInTheDocument();
  });

  it('handles different product names correctly', () => {
    const differentProductPayment = {
      ...mockPaymentData,
      productName: 'Very Long Product Name That Might Wrap'
    };

    render(
      <ConfirmationScreen
        paymentData={differentProductPayment}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('Very Long Product Name That Might Wrap')).toBeInTheDocument();
  });

  it('handles special characters in product name', () => {
    const specialCharPayment = {
      ...mockPaymentData,
      productName: 'Product with Special Chars: @#$%^&*()'
    };

    render(
      <ConfirmationScreen
        paymentData={specialCharPayment}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('Product with Special Chars: @#$%^&*()')).toBeInTheDocument();
  });

  it('handles very long email addresses', () => {
    const longEmailPayment = {
      ...mockPaymentData,
      customerEmail: 'very.long.email.address.that.might.cause.layout.issues@verylongdomainname.com'
    };

    render(
      <ConfirmationScreen
        paymentData={longEmailPayment}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('very.long.email.address.that.might.cause.layout.issues@verylongdomainname.com')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <ConfirmationScreen
        paymentData={mockPaymentData}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByRole('button', { name: /pokračovat v nákupu/i });
    expect(continueButton).toHaveAttribute('type', 'button');
    expect(continueButton).toHaveAttribute('aria-label', 'Pokračovat v nákupu');
  });

  it('renders with minimal payment data', () => {
    const minimalPaymentData: PaymentData = {
      productId: 1,
      productName: 'Minimal Product',
      amount: 0,
      customerEmail: '',
      qrCode: '',
      paymentId: 'pay-minimal'
    };

    render(
      <ConfirmationScreen
        paymentData={minimalPaymentData}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('Platba byla úspěšně zpracována!')).toBeInTheDocument();
    expect(screen.getByText('Minimal Product')).toBeInTheDocument();
    expect(screen.getByText('0 Kč')).toBeInTheDocument();
  });

  it('has proper CSS classes applied', () => {
    const { container } = render(
      <ConfirmationScreen
        paymentData={mockPaymentData}
        onContinue={mockOnContinue}
      />
    );

    expect(container.querySelector('.confirmation-screen')).toBeInTheDocument();
    expect(container.querySelector('.success-icon')).toBeInTheDocument();
    expect(container.querySelector('.confirmation-title')).toBeInTheDocument();
    expect(container.querySelector('.payment-details')).toBeInTheDocument();
    expect(container.querySelector('.continue-btn')).toBeInTheDocument();
  });

  it('handles zero amount correctly', () => {
    const zeroAmountPayment = {
      ...mockPaymentData,
      amount: 0
    };

    render(
      <ConfirmationScreen
        paymentData={zeroAmountPayment}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('0 Kč')).toBeInTheDocument();
  });

  it('handles empty product name gracefully', () => {
    const emptyNamePayment = {
      ...mockPaymentData,
      productName: ''
    };

    render(
      <ConfirmationScreen
        paymentData={emptyNamePayment}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('Platba byla úspěšně zpracována!')).toBeInTheDocument();
    // Should not crash even with empty product name
  });
});
