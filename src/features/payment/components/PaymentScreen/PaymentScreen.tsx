import { FC } from 'react';
import { Cart as CartType, PaymentData, MultiProductPaymentData } from 'pi-kiosk-shared';
import { PaymentForm } from '../PaymentForm/PaymentForm';
import { QRDisplay } from '../QRDisplay/QRDisplay';
import { ThePayPayment } from '../ThePayPayment/ThePayPayment';

interface PaymentScreenProps {
  cart: CartType;
  isCartEmpty: boolean;
  paymentStep: number;
  email: string;
  selectedPaymentMethod: 'qr' | 'thepay' | undefined;
  qrCodeUrl: string;
  paymentData: PaymentData | MultiProductPaymentData | null;
  isGeneratingQR: boolean;
  kioskId: number;
  onEmailChange: (email: string) => void;
  onPaymentMethodSelect: (method: 'qr' | 'thepay' | undefined) => void;
  onPaymentSubmit: (cart: CartType, email: string, method: 'qr' | 'thepay') => Promise<void>;
  onCancelQRPayment: () => void;
  onThePayPaymentSuccess: (paymentData: PaymentData | MultiProductPaymentData) => void;
  onThePayPaymentError: (error: string) => void;
  onThePayPaymentCancel: () => void;
  onBack: () => void;
  onNext: () => void;
  onStepChange: (step: number) => void;
}

export const PaymentScreen: FC<PaymentScreenProps> = ({
  cart,
  isCartEmpty,
  paymentStep,
  email,
  selectedPaymentMethod,
  qrCodeUrl,
  paymentData,
  isGeneratingQR,
  kioskId,
  onEmailChange,
  onPaymentMethodSelect,
  onPaymentSubmit,
  onCancelQRPayment,
  onThePayPaymentSuccess,
  onThePayPaymentError,
  onThePayPaymentCancel,
  onBack,
  onNext,
  onStepChange,
}) => {

  if (isCartEmpty) {
    return null; // Should not render if cart is empty
  }

  return (
    <div className="payment-screen-overlay">
      <div className="payment-screen-content">
        {/* Payment Header with Back Button */}
        <div className="payment-header">
          <div className="cart-buttons-header">
            {paymentStep !== 3 && paymentStep !== 4 && (
              <button onClick={onNext} className="checkout-btn-header" type="button">
                {paymentStep === 2 ? '➡️ Další krok' : '💳 Zaplatit'}
              </button>
            )}
            <button onClick={onBack} className="clear-cart-btn-header" type="button">
              ← Zpět
            </button>
          </div>
        </div>

        {!qrCodeUrl && (
          <PaymentForm
            cart={cart}
            onSubmit={onPaymentSubmit}
            isGeneratingQR={isGeneratingQR}
            currentStep={paymentStep}
            email={email}
            onEmailChange={onEmailChange}
            onStepChange={onStepChange}
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodSelect={onPaymentMethodSelect}
          />
        )}

        {qrCodeUrl && paymentData && (
          <QRDisplay qrCodeUrl={qrCodeUrl} paymentData={paymentData} onCancel={onCancelQRPayment} />
        )}

        {/* ThePay Payment Component */}
        {selectedPaymentMethod === 'thepay' && paymentStep === 5 && !qrCodeUrl && (
          <ThePayPayment
            cart={cart}
            email={email}
            kioskId={kioskId}
            onPaymentSuccess={onThePayPaymentSuccess}
            onPaymentError={onThePayPaymentError}
            onCancel={onThePayPaymentCancel}
          />
        )}
      </div>
    </div>
  );
};
