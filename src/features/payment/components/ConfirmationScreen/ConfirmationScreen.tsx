import { useEffect, useState } from 'react';
import type { PaymentData, MultiProductPaymentData } from 'pi-kiosk-shared';
import { TransactionStatus } from 'pi-kiosk-shared';
import type { PaymentStatus } from '../../../../shared/components/PaymentSuccessScreen';
import { PaymentSuccessScreen } from '../../../../shared/components/PaymentSuccessScreen';

interface ConfirmationScreenProps {
  paymentData: PaymentData | MultiProductPaymentData;
  onContinue: () => void;
}

export function ConfirmationScreen({ paymentData, onContinue }: ConfirmationScreenProps): JSX.Element {
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Check payment status
  const isPaymentCompleted = 'status' in paymentData && paymentData.status === TransactionStatus.COMPLETED;
  const isPaymentTimeout = 'status' in paymentData && paymentData.status === TransactionStatus.TIMEOUT;
  const isPaymentFailed = 'status' in paymentData && paymentData.status === TransactionStatus.FAILED;
  
  // Get customer email
  const customerEmail = paymentData.customerEmail;

  // Determine status for PaymentSuccessScreen
  let status: PaymentStatus = 'success';
  if (isPaymentTimeout) {
    status = 'timeout';
  } else if (isPaymentFailed) {
    status = 'failed';
  } else if (isPaymentCompleted) {
    status = 'success';
  }

  // Handle countdown and auto-continue after 60 seconds
  useEffect(() => {
    if (isPaymentCompleted) {
      setCountdown(60);
      
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      const redirectTimer = setTimeout(() => {
        onContinue();
      }, 60000);
      
      return (): void => {
        clearTimeout(redirectTimer);
        clearInterval(countdownInterval);
      };
    } else {
      setCountdown(null);
    }
  }, [isPaymentCompleted, onContinue]);

  return (
    <PaymentSuccessScreen
      status={status}
      customerEmail={customerEmail}
      countdown={countdown}
      onContinue={onContinue}
    />
  );
}
