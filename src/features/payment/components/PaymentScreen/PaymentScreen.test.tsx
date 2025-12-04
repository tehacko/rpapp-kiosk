import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { PaymentScreen } from './PaymentScreen';
import { Cart, KioskProduct } from 'pi-kiosk-shared';
import {
  testDataSets
} from '../../../../__tests__/utils/testData';

// Mock child components
jest.mock('../PaymentForm', () => ({
  PaymentForm: jest.fn(({ cart, email, onEmailChange, onPaymentMethodSelect, onSubmit, currentStep }) => (
    <div data-testid="payment-form">
      <div>Cart items: {cart.items.length}</div>
      <div>Total amount: {cart.totalAmount}</div>
      <div>Step: {currentStep}</div>
      <div>Email: {email}</div>
      <input type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} />
      <button onClick={() => onPaymentMethodSelect('qr')}>Select QR</button>
      <button onClick={() => onPaymentMethodSelect('thepay')}>Select ThePay</button>
      <button onClick={() => onSubmit(cart, email, 'qr')}>Submit Payment</button>
    </div>
  )),
}));

jest.mock('../QRDisplay', () => ({
  QRDisplay: jest.fn(({ qrCodeUrl, paymentData, onCancel }) => (
    <div data-testid="qr-display">
      <div>QR Code: {qrCodeUrl}</div>
      <div>Payment ID: {paymentData.paymentId}</div>
      <button onClick={onCancel}>Cancel QR</button>
    </div>
  )),
}));

jest.mock('../ThePayPayment', () => ({
  ThePayPayment: jest.fn(({ cart, email, kioskId, onPaymentSuccess, onPaymentError, onCancel }) => (
    <div data-testid="thepay-payment">
      <div>ThePay Payment for Kiosk ID: {kioskId}</div>
      <div>Cart Total: {cart.totalAmount}</div>
      <div>Customer Email: {email}</div>
      <button onClick={() => onPaymentSuccess(testDataSets.thePayPaymentData)}>ThePay Success</button>
      <button onClick={() => onPaymentError('ThePay Error')}>ThePay Error</button>
      <button onClick={onCancel}>ThePay Cancel</button>
    </div>
  )),
}));

// Mock useErrorHandler
jest.mock('pi-kiosk-shared', () => ({
  ...(jest.requireActual('pi-kiosk-shared') as any),
  useErrorHandler: jest.fn(() => ({
    handleError: jest.fn(),
    error: null,
    errorMessage: '',
    isErrorVisible: false,
    clearError: jest.fn(),
    retryAction: jest.fn(),
  })),
  validationSchemas: {
    customerEmail: {
      email: jest.fn().mockReturnValue(true),
    },
  },
  validateSchema: jest.fn((_data, _schema) => ({ isValid: true, errors: {} })),
}));

const mockCart: Cart = {
  items: [
    { 
      product: { 
        id: 1, 
        name: 'Product 1', 
        price: 100, 
        description: 'Test', 
        imageUrl: 'test.jpg', 
        clickedOn: 0,
        qrCodesGenerated: 0,
        numberOfPurchases: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        quantityInStock: 5,
        kioskClickedOn: 0,
        kioskNumberOfPurchases: 0
      } as KioskProduct, 
      quantity: 2 
    }
  ],
  totalAmount: 200,
  totalItems: 2
};

const defaultProps = {
  cart: mockCart,
  isCartEmpty: false,
  paymentStep: 1,
  email: 'test@example.com',
  selectedPaymentMethod: undefined,
  qrCodeUrl: '',
  paymentData: null,
  isGeneratingQR: false,
  kioskId: 1,
  monitoringStartTime: null,
  onEmailChange: jest.fn(),
  onPaymentMethodSelect: jest.fn(),
  onPaymentSubmit: jest.fn() as jest.MockedFunction<(cart: Cart, email: string, method: 'qr' | 'thepay') => Promise<void>>,
  onCancelQRPayment: jest.fn(),
  onThePayPaymentSuccess: jest.fn(),
  onThePayPaymentError: jest.fn(),
  onThePayPaymentCancel: jest.fn(),
  onBack: jest.fn(),
  onNext: jest.fn(),
  onStepChange: jest.fn(),
};

