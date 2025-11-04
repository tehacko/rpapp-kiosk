import { FC } from 'react';
import { Cart as CartType, PaymentData, MultiProductPaymentData, formatPrice } from 'pi-kiosk-shared';
import { PaymentForm } from '../PaymentForm/PaymentForm';
import { QRDisplay } from '../QRDisplay/QRDisplay';
import { ThePayPayment } from '../ThePayPayment/ThePayPayment';
import styles from './PaymentScreen.module.css';

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
    <div className={styles.paymentScreenOverlay}>
      <div className={styles.paymentScreenContent}>
        {/* Scrollable Content Area */}
        <div className={styles.paymentContentScrollable}>
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

        {/* Show total price above buttons on step 1 */}
        {!qrCodeUrl && paymentStep === 1 && cart && (
          <div className={styles.cartTotalBar}>
            <strong>Celkem: {formatPrice(cart.totalAmount)}</strong>
          </div>
        )}

        {/* Fixed Bottom Button Bar - Always visible on steps 1-3 */}
        {!qrCodeUrl && paymentStep !== 5 && (
          <div className={styles.paymentButtonsBar}>
            <div className={styles.cartButtonsHeader}>
              {paymentStep !== 3 && (
                <button onClick={onNext} className={styles.checkoutBtnHeader} type="button">
                  {paymentStep === 1 || paymentStep === 2 ? '➡️ Další krok' : '💳 Zaplatit'}
                </button>
              )}
              <button onClick={onBack} className={styles.clearCartBtnHeader} type="button">
                ← Zpět
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
