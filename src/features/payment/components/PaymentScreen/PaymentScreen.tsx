import React, { Suspense, lazy } from 'react';
import type { Cart as CartType, PaymentData, MultiProductPaymentData } from 'pi-kiosk-shared';
import { PaymentForm } from '../PaymentForm/PaymentForm';
import type { ProviderStatus } from '../../hooks/usePaymentProviderStatus';
import { LoadingSpinner } from '../../../../shared/components';
import { CartTotalBar, PaymentNavigationBar } from './components';
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
  /** Provider status for QR payments (from usePaymentProviderStatus) */
  qrProviderStatus?: ProviderStatus | null;
  /** Provider status for ThePay payments (from usePaymentProviderStatus) */
  thepayProviderStatus?: ProviderStatus | null;
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
  qrProviderStatus,
  thepayProviderStatus,
}: PaymentScreenProps): JSX.Element | null {
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
              qrProviderStatus={qrProviderStatus}
              thepayProviderStatus={thepayProviderStatus}
            />
          )}

          {qrCodeUrl && paymentData && (
            <Suspense fallback={<LoadingSpinner fullHeight={false} message="" />}>
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
            <Suspense fallback={<LoadingSpinner fullHeight={false} message="" />}>
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
        <CartTotalBar 
          cart={cart} 
          show={!qrCodeUrl && paymentStep === 1} 
        />

        {/* Fixed Bottom Button Bar - Always visible on steps 1-3 */}
        <PaymentNavigationBar
          paymentStep={paymentStep}
          cart={cart}
          show={!qrCodeUrl && paymentStep !== 5}
          onBack={onBack}
          onNext={onNext}
        />
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
    prevProps.onStepChange === nextProps.onStepChange &&
    // Provider status props - must compare for re-render when availability changes
    prevProps.qrProviderStatus?.available === nextProps.qrProviderStatus?.available &&
    prevProps.thepayProviderStatus?.available === nextProps.thepayProviderStatus?.available
  );
});

PaymentScreen.displayName = 'PaymentScreen';
