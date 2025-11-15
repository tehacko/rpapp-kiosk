import React, { FC, Suspense, lazy } from 'react';
import { Cart as CartType, PaymentData, MultiProductPaymentData, formatPrice } from 'pi-kiosk-shared';
import { PaymentForm } from '../PaymentForm/PaymentForm';
import styles from './PaymentScreen.module.css';

// Lazy load heavy payment feature components
const QRDisplay = lazy(() =>
  import('../QRDisplay/QRDisplay').then(module => ({
    default: module.QRDisplay,
  }))
);

const ThePayPayment = lazy(() =>
  import('../ThePayPayment/ThePayPayment').then(module => ({
    default: module.ThePayPayment,
  }))
);

// Loading fallback for payment components
function PaymentComponentLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

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
  monitoringStartTime: number | null;
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

function PaymentScreenComponent({
  cart,
  isCartEmpty,
  paymentStep,
  email,
  selectedPaymentMethod,
  qrCodeUrl,
  paymentData,
  isGeneratingQR,
  kioskId,
  monitoringStartTime,
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
}: PaymentScreenProps) {
  if (isCartEmpty) {
    return null; // Should not render if cart is empty
  }

  return (
    <div className={styles.paymentScreenOverlay}>
      <div className={styles.paymentScreenContent}>
        {/* Scrollable Content Area */}
        <div className={styles.paymentContentScrollable}>
          {/* PaymentForm - Don't show when ThePay is active on step 5 */}
          {!qrCodeUrl && !(selectedPaymentMethod === 'thepay' && paymentStep === 5) && (
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
            <Suspense fallback={<PaymentComponentLoader />}>
            <QRDisplay 
              qrCodeUrl={qrCodeUrl} 
              paymentData={paymentData} 
              onCancel={onCancelQRPayment}
              showTimer={selectedPaymentMethod === 'qr'} // Show timer only for FIO QR payments
              monitoringStartTime={monitoringStartTime} // Pass monitoring start time for synchronized timer
            />
            </Suspense>
          )}

          {/* ThePay Payment Component */}
          {selectedPaymentMethod === 'thepay' && paymentStep === 5 && !qrCodeUrl && (
            <Suspense fallback={<PaymentComponentLoader />}>
            <ThePayPayment
              cart={cart}
              email={email}
              kioskId={kioskId}
              onPaymentSuccess={onThePayPaymentSuccess}
              onPaymentError={onThePayPaymentError}
              onCancel={onThePayPaymentCancel}
            />
            </Suspense>
          )}
        </div>

        {/* Show total price above buttons on step 1 */}
        {!qrCodeUrl && paymentStep === 1 && cart && (
          <div className={`${styles.cartTotalBar} ${
            cart.items.length === 1 ? styles.size1 :
            cart.items.length === 2 ? styles.size2 :
            cart.items.length === 3 ? styles.size3 :
            ''
          }`}>
            <strong>Celkem: {formatPrice(cart.totalAmount)}</strong>
          </div>
        )}

        {/* Fixed Bottom Button Bar - Always visible on steps 1-3 */}
        {!qrCodeUrl && paymentStep !== 5 && (
          <div className={`${styles.paymentButtonsBar} ${
            paymentStep === 1 && cart.items.length === 1 ? styles.size1 :
            paymentStep === 1 && cart.items.length === 2 ? styles.size2 :
            paymentStep === 1 && cart.items.length === 3 ? styles.size3 :
            ''
          }`}>
            <div className={styles.cartButtonsHeader}>
              <button onClick={onBack} className={styles.clearCartBtnHeader} type="button">
                ← Zpět
              </button>
              {paymentStep !== 3 && (
                <button onClick={onNext} className={styles.checkoutBtnHeader} type="button">
                  {paymentStep === 1 || paymentStep === 2 ? '➡️ Další krok' : '💳 Zaplatit'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export memoized PaymentScreen
export const PaymentScreen = React.memo<PaymentScreenProps>(PaymentScreenComponent, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.cart === nextProps.cart &&
    prevProps.isCartEmpty === nextProps.isCartEmpty &&
    prevProps.paymentStep === nextProps.paymentStep &&
    prevProps.email === nextProps.email &&
    prevProps.selectedPaymentMethod === nextProps.selectedPaymentMethod &&
    prevProps.qrCodeUrl === nextProps.qrCodeUrl &&
    prevProps.paymentData === nextProps.paymentData &&
    prevProps.isGeneratingQR === nextProps.isGeneratingQR &&
    prevProps.kioskId === nextProps.kioskId &&
    prevProps.monitoringStartTime === nextProps.monitoringStartTime &&
    prevProps.onEmailChange === nextProps.onEmailChange &&
    prevProps.onPaymentMethodSelect === nextProps.onPaymentMethodSelect &&
    prevProps.onPaymentSubmit === nextProps.onPaymentSubmit &&
    prevProps.onCancelQRPayment === nextProps.onCancelQRPayment &&
    prevProps.onThePayPaymentSuccess === nextProps.onThePayPaymentSuccess &&
    prevProps.onThePayPaymentError === nextProps.onThePayPaymentError &&
    prevProps.onThePayPaymentCancel === nextProps.onThePayPaymentCancel &&
    prevProps.onBack === nextProps.onBack &&
    prevProps.onNext === nextProps.onNext &&
    prevProps.onStepChange === nextProps.onStepChange
  );
});

PaymentScreen.displayName = 'PaymentScreen';
