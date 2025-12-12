import styles from './PaymentSuccessScreen.module.css';

export type PaymentStatus = 'success' | 'failed' | 'cancelled' | 'timeout';

interface PaymentSuccessScreenProps {
  status: PaymentStatus;
  customerEmail?: string;
  countdown?: number | null;
  onContinue: () => void;
}

export function PaymentSuccessScreen({
  status,
  customerEmail,
  countdown,
  onContinue
}: PaymentSuccessScreenProps): JSX.Element {
  return (
    <div className={styles.successScreen}>
      <div className={styles.successContainer}>
        {status === 'success' && (
          <>
            <div className={`${styles.statusIcon} ${styles.successIcon}`}>✅</div>
            <div className={styles.statusTitle}>Platba úspěšná!</div>
            {customerEmail && (
              <div className={styles.emailMessage}>
                Účtenka byla odeslána na email: <strong>{customerEmail}</strong>
              </div>
            )}
            {countdown !== null && countdown !== undefined && (
              <div className={styles.countdown}>
                Automatické přesměrování za {countdown}s
              </div>
            )}
            <button
              onClick={onContinue}
              className={styles.returnBtn}
            >
              Vrátit se na kiosk
            </button>
          </>
        )}
        {status === 'timeout' && (
          <>
            <div className={`${styles.statusIcon} ${styles.timeoutIcon}`}>⏰</div>
            <div className={styles.statusTitle}>Platba vypršela</div>
            <div className={styles.statusMessage}>Platba nebyla dokončena v časovém limitu</div>
            <button
              onClick={onContinue}
              className={styles.returnBtn}
            >
              Vrátit se na kiosk
            </button>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className={`${styles.statusIcon} ${styles.failedIcon}`}>❌</div>
            <div className={styles.statusTitle}>Platba se nezdařila</div>
            <div className={styles.statusMessage}>Platba nebyla úspěšně dokončena</div>
            <button
              onClick={onContinue}
              className={styles.returnBtn}
            >
              Vrátit se na kiosk
            </button>
          </>
        )}
        {status === 'cancelled' && (
          <>
            <div className={`${styles.statusIcon} ${styles.cancelledIcon}`}>🚫</div>
            <div className={styles.statusTitle}>Platba zrušena</div>
            <div className={styles.statusMessage}>Platba byla zrušena nebo nebyla dokončena</div>
            {countdown !== null && countdown !== undefined && (
              <div className={styles.countdown}>
                Automatické přesměrování za {countdown}s
              </div>
            )}
            <button
              onClick={onContinue}
              className={styles.returnBtn}
            >
              Vrátit se na kiosk
            </button>
          </>
        )}
      </div>
    </div>
  );
}

