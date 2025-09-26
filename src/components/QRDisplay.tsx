// React import not needed with new JSX transform
import { PaymentData } from 'pi-kiosk-shared';

interface QRDisplayProps {
  qrCodeUrl: string;
  paymentData: PaymentData;
}

export function QRDisplay({ qrCodeUrl, paymentData }: QRDisplayProps) {
  return (
    <div className="qr-section">
      <h3>Naskenujte QR kód pro platbu</h3>
      <div className="qr-code-container">
        <img src={qrCodeUrl} alt="QR Code" className="qr-code" />
      </div>
      <p className="payment-info">
        Částka: <strong>{paymentData.amount} Kč</strong><br/>
        Email: <strong>{paymentData.customerEmail}</strong>
      </p>
      <div className="payment-status">
        <div className="loading-spinner"></div>
        <p>Čekám na platbu...</p>
      </div>
    </div>
  );
}
