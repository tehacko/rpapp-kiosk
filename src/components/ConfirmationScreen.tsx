// React import not needed with new JSX transform
import { PaymentData } from 'pi-kiosk-shared';

interface ConfirmationScreenProps {
  paymentData: PaymentData;
  onContinue: () => void;
}

export function ConfirmationScreen({ paymentData, onContinue }: ConfirmationScreenProps) {
  return (
    <div className="confirmation-screen">
      <div className="success-icon">✅</div>
      <h2>Platba byla úspěšně zpracována!</h2>
      <div className="payment-details">
        <p><strong>Produkt:</strong> {paymentData.productName}</p>
        <p><strong>Částka:</strong> {paymentData.amount} Kč</p>
        <p><strong>Email:</strong> {paymentData.customerEmail}</p>
      </div>
      <button onClick={onContinue} className="continue-btn">
        🏠 Pokračovat v nákupu
      </button>
    </div>
  );
}
