import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { 
  UI_MESSAGES,
  CSS_CLASSES,
  createAPIClient,
  API_ENDPOINTS,
  ThePayCreateRequest,
  ThePayCreateResponse,
  ApiResponse
} from 'pi-kiosk-shared';
import { useServerSentEvents } from '../../../realtime';
import type { SSEMessage } from '../../../realtime/hooks/useServerSentEvents';

// Configuration: Switch between 'redirect' and 'qr' modes
// TODO: Move to environment config or database setting
const THEPAY_MODE: ThePayMode = 'qr'; // 'redirect' | 'qr'

type ThePayMode = 'redirect' | 'qr';

type PaymentStatus = 'creating' | 'redirecting' | 'displaying_qr' | 'waiting_for_payment' | 'error';

interface ThePayPaymentState {
  status: PaymentStatus;
  paymentData: ThePayCreateResponse | null;
  qrCodeUrl: string | null;
  error: string | null;
}

interface ThePayPaymentProps {
  cart: {
    items: Array<{
      product: {
        id: number;
        name: string;
        price: number;
      };
      quantity: number;
    }>;
    totalAmount: number;
  };
  email: string;
  kioskId: number;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
  onCancel: () => void;
}

export function ThePayPayment({ 
  cart, 
  email, 
  kioskId, 
  onPaymentSuccess: _onPaymentSuccess, // Not used in either mode
  onPaymentError, 
  onCancel 
}: ThePayPaymentProps) {
  const navigate = useNavigate();
  const apiClient = createAPIClient();
  const paymentIdRef = useRef<string | null>(null);
  
  const [state, setState] = useState<ThePayPaymentState>({
    status: 'creating',
    paymentData: null,
    qrCodeUrl: null,
    error: null
  });

  // QR mode: Handle SSE payment completion
  const handleSSEMessage = useCallback((message: SSEMessage) => {
    console.log('📨 SSE message received:', message);
    
    // Check if this is our payment completion
    if (
      message.type === 'product_update' && 
      message.updateType === 'payment_completed' &&
      message.data?.paymentId === paymentIdRef.current
    ) {
      console.log('🎉 Payment completed via SSE, navigating to success page');
      
      // Navigate to success page (same as redirect mode!)
      navigate(`/payment/thepay-success?paymentId=${message.data.paymentId}&kioskId=${kioskId}`);
    }
  }, [navigate, kioskId]);

  // QR mode: Connect to SSE only in QR mode
  const { isConnected: sseConnected } = useServerSentEvents({
    kioskId,
    enabled: THEPAY_MODE === 'qr',
    onMessage: handleSSEMessage
  });

  // Payment creation (shared by both modes)
  useEffect(() => {
    createPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // QR mode: Generate QR after payment created
  useEffect(() => {
    if (THEPAY_MODE === 'qr' && state.paymentData && !state.qrCodeUrl && !state.error) {
      generateQRCode(state.paymentData.paymentUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.paymentData]);

  // Cleanup
  useEffect(() => {
    return () => {
      paymentIdRef.current = null;
    };
  }, []);

  const createPayment = async () => {
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
        kioskId: kioskId
      };

      const response = await apiClient.post<ApiResponse<ThePayCreateResponse>>(
        API_ENDPOINTS.PAYMENT_THEPAY_CREATE,
        paymentRequest
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create payment');
      }

      const paymentData = response.data;
      paymentIdRef.current = paymentData.paymentId;
      
      setState(prev => ({ ...prev, paymentData, status: 'redirecting' }));
      
      // Mode-specific actions
      if (THEPAY_MODE === 'redirect') {
        console.log('💳 Redirecting to ThePay:', paymentData.paymentUrl);
        window.location.href = paymentData.paymentUrl;
      } else {
        console.log('💳 QR mode: Payment created, will generate QR code');
      }
      // QR generation happens in useEffect
      
    } catch (error) {
      console.error('ThePay payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment creation failed';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      onPaymentError(errorMessage);
    }
  };

  const generateQRCode = async (paymentUrl: string) => {
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
        status: 'waiting_for_payment'
      }));
      
      console.log('✅ QR code generated, waiting for payment...');
      console.log('📡 SSE connected:', sseConnected);
    } catch (error) {
      console.error('QR generation error:', error);
      const errorMessage = 'Failed to generate QR code';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      onPaymentError(errorMessage);
    }
  };

  const handleRetry = () => {
    setState({
      status: 'creating',
      paymentData: null,
      qrCodeUrl: null,
      error: null
    });
    createPayment();
  };

  // Render based on mode
  if (THEPAY_MODE === 'redirect') {
    return renderRedirectMode(state.status, state.error, handleRetry, onCancel);
  }
  
  return renderQRMode(state.status, state.qrCodeUrl, state.paymentData, state.error, handleRetry, onCancel);
}