describe('PaymentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders payment form when no QR code', () => {
    render(<PaymentScreen {...defaultProps} />);

    expect(screen.getByTestId('payment-form')).toBeInTheDocument();
    expect(screen.getByText('Cart items: 1')).toBeInTheDocument();
    expect(screen.getByText('Step: 1')).toBeInTheDocument();
    expect(screen.getByText('Email: test@example.com')).toBeInTheDocument();
  });

  it('renders QR display when QR code is present', () => {
    const mockPaymentData = { paymentId: 'qr-123', amount: 200, totalAmount: 200, customerEmail: 'test@example.com', qrCode: 'qr-data', items: [] };
    render(<PaymentScreen {...defaultProps} qrCodeUrl="mock-qr-url" paymentData={mockPaymentData} />);

    expect(screen.getByTestId('qr-display')).toBeInTheDocument();
    expect(screen.getByText('QR Code: mock-qr-url')).toBeInTheDocument();
    expect(screen.getByText('Payment ID: qr-123')).toBeInTheDocument();
  });

  it('renders ThePayPayment when selectedPaymentMethod is "thepay" and step is 5', () => {
    render(<PaymentScreen {...defaultProps} selectedPaymentMethod="thepay" paymentStep={5} />);

    expect(screen.getByTestId('thepay-payment')).toBeInTheDocument();
    expect(screen.getByText('ThePay Payment for Kiosk ID: 1')).toBeInTheDocument();
  });

  it('does not render if cart is empty', () => {
    const { container } = render(<PaymentScreen {...defaultProps} isCartEmpty={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onNext when "Další krok" button is clicked', async () => {
    render(<PaymentScreen {...defaultProps} paymentStep={2} />);
    await userEvent.click(screen.getByText('➡️ Další krok'));
    expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when "← Zpět" button is clicked', async () => {
    render(<PaymentScreen {...defaultProps} />);
    await userEvent.click(screen.getByText('← Zpět'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('handles payment form interactions', async () => {
    render(<PaymentScreen {...defaultProps} />);
    
    // Test email change
    const emailInput = screen.getByDisplayValue('test@example.com');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'new@example.com');
    expect(defaultProps.onEmailChange).toHaveBeenCalledWith('new@example.com');

    // Test payment method selection
    await userEvent.click(screen.getByText('Select QR'));
    expect(defaultProps.onPaymentMethodSelect).toHaveBeenCalledWith('qr');

    // Test payment submission
    await userEvent.click(screen.getByText('Submit Payment'));
    expect(defaultProps.onPaymentSubmit).toHaveBeenCalledWith(mockCart, 'test@example.com', 'qr');
  });

  it('handles QR payment cancellation', async () => {
    const mockPaymentData = { paymentId: 'qr-123', amount: 200, totalAmount: 200, customerEmail: 'test@example.com', qrCode: 'qr-data', items: [] };
    render(<PaymentScreen {...defaultProps} qrCodeUrl="mock-qr-url" paymentData={mockPaymentData} />);
    
    await userEvent.click(screen.getByText('Cancel QR'));
    expect(defaultProps.onCancelQRPayment).toHaveBeenCalledTimes(1);
  });

  it('handles ThePay payment interactions', async () => {
    render(<PaymentScreen {...defaultProps} selectedPaymentMethod="thepay" paymentStep={5} />);
    
    // Test ThePay success
    await userEvent.click(screen.getByText('ThePay Success'));
    expect(defaultProps.onThePayPaymentSuccess).toHaveBeenCalledWith(testDataSets.thePayPaymentData);

    // Test ThePay error
    await userEvent.click(screen.getByText('ThePay Error'));
    expect(defaultProps.onThePayPaymentError).toHaveBeenCalledWith('ThePay Error');

    // Test ThePay cancel
    await userEvent.click(screen.getByText('ThePay Cancel'));
    expect(defaultProps.onThePayPaymentCancel).toHaveBeenCalledTimes(1);
  });
});
