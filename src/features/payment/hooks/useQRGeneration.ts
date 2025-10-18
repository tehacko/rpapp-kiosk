import { useState, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  APIClient,
  API_ENDPOINTS,
  APP_CONFIG,
  Cart as CartType,
  MultiProductPaymentData,
  useErrorHandler,
  TransactionStatus,
  ApiResponse,
  CreateMultiQRPaymentResponse,
} from 'pi-kiosk-shared';

interface UseQRGenerationProps {
  apiClient: APIClient;
  kioskId: number;
  onPaymentDataGenerated: (data: MultiProductPaymentData | null) => void;
  onPaymentMonitoringStart: (paymentId: string) => Promise<void>;
}

export function useQRGeneration({
  apiClient,
  kioskId,
  onPaymentDataGenerated,
  onPaymentMonitoringStart,
}: UseQRGenerationProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { handleError } = useErrorHandler();

  const generateQR = useCallback(
    async (cart: CartType, email: string) => {
      console.log('Starting QR code generation for cart:', cart, 'email:', email);
      setIsGenerating(true);
      try {
        // Create multi-product payment via backend API
        console.log('Calling API endpoint:', API_ENDPOINTS.PAYMENT_CREATE_MULTI_QR);
        const response = await apiClient.post<ApiResponse<CreateMultiQRPaymentResponse>>(API_ENDPOINTS.PAYMENT_CREATE_MULTI_QR, {
          items: cart.items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          totalAmount: cart.totalAmount,
          customerEmail: email,
          kioskId: kioskId,
        });

        console.log('API response:', response);

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to create multi-product payment');
        }

        const { paymentId, qrCodeData, amount, customerEmail } = response.data;
        console.log('QR code data received:', { paymentId, qrCodeData, amount, customerEmail });

        // Generate QR code image from the data returned by backend
        // Optimized for bank app scanning with high error correction
        console.log('Generating QR code image...');
        const generatedQrUrl = await QRCode.toDataURL(qrCodeData, {
          width: APP_CONFIG.QR_CODE_WIDTH,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'H', // High error correction for better scanning
        });

        console.log('QR code image generated:', generatedQrUrl);

        const newPaymentData: MultiProductPaymentData = {
          items: cart.items,
          totalAmount: amount,
          customerEmail: customerEmail,
          qrCode: qrCodeData,
          paymentId: paymentId,
          status: TransactionStatus.INITIATED, // Initial status
        };

        // Set the QR code URL and payment data
        console.log('Setting QR code URL and payment data...');
        setQrCodeUrl(generatedQrUrl);
        onPaymentDataGenerated(newPaymentData);

        // Start SSE-based payment monitoring
        await onPaymentMonitoringStart(paymentId);

        console.log('QR code generated successfully:', { qrCodeUrl: generatedQrUrl, paymentData: newPaymentData });
      } catch (error) {
        console.error('Error creating multi-product payment:', error);
        handleError(error as Error, 'useQRGeneration.generateQR');
        // Optionally, clear QR and payment data on error
        setQrCodeUrl('');
        onPaymentDataGenerated(null);
      } finally {
        setIsGenerating(false);
      }
    },
    [apiClient, kioskId, handleError, onPaymentDataGenerated, onPaymentMonitoringStart]
  );

  const clearQR = useCallback(() => {
    setQrCodeUrl('');
  }, []);

  return { qrCodeUrl, isGenerating, generateQR, clearQR };
}