// Render function for redirect mode
function renderRedirectMode(
  _status: PaymentStatus, // Unused but kept for consistency
  error: string | null,
  onRetry: () => void,
  onCancel: () => void
) {
  if (error) {
    return (
      <div className={CSS_CLASSES.PAYMENT_CONTAINER}>
        <div className={CSS_CLASSES.ERROR_CONTAINER}>
          <h3>{UI_MESSAGES.PAYMENT_ERROR}</h3>
          <p>{error}</p>
          <div className={CSS_CLASSES.BUTTON_GROUP}>
            <button 
              onClick={onRetry} 
              className={CSS_CLASSES.BUTTON_PRIMARY}
            >
              {UI_MESSAGES.RETRY}
            </button>
            <button 
              onClick={onCancel} 
              className={CSS_CLASSES.BUTTON_SECONDARY}
            >
              {UI_MESSAGES.CANCEL}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={CSS_CLASSES.PAYMENT_CONTAINER}>
      <div className={CSS_CLASSES.LOADING_CONTAINER}>
        <div className={CSS_CLASSES.LOADING_SPINNER}></div>
        <p>Přesměrovávám na platební bránu ThePay...</p>
      </div>
    </div>
  );
}

// Render function for QR mode
function renderQRMode(
  status: PaymentStatus,
  qrCodeUrl: string | null,
  paymentData: ThePayCreateResponse | null,
  error: string | null,
  onRetry: () => void,
  onCancel: () => void
) {
  if (error) {
    return (
      <div className={CSS_CLASSES.PAYMENT_CONTAINER}>
        <div className={CSS_CLASSES.ERROR_CONTAINER}>
          <h3>{UI_MESSAGES.PAYMENT_ERROR}</h3>
          <p>{error}</p>
          <div className={CSS_CLASSES.BUTTON_GROUP}>
            <button 
              onClick={onRetry} 
              className={CSS_CLASSES.BUTTON_PRIMARY}
            >
              {UI_MESSAGES.RETRY}
            </button>
            <button 
              onClick={onCancel} 
              className={CSS_CLASSES.BUTTON_SECONDARY}
            >
              {UI_MESSAGES.CANCEL}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (status === 'creating' || !qrCodeUrl) {
    return (
      <div className={CSS_CLASSES.PAYMENT_CONTAINER}>
        <div className={CSS_CLASSES.LOADING_CONTAINER}>
          <div className={CSS_CLASSES.LOADING_SPINNER}></div>
          <p>Vytváření platby...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={CSS_CLASSES.PAYMENT_CONTAINER}>
      <div className={`qr-section ${CSS_CLASSES.CARD}`}>
        <div className="qr-content">
          <h2 className="qr-title">Naskenujte QR kód</h2>
          <div className="qr-code-container">
            <img 
              src={qrCodeUrl} 
              alt="ThePay Payment QR Code" 
              className="qr-code"
              loading="lazy"
            />
          </div>
          
          <div className={`payment-status ${CSS_CLASSES.LOADING}`}>
            <p className="status-text">Čekám na platbu</p>
            <p className="amount-text">{paymentData?.amount} Kč</p>
            <div className="loading-spinner" aria-hidden="true"></div>
          </div>
          
          <p className="instructions">
            Dokončete platbu na vašem telefonu
          </p>
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
    </div>
  );
}

export default ThePayPayment;
