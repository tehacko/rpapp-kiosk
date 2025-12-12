import type { ThePayCreateResponse } from 'pi-kiosk-shared';
import { QRDisplay } from '../../QRDisplay/QRDisplay';

interface ThePayQRDisplayProps {
  qrCodeUrl: string;
  paymentData: ThePayCreateResponse;
  onCancel: () => void;
}

export function ThePayQRDisplay({ qrCodeUrl, paymentData, onCancel }: ThePayQRDisplayProps): JSX.Element {
  return (
    <QRDisplay
      qrCodeUrl={qrCodeUrl}
      paymentData={paymentData}
      onCancel={onCancel}
      title="Naskenujte QR kód"
      instructions="Dokončete platbu prostřednictvím ThePay na vašem telefonu"
    />
  );
}
