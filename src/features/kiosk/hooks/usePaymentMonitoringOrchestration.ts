import { useCallback, useState, useRef, useEffect } from 'react';
import type { PaymentData, MultiProductPaymentData } from 'pi-kiosk-shared';
import { createAPIClient } from 'pi-kiosk-shared';
import { usePaymentMonitoring, useQRGeneration } from '../../payment';

interface PaymentMonitoringDeps {
  kioskId: number;
  sseConnected: boolean;
  onPaymentData: (data: PaymentData | MultiProductPaymentData) => void;
  onGoToConfirmation: (data: PaymentData | MultiProductPaymentData) => void;
  onResetPaymentStep: () => void;
  onResetPaymentMethod: () => void;
}

export function usePaymentMonitoringOrchestration({
  kioskId,
  sseConnected,
  onPaymentData,
  onGoToConfirmation,
  onResetPaymentStep,
  onResetPaymentMethod,
}: PaymentMonitoringDeps): {
  qrCodeUrl: string;
  isGeneratingQR: boolean;
  monitoringStartTime: number | null;
  generateQR: (cart: unknown, email: string) => Promise<void>;
  clearQR: () => void;
  stopMonitoring: () => Promise<void>;
  handleCancelQRPayment: () => Promise<void>;
} {
  const apiClient = createAPIClient();
  const [monitoringStartTime, setMonitoringStartTime] = useState<number | null>(null);
  const sseConnectedRef = useRef(sseConnected);

  // Keep ref updated with latest SSE connection status
  useEffect(() => {
    sseConnectedRef.current = sseConnected;
  }, [sseConnected]);

  const { startMonitoring, stopMonitoring } = usePaymentMonitoring();
  const { qrCodeUrl, isGenerating: isGeneratingQR, generateQR, clearQR } = useQRGeneration({
    apiClient,
    kioskId,
    onPaymentDataGenerated: (data) => {
      if (data) {
        onPaymentData(data);
      }
    },
    onPaymentMonitoringStart: async (paymentId: string) => {
      await stopMonitoring();
      // Use ref to get current SSE connection status at the time of monitoring start
      const startTime = await startMonitoring(
        paymentId,
        sseConnectedRef.current,
        (data) => { onPaymentData(data); onGoToConfirmation(data); },
        (data) => { onPaymentData(data); onGoToConfirmation(data); },
        (data) => { onPaymentData(data); onGoToConfirmation(data); }
      );
      setMonitoringStartTime(startTime);
      return startTime;
    }
  });

  const handleCancelQRPayment = useCallback(async () => {
    await stopMonitoring();
    setMonitoringStartTime(null);
    clearQR();
    onResetPaymentStep();
    onResetPaymentMethod();
  }, [stopMonitoring, clearQR, onResetPaymentStep, onResetPaymentMethod]);

  return {
    qrCodeUrl,
    isGeneratingQR,
    monitoringStartTime,
    generateQR,
    clearQR,
    stopMonitoring,
    handleCancelQRPayment
  };
}
