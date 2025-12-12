/**
 * PaymentsUnavailableScreen Component
 * Full-screen message shown when all payment methods are temporarily unavailable.
 * Auto-refreshes when payments become available via SSE.
 */
import styles from './PaymentsUnavailableScreen.module.css';

interface PaymentsUnavailableScreenProps {
  /** Optional custom title */
  title?: string;
  /** Optional custom message */
  message?: string;
}

export function PaymentsUnavailableScreen({
  title = 'Platby dočasně nedostupné',
  message = 'Omlouváme se, všechny platební metody jsou momentálně nedostupné.',
}: PaymentsUnavailableScreenProps): JSX.Element {
  return (
    <div className={styles.container} data-testid="payments-unavailable-screen">
      <div className={styles.content}>
        <div className={styles.icon} aria-hidden="true">⚠️</div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        <p className={styles.submessage}>Prosím zkuste to za chvíli.</p>
        <p className={styles.note}>
          Automaticky obnovíme, jakmile bude platba dostupná.
        </p>
      </div>
    </div>
  );
}

export default PaymentsUnavailableScreen;

