import { useCallback, useRef, useEffect } from 'react';
import type { ThePayCreateResponse } from 'pi-kiosk-shared';
import { useThePayPayment, THEPAY_MODE, type PaymentStatus } from './hooks';
import { useThePaySSE } from './hooks/useThePaySSE';
import { useThePayPolling } from './hooks/useThePayPolling';
import { ThePayErrorDisplay, ThePayProcessingIndicator, ThePayQRDisplay } from './components';

interface ThePayPaymentProps {
  cart: {
    items: {
      product: {
        id: number;
        name: string;
        price: number;
      };
      quantity: number;
    }[];
    totalAmount: number;
  };
  email: string;
  kioskId: number;
  onPaymentSuccess: (paymentData: ThePayCreateResponse) => void;
  onPaymentError: (error: string) => void;
  onCancel: (paymentId?: string) => void;
}

export function ThePayPayment({ 
  cart, 
  email, 
  kioskId, 
  onPaymentSuccess: _onPaymentSuccess, // Not used in either mode
  onPaymentError, 
  onCancel 
}: ThePayPaymentProps): JSX.Element {
  // Hybrid polling + webhook: Refs for preventing race conditions
  const isNavigatingRef = useRef<boolean>(false);

  // Payment creation and state management
  const { state, paymentId, handleRetry } = useThePayPayment({
    cart,
    email,
    kioskId,
    onPaymentError
  });

  // Polling for QR mode (fallback method) - must be defined before SSE to provide stopPolling
  const { stopPolling } = useThePayPolling({
    kioskId,
    paymentId,
    isNavigatingRef,
    enabled: THEPAY_MODE === 'qr' && state.status === 'waiting_for_payment' && !!state.qrCodeUrl
  });

  // SSE handling for QR mode (primary method - instant)
  useThePaySSE({
    kioskId,
    paymentId,
    isNavigatingRef,
    onStopPolling: stopPolling
  });

  // Cleanup: Reset refs on unmount
  useEffect(() => {
    return (): void => {
      isNavigatingRef.current = false;
    };
  }, []);

  // Create cancel handler that passes payment ID
  const handleCancel = useCallback((): void => {
    onCancel(paymentId ?? undefined);
  }, [onCancel, paymentId]);

  // Render based on mode
  if (THEPAY_MODE === 'redirect') {
    return renderRedirectMode(state.status, state.error, handleRetry, handleCancel);
  }
  
  return renderQRMode(state.status, state.qrCodeUrl, state.paymentData, state.error, handleRetry, handleCancel);
}

// Render function for redirect mode
function renderRedirectMode(
  _status: PaymentStatus, // Unused but kept for consistency
  error: string | null,
  onRetry: () => void,
  onCancel: () => void
): JSX.Element {
  if (error) {
    return <ThePayErrorDisplay error={error} onRetry={onRetry} onCancel={onCancel} />;
  }
  
  return <ThePayProcessingIndicator message="Přesměrovávám na platební bránu ThePay..." />;
}

// Render function for QR mode
function renderQRMode(
  status: PaymentStatus,
  qrCodeUrl: string | null,
  paymentData: ThePayCreateResponse | null,
  error: string | null,
  onRetry: () => void,
  onCancel: () => void
): JSX.Element | null {
  if (error) {
    return <ThePayErrorDisplay error={error} onRetry={onRetry} onCancel={onCancel} />;
  }
  
  if (status === 'creating' || !qrCodeUrl) {
    return <ThePayProcessingIndicator message="Vytváření platby..." />;
  }
  
  if (qrCodeUrl && paymentData) {
    return <ThePayQRDisplay qrCodeUrl={qrCodeUrl} paymentData={paymentData} onCancel={onCancel} />;
  }

  return null;
}

export default ThePayPayment;
