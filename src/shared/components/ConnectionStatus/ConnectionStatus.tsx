// React is not needed with new JSX transform

import { CSS_CLASSES } from 'pi-kiosk-shared';
import styles from './ConnectionStatus.module.css';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className={`${styles.connectionStatus} ${isConnected ? CSS_CLASSES.CONNECTED : CSS_CLASSES.DISCONNECTED}`}>
      <div className={styles.statusIndicator} role="img" aria-label={isConnected ? 'Connected' : 'Disconnected'}>
        {isConnected ? '🟢' : '🔴'}
      </div>
      <span className={styles.statusText} aria-live="polite">
        {isConnected ? 'Připojeno' : 'Odpojeno'}
      </span>
    </div>
  );
}
