import { ErrorScreen, FullscreenButton } from '../../../../shared/components';
import { useKioskOrchestration } from '../../hooks';
import { KioskScreenRouter } from '../KioskScreenRouter';
import styles from './KioskApp.module.css';

// PaymentsUnavailableScreen - not lazy loaded since it's a critical error state
import { PaymentsUnavailableScreen } from '../../../payment/components/PaymentsUnavailableScreen/PaymentsUnavailableScreen';

export function KioskApp(): JSX.Element {
  const {
    screen,
    allPaymentsUnavailable,
    showFullscreenButton,
    navigateToProducts,
    productsVM,
    paymentVM,
    confirmationVM,
    errorVM
  } = useKioskOrchestration();

  if (errorVM.showError) {
    return (
      <div className={`${styles.kioskApp} ${styles.kioskMode}`} data-testid="kiosk-error-screen">
        <ErrorScreen
          title={errorVM.isKioskDeleted ? 'Kiosk byl smazán' : 'Chyba konfigurace kiosku'}
          message={errorVM.errorMessage}
          instructions={
            !errorVM.isKioskDeleted ? (
              <div className={styles.errorInstructions}>
                <h3>Jak opravit:</h3>
                <ol>
                  <li>
                    Přidejte <code>?kioskId=X</code> na konec URL
                  </li>
                  <li>Nahraďte X číslem vašeho kiosku (např. 1, 2, 3...)</li>
                  <li>
                    Příklad: <code>https://your-domain.com?kioskId=1</code>
                  </li>
                </ol>
              </div>
            ) : (
              <div className={styles.errorInstructions}>
                <p>Kiosk byl smazán z databáze. Kontaktujte administrátora.</p>
              </div>
            )
          }
          action={
            <button onClick={() => window.location.reload()} className={styles.retryBtn}>
              🔄 Zkusit znovu
            </button>
          }
        />
      </div>
    );
  }

  if (allPaymentsUnavailable) {
    return (
      <div className={`${styles.kioskApp} ${styles.kioskMode}`}>
        <PaymentsUnavailableScreen />
      </div>
    );
  }

  return (
    <div className={`${styles.kioskApp} ${styles.kioskMode}`}>
      <KioskScreenRouter
        screen={screen}
        productsVM={productsVM}
        paymentVM={paymentVM}
        confirmationVM={confirmationVM}
        navigateToProducts={navigateToProducts}
      />

      {/* Fullscreen Button - Only show on kiosk screens */}
      {showFullscreenButton && (
        <FullscreenButton />
      )}
    </div>
  );
}