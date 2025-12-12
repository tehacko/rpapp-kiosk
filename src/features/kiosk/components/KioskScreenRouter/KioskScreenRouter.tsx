import { Suspense, lazy } from 'react';
import { ErrorBoundary, ErrorScreen, LoadingSpinner } from '../../../../shared/components';
import type { KioskViewModel } from '../../hooks/useKioskOrchestration';

const ProductsScreen = lazy(() =>
  import('../../../products/components/ProductsScreen/ProductsScreen').then(module => ({
    default: module.ProductsScreen,
  }))
);

const PaymentScreen = lazy(() =>
  import('../../../payment/components/PaymentScreen/PaymentScreen').then(module => ({
    default: module.PaymentScreen,
  }))
);

const ConfirmationScreen = lazy(() =>
  import('../../../payment/components/ConfirmationScreen/ConfirmationScreen').then(module => ({
    default: module.ConfirmationScreen,
  }))
);

type KioskScreenRouterProps = Pick<
  KioskViewModel,
  'screen' | 'productsVM' | 'paymentVM' | 'confirmationVM' | 'navigateToProducts'
>;

export function KioskScreenRouter({
  screen,
  productsVM,
  paymentVM,
  confirmationVM,
  navigateToProducts
}: KioskScreenRouterProps): JSX.Element {
  return (
    <>
      {screen === 'products' && (
        <ErrorBoundary
          fallback={
            <ErrorScreen
              title="Chyba při načítání produktů"
              instructions={<p>Omlouváme se, došlo k chybě při načítání produktů.</p>}
              action={<button onClick={() => window.location.reload()}>Zkusit znovu</button>}
              fullHeight={false}
            />
          }
        >
          <Suspense fallback={<LoadingSpinner message="Načítám produkty..." />}>
            <ProductsScreen
              products={productsVM.products}
              onAddToCart={productsVM.onAddToCart}
              getItemQuantity={productsVM.getItemQuantity}
              isLoading={productsVM.isLoading}
              error={productsVM.error}
              onRetry={productsVM.onRetry}
              isCartEmpty={productsVM.isCartEmpty}
              totalItems={productsVM.totalItems}
              onCheckout={productsVM.onCheckout}
              onClearCart={productsVM.onClearCart}
              isConnected={productsVM.isConnected}
              qrCodeUrl={productsVM.qrCodeUrl}
              allPaymentsUnavailable={productsVM.allPaymentsUnavailable}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {screen === 'payment' && !paymentVM.isCartEmpty && (
        <ErrorBoundary
          fallback={
            <ErrorScreen
              title="Chyba při načítání platby"
              instructions={<p>Omlouváme se, došlo k chybě při načítání platební obrazovky.</p>}
              action={
                <button onClick={navigateToProducts}>
                  Zpět na produkty
                </button>
              }
              fullHeight={false}
            />
          }
        >
          <Suspense fallback={<LoadingSpinner message="Načítám platbu..." />}>
            <PaymentScreen
              cart={paymentVM.cart}
              isCartEmpty={paymentVM.isCartEmpty}
              paymentStep={paymentVM.paymentStep}
              email={paymentVM.email}
              selectedPaymentMethod={paymentVM.selectedPaymentMethod}
              qrCodeUrl={paymentVM.qrCodeUrl}
              paymentData={paymentVM.paymentData}
              isGeneratingQR={paymentVM.isGeneratingQR}
              kioskId={paymentVM.kioskId}
              monitoringStartTime={paymentVM.monitoringStartTime}
              onEmailChange={paymentVM.onEmailChange}
              onPaymentMethodSelect={paymentVM.onPaymentMethodSelect}
              onPaymentSubmit={paymentVM.onPaymentSubmit}
              onCancelQRPayment={paymentVM.onCancelQRPayment}
              onThePayPaymentSuccess={paymentVM.onThePayPaymentSuccess}
              onThePayPaymentError={paymentVM.onThePayPaymentError}
              onThePayPaymentCancel={paymentVM.onThePayPaymentCancel}
              onBack={paymentVM.onBack}
              onNext={paymentVM.onNext}
              onStepChange={paymentVM.onStepChange}
              qrProviderStatus={paymentVM.qrProviderStatus}
              thepayProviderStatus={paymentVM.thepayProviderStatus}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {screen === 'confirmation' && confirmationVM.paymentData && (
        <ErrorBoundary
          fallback={
            <ErrorScreen
              title="Chyba při načítání potvrzení"
              instructions={<p>Omlouváme se, došlo k chybě při načítání potvrzovací obrazovky.</p>}
              action={
                <button
                  onClick={confirmationVM.onContinue}
                >
                  Zpět na produkty
                </button>
              }
              fullHeight={false}
            />
          }
        >
          <Suspense fallback={<LoadingSpinner message="Načítám potvrzení..." />}>
            <ConfirmationScreen
              paymentData={confirmationVM.paymentData}
              onContinue={confirmationVM.onContinue}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}
