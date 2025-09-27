// React is not needed with new JSX transform

import { CSS_CLASSES } from 'pi-kiosk-shared';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className={`connection-status ${isConnected ? CSS_CLASSES.CONNECTED : CSS_CLASSES.DISCONNECTED}`}>
      <div className="status-indicator" role="img" aria-label={isConnected ? 'Connected' : 'Disconnected'}>
        {isConnected ? '🟢' : '🔴'}
      </div>
      <span className="status-text" aria-live="polite">
        {isConnected ? 'Připojeno' : 'Odpojeno'}
      </span>
    </div>
  );
}
