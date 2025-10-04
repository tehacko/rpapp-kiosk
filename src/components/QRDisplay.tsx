// React import not needed with new JSX transform
import { PaymentData, MultiProductPaymentData, CSS_CLASSES } from 'pi-kiosk-shared';

interface QRDisplayProps {
  qrCodeUrl: string;
  paymentData: PaymentData | MultiProductPaymentData;
  onCancel: () => void;
}

export function QRDisplay({ qrCodeUrl, paymentData, onCancel }: QRDisplayProps) {
  return (
    <div className={`qr-section ${CSS_CLASSES.CARD}`}>
      <div className="qr-content">
        <div className="qr-code-container">
          <img 
            src={qrCodeUrl} 
            alt="QR Code pro platbu" 
            className="qr-code"
            loading="lazy"
          />
        </div>
        
        <div className={`payment-status ${CSS_CLASSES.LOADING}`}>
          <p className="status-text">Čekám na platbu</p>
          <div className="loading-spinner" aria-hidden="true"></div>
        </div>
      </div>
      
      <div className="qr-actions">
        <button
          onClick={onCancel}
          className="cancel-qr-btn"
          type="button"
          aria-label="Zrušit platbu"
        >
          ← Zpět k výběru platby
        </button>
      </div>
    </div>
  );
}
