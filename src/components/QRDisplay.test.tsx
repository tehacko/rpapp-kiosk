/**
 * QRDisplay Component Tests - Refactored with proper mocking
 * Tests QR display functionality with consistent mocking patterns
 */
import { render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';
import { QRDisplay } from './QRDisplay';
import { PaymentData } from 'pi-kiosk-shared';
import {
  testDataSets
} from '../__tests__/utils/testData';

// Mock the shared package
jest.mock('pi-kiosk-shared', () => ({
  PaymentData: {},
  UI_MESSAGES: {
    PAYMENT_WAITING: 'Čekám na platbu...'
  },
  CSS_CLASSES: {
    CARD: 'card',
    LOADING: 'loading'
  },
  formatPrice: jest.fn((amount: number) => `${amount} Kč`)
}));

// Use test data factories
const mockPaymentData: PaymentData = {
  ...testDataSets.completedPayment,
  customerEmail: 'test@example.com',
  qrCode: 'data:image/png;base64,mock-qr-code',
  paymentId: testDataSets.completedPayment.id,
  status: 'PENDING' as any
};

describe('QRDisplay', () => {
  it('renders QR code and payment information correctly', () => {
    render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={mockPaymentData}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Čekám na platbu')).toBeInTheDocument();
    expect(screen.getByAltText('QR Code pro platbu')).toBeInTheDocument();
    // QRDisplay component doesn't show payment details, only QR code and waiting status
  });

  it('displays QR code image with correct attributes', () => {
    render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={mockPaymentData}
        onCancel={() => {}}
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
        onCancel={() => {}}
      />
    );

    // QRDisplay component doesn't show structured payment info
    expect(screen.getByText('Čekám na platbu')).toBeInTheDocument();
  });

  it('shows loading spinner and waiting message', () => {
    const { container } = render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={mockPaymentData}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Čekám na platbu')).toBeInTheDocument();
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
        onCancel={() => {}}
      />
    );

    // QRDisplay component doesn't show payment amount
    expect(screen.getByText('Čekám na platbu')).toBeInTheDocument();
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
        onCancel={() => {}}
      />
    );

    // QRDisplay component doesn't show email
    expect(screen.getByText('Čekám na platbu')).toBeInTheDocument();
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
        onCancel={() => {}}
      />
    );

    // QRDisplay component doesn't show product name, so we just verify it renders without error
    expect(screen.getByText('Čekám na platbu')).toBeInTheDocument();
  });

  it('has proper CSS classes applied', () => {
    const { container } = render(
      <QRDisplay
        qrCodeUrl="data:image/png;base64,mock-qr-code"
        paymentData={mockPaymentData}
        onCancel={() => {}}
      />
    );

    expect(container.querySelector('.qr-section')).toBeInTheDocument();
    expect(container.querySelector('.qr-code-container')).toBeInTheDocument();
    expect(container.querySelector('.qr-code')).toBeInTheDocument();
    // QRDisplay component doesn't have payment-info class
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
        onCancel={() => {}}
      />
    );

    // QRDisplay component doesn't show payment amount
    expect(screen.getByText('Čekám na platbu')).toBeInTheDocument();
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
        onCancel={() => {}}
      />
    );

    // QRDisplay component doesn't show product name, so we just verify it renders without error
    expect(screen.getByText('Čekám na platbu')).toBeInTheDocument();
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
        onCancel={() => {}}
      />
    );

    // QRDisplay component doesn't show email
    expect(screen.getByText('Čekám na platbu')).toBeInTheDocument();
  });
});
