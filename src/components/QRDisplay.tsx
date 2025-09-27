// React import not needed with new JSX transform
import { PaymentData, UI_MESSAGES, CSS_CLASSES, formatPrice } from 'pi-kiosk-shared';

interface QRDisplayProps {
  qrCodeUrl: string;
  paymentData: PaymentData;
}

export function QRDisplay({ qrCodeUrl, paymentData }: QRDisplayProps) {
  return (
    <div className={`qr-section ${CSS_CLASSES.CARD}`}>
      <h3 className="qr-title">Naskenujte QR kód pro platbu</h3>
      
      <div className="qr-code-container">
        <img 
          src={qrCodeUrl} 
          alt="QR Code pro platbu" 
          className="qr-code"
          loading="lazy"
        />
      </div>
      
      <div className={`payment-info ${CSS_CLASSES.CARD}`}>
        <div className="info-row">
          <span className="info-label">Částka:</span>
          <span className="info-value">{formatPrice(paymentData.amount)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Email:</span>
          <span className="info-value">{paymentData.customerEmail}</span>
        </div>
      </div>
      
      <div className={`payment-status ${CSS_CLASSES.LOADING}`}>
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="status-text">{UI_MESSAGES.PAYMENT_WAITING}</p>
      </div>
    </div>
  );
}
