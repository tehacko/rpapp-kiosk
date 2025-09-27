import { render, screen } from '@testing-library/react';
import { QRDisplay } from './QRDisplay';
import { PaymentData } from 'pi-kiosk-shared';

// Mock the shared package
jest.mock('pi-kiosk-shared', () => ({
  ...jest.requireActual('pi-kiosk-shared'),
  UI_MESSAGES: {
    PAYMENT_WAITING: 'Čekám na platbu...'
  },
  CSS_CLASSES: {
    CARD: 'card',
    LOADING: 'loading'
  },
  formatPrice: (amount: number) => `${amount} Kč`
}));

const mockPaymentData: PaymentData = {
  productId: 1,
  productName: 'Test Product',
  amount: 150,
  customerEmail: 'test@example.com',
  qrCode: 'SPD*1.0*ACC:1234567890*AM:150*CC:CZK*MSG:Platba za Test Product - test@example.com*X-VS:pay-123456789',
  paymentId: 'pay-123456789'
};

describe('QRDisplay', () => {
  it('renders QR code and payment information correctly', () => {
    render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={mockPaymentData}
      />
    );

    expect(screen.getByText('Naskenujte QR kód pro platbu')).toBeInTheDocument();
    expect(screen.getByAltText('QR Code pro platbu')).toBeInTheDocument();
    expect(screen.getByText('150 Kč')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Čekám na platbu...')).toBeInTheDocument();
  });

  it('displays QR code image with correct attributes', () => {
    render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={mockPaymentData}
      />
    );

    const qrImage = screen.getByAltText('QR Code pro platbu');
    expect(qrImage).toHaveAttribute('src', 'data:image/png;base64,mock-qr-code');
    expect(qrImage).toHaveAttribute('loading', 'lazy');
  });

  it('shows payment details in structured format', () => {
    render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={mockPaymentData}
      />
    );

    // Check for structured payment info
    expect(screen.getByText('Částka:')).toBeInTheDocument();
    expect(screen.getByText('150 Kč')).toBeInTheDocument();
    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows loading spinner and waiting message', () => {
    const { container } = render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={mockPaymentData}
      />
    );

    expect(screen.getByText('Čekám na platbu...')).toBeInTheDocument();
    // Check for loading spinner element
    const spinner = container.querySelector('.loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('handles different payment amounts correctly', () => {
    const highAmountPayment = {
      ...mockPaymentData,
      amount: 999.99
    };

    render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={highAmountPayment}
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
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={differentEmailPayment}
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
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={differentProductPayment}
      />
    );

    // QRDisplay component doesn't show product name, so we just verify it renders without error
    expect(screen.getByText('Naskenujte QR kód pro platbu')).toBeInTheDocument();
  });

  it('has proper CSS classes applied', () => {
    const { container } = render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={mockPaymentData}
      />
    );

    expect(container.querySelector('.qr-section')).toBeInTheDocument();
    expect(container.querySelector('.qr-code-container')).toBeInTheDocument();
    expect(container.querySelector('.qr-code')).toBeInTheDocument();
    expect(container.querySelector('.payment-info')).toBeInTheDocument();
    expect(container.querySelector('.payment-status')).toBeInTheDocument();
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
      <QRDisplay
        qrCodeUrl="data:image/png;base64,minimal-qr"
        paymentData={minimalPaymentData}
      />
    );

    expect(screen.getByText('0 Kč')).toBeInTheDocument();
    // QRDisplay component doesn't show product name, so we just verify it renders without error
    expect(screen.getByText('Naskenujte QR kód pro platbu')).toBeInTheDocument();
  });

  it('handles special characters in product name', () => {
    const specialCharPayment = {
      ...mockPaymentData,
      productName: 'Product with Special Chars: @#$%^&*()'
    };

    render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={specialCharPayment}
      />
    );

    // QRDisplay component doesn't show product name, so we just verify it renders without error
    expect(screen.getByText('Naskenujte QR kód pro platbu')).toBeInTheDocument();
  });

  it('handles very long email addresses', () => {
    const longEmailPayment = {
      ...mockPaymentData,
      customerEmail: 'very.long.email.address.that.might.cause.layout.issues@verylongdomainname.com'
    };

    render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={longEmailPayment}
      />
    );

    expect(screen.getByText('very.long.email.address.that.might.cause.layout.issues@verylongdomainname.com')).toBeInTheDocument();
  });
});
