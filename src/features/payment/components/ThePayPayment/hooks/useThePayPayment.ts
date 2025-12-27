import { useState, useEffect, useCallback, useRef } from 'react';
import type React from 'react';
import QRCode from 'qrcode';
import type { 
  ThePayCreateRequest as BaseThePayCreateRequest,
  ThePayCreateResponse,
  ApiResponse
} from 'pi-kiosk-shared';
import { 
  createAPIClient,
  API_ENDPOINTS
} from 'pi-kiosk-shared';
import { buildTenantApiBase, getTenantFromPath } from '../../../../../shared/tenant';

// Configuration: Switch between 'redirect' and 'qr' modes
// TODO: Move to environment config or database setting
export const THEPAY_MODE: ThePayMode = 'qr'; // 'redirect' | 'qr'

export type ThePayMode = 'redirect' | 'qr';

// Extend ThePayCreateRequest to include paymentMode
interface ThePayCreateRequest extends BaseThePayCreateRequest {
  paymentMode?: ThePayMode; // Optional for backward compatibility
}

export type PaymentStatus = 'creating' | 'redirecting' | 'displaying_qr' | 'waiting_for_payment' | 'error';

export interface ThePayPaymentState {
  status: PaymentStatus;
  paymentData: ThePayCreateResponse | null;
  qrCodeUrl: string | null;
  error: string | null;
}

export interface ThePayPaymentDeps {
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
  onPaymentError: (error: string) => void;
}

export function useThePayPayment({ cart, email, kioskId, onPaymentError }: ThePayPaymentDeps): {
  state: ThePayPaymentState;
  paymentId: string | null;
  createPayment: () => Promise<void>;
  generateQRCode: (paymentUrl: string) => Promise<void>;
  handleRetry: () => void;
  setState: React.Dispatch<React.SetStateAction<ThePayPaymentState>>;
} {
  const tenant = getTenantFromPath();
  const apiClient = createAPIClient(buildTenantApiBase(), undefined, tenant ?? undefined);
  const paymentIdRef = useRef<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  
  const [state, setState] = useState<ThePayPaymentState>({
    status: 'creating',
    paymentData: null,
    qrCodeUrl: null,
    error: null
  });

  const createPayment = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, status: 'creating', error: null }));

      const paymentRequest: ThePayCreateRequest = {
        items: cart.items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        })),
        totalAmount: cart.totalAmount,
        customerEmail: email,
        kioskId: kioskId,
        paymentMode: THEPAY_MODE // Send mode to backend for correct return URL
      };

      const response = await apiClient.post<ApiResponse<ThePayCreateResponse>>(
        API_ENDPOINTS.PAYMENT_THEPAY_CREATE,
        paymentRequest
      );

      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'Failed to create payment');
      }

      const paymentData = response.data;
      paymentIdRef.current = paymentData.paymentId;
      setPaymentId(paymentData.paymentId);
      
      setState(prev => ({ ...prev, paymentData, status: 'redirecting' }));
      
      // Mode-specific actions
      if (THEPAY_MODE === 'redirect') {
        console.info('💳 Redirecting to ThePay:', paymentData.paymentUrl);
        window.location.href = paymentData.paymentUrl;
      } else {
        console.info('💳 QR mode: Payment created, will generate QR code');
      }
      // QR generation happens in useEffect
      
    } catch (error) {
      console.error('ThePay payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment creation failed';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      onPaymentError(errorMessage);
    }
  }, [cart, email, kioskId, apiClient, onPaymentError]);

  const generateQRCode = useCallback(async (paymentUrl: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, status: 'displaying_qr' }));
      
      const qrCodeUrl = await QRCode.toDataURL(paymentUrl, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setState(prev => ({ 
        ...prev, 
        qrCodeUrl, 
        status: 'waiting_for_payment' // Ensure this is set
      }));
      
      console.info('✅ QR code generated, status:', 'waiting_for_payment');
    } catch (error) {
      console.error('QR generation error:', error);
      const errorMessage = 'Failed to generate QR code';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      onPaymentError(errorMessage);
    }
  }, [onPaymentError]);

  const handleRetry = useCallback((): void => {
    setState({
      status: 'creating',
      paymentData: null,
      qrCodeUrl: null,
      error: null
    });
    void createPayment();
  }, [createPayment]);

  // Payment creation on mount
  useEffect(() => {
    void createPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // QR mode: Generate QR after payment created
  useEffect(() => {
    if (THEPAY_MODE === 'qr' && state.paymentData && !state.qrCodeUrl && !state.error) {
      void generateQRCode(state.paymentData.paymentUrl);
    }
  }, [state.paymentData, state.qrCodeUrl, state.error, generateQRCode]);

  // Cleanup: Reset paymentId on unmount
  useEffect(() => {
    return (): void => {
      paymentIdRef.current = null;
    };
  }, []);

  return {
    state,
    paymentId,
    createPayment,
    generateQRCode,
    handleRetry,
    setState
  };
}
