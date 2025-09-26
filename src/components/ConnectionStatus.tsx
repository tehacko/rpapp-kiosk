// React is not needed with new JSX transform

interface ConnectionStatusProps {
  isConnected: boolean;
  kioskId: number;
}

export function ConnectionStatus({ isConnected, kioskId }: ConnectionStatusProps) {
  return (
    <div className="products-header">
      <div className="header-left">
        <h2 className="product-select-title">Vyberte si produkt</h2>
        <div className="kiosk-indicator">Kiosk #{kioskId}</div>
      </div>
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢' : '🔴'}
      </div>
    </div>
  );
}
