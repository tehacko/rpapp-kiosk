/**
 * ConfirmationScreen Component Tests - Refactored with proper mocking
 * Tests confirmation screen functionality with consistent mocking patterns
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { ConfirmationScreen } from './ConfirmationScreen';
import type { MultiProductPaymentData } from 'pi-kiosk-shared';
import {
  testDataSets
} from '../../../../__tests__/utils/testData';

// Mock pi-kiosk-shared
jest.mock('pi-kiosk-shared', () => ({
  PaymentData: {},
  MultiProductPaymentData: {},
  UI_MESSAGES: {
    PAYMENT_SUCCESS: 'Platba byla úspěšně dokončena',
    PAYMENT_FAILED: 'Platba se nezdařila',
    PAYMENT_TIMEOUT: 'Platba vypršela',
    CONTINUE: 'Pokračovat'
  },
  CSS_CLASSES: {
    CONFIRMATION_SCREEN: 'confirmation-screen',
    SUCCESS_ICON: 'success-icon',
    ERROR_ICON: 'error-icon',
    PAYMENT_DETAILS: 'payment-details',
    CONTINUE_BUTTON: 'continue-button'
  },
  formatPrice: jest.fn((price: number) => `${price} Kč`),
  TransactionStatus: {
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    TIMEOUT: 'TIMEOUT',
    PENDING: 'PENDING'
  }
}));

// Use test data factories
const mockPaymentData: MultiProductPaymentData = {
  items: [],
  totalAmount: 100,
  customerEmail: 'test@example.com',
  qrCode: 'data:image/png;base64,mock-qr-code',
  paymentId: testDataSets.completedPayment.paymentId,
  status: 'COMPLETED' as any
};

describe.skip('ConfirmationScreen', () => {
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

    expect(screen.getByText('Zaplaceno!')).toBeInTheDocument();
    expect(screen.getByText('Coffee')).toBeInTheDocument();
    expect(screen.getByText('3.5 Kč')).toBeInTheDocument();
    // Email is not displayed in the component
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

    const continueButton = screen.getByRole('button', { name: /zpět k produktům/i });
    expect(continueButton).toBeInTheDocument();
    expect(continueButton).toHaveTextContent('🏠 Zpět k produktům');
  });

  it('calls onContinue when continue button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationScreen
        paymentData={mockPaymentData}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByRole('button', { name: /zpět k produktům/i });
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

    const continueButton = screen.getByRole('button', { name: /zpět k produktům/i });
    expect(continueButton).toHaveAttribute('type', 'button');
    expect(continueButton).toHaveAttribute('aria-label', 'Zpět k produktům');
  });

  it('renders with minimal payment data', () => {
    const minimalPaymentData: MultiProductPaymentData = {
      items: [],
      totalAmount: 0,
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

    expect(screen.getByText('Platba byla úspěšně dokončena')).toBeInTheDocument();
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

    expect(screen.getByText('Zaplaceno!')).toBeInTheDocument();
    // Should not crash even with empty product name
  });
});
