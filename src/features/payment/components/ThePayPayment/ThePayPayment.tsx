import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { 
  UI_MESSAGES,
  CSS_CLASSES,
  createAPIClient,
  API_ENDPOINTS,
  ThePayCreateRequest as BaseThePayCreateRequest,
  ThePayCreateResponse,
  ApiResponse
} from 'pi-kiosk-shared';
import { useServerSentEvents } from '../../../realtime';
import type { SSEMessage } from '../../../realtime/hooks/useServerSentEvents';
import { QRDisplay } from '../QRDisplay/QRDisplay';

// Configuration: Switch between 'redirect' and 'qr' modes
// TODO: Move to environment config or database setting
const THEPAY_MODE: ThePayMode = 'qr'; // 'redirect' | 'qr'

type ThePayMode = 'redirect' | 'qr';

// Extend ThePayCreateRequest to include paymentMode
interface ThePayCreateRequest extends BaseThePayCreateRequest {
  paymentMode?: ThePayMode; // Optional for backward compatibility
}

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
  
  // Hybrid polling + webhook: Refs for preventing race conditions
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef<boolean>(false);
  
  const [state, setState] = useState<ThePayPaymentState>({
    status: 'creating',
    paymentData: null,
    qrCodeUrl: null,
    error: null
  });

  // QR mode: Handle SSE payment completion (PRIMARY method - instant)
  const handleSSEMessage = useCallback((message: SSEMessage) => {
    console.log('📨 ThePayPayment SSE message received:', message);
    console.log('📨 Current paymentIdRef:', paymentIdRef.current);
    console.log('📨 Message paymentId:', message.data?.paymentId);
    console.log('📨 Message type:', message.type, 'updateType:', message.updateType);
    console.log('📨 IsNavigating:', isNavigatingRef.current);
    
    // Prevent double navigation
    if (isNavigatingRef.current) {
      console.log('⚠️ Already navigating, ignoring SSE message');
      return;
    }
    
    // Check if this is our payment completion or cancellation
    const isPaymentCompleted = message.type === 'product_update' && 
      message.updateType === 'payment_completed';
    const isPaymentCancelled = message.type === 'product_update' && 
      message.updateType === 'payment_cancelled';
    const matchesPaymentId = message.data?.paymentId === paymentIdRef.current;
    
    console.log('📨 Payment match check:', { 
      isPaymentCompleted, 
      isPaymentCancelled,
      matchesPaymentId, 
      paymentIdMatch: message.data?.paymentId === paymentIdRef.current 
    });
    
    if (isPaymentCompleted && matchesPaymentId) {
      console.log('✅ Payment completed via SSE, navigating to success page');
      
      // Stop polling if it's running
      if (pollingIntervalRef.current) {
        console.log('🛑 Stopping polling (SSE fired first)');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Mark as navigating and navigate
      isNavigatingRef.current = true;
      navigate(`/payment/thepay-success?paymentId=${message.data.paymentId}&kioskId=${kioskId}`);
    } else if (isPaymentCancelled && matchesPaymentId) {
      console.log('🚫 Payment cancelled via SSE, navigating to cancellation page');
      console.log('🚫 Cancellation details:', { 
        paymentId: message.data?.paymentId, 
        transactionId: message.data?.transactionId,
        kioskId: message.data?.kioskId 
      });
      
      // Stop polling if it's running
      if (pollingIntervalRef.current) {
        console.log('🛑 Stopping polling (cancellation detected via SSE)');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Navigate to success page with cancelled status (same as completion, but shows cancellation message)
      isNavigatingRef.current = true;
      navigate(`/payment/thepay-success?paymentId=${message.data.paymentId}&kioskId=${kioskId}&status=cancelled`);
    } else if (isPaymentCancelled && !matchesPaymentId) {
      console.log('⏭️ SSE cancellation message for different payment:', {
        messagePaymentId: message.data?.paymentId,
        currentPaymentId: paymentIdRef.current
      });
    } else {
      console.log('⏭️ SSE message not matching our payment:', { 
        isPaymentCompleted, 
        isPaymentCancelled,
        matchesPaymentId,
        messagePaymentId: message.data?.paymentId,
        currentPaymentId: paymentIdRef.current 
      });
    }
  }, [navigate, kioskId, onCancel]);

  // QR mode: Connect to SSE only in QR mode
  const { isConnected: sseConnected } = useServerSentEvents({
    kioskId,
    enabled: THEPAY_MODE === 'qr',
    onMessage: handleSSEMessage
  });

  // QR mode: Status polling (FALLBACK method - reliable)
  // This catches payment completion if webhook/SSE doesn't fire (e.g., demo mode)
  const startStatusPolling = useCallback(() => {
    let attempts = 0;
    const maxAttempts = 20; // 20 attempts * 3s = 60 seconds total
    
    console.log('🔄 Starting status polling (every 3s, max 20 attempts)');
    
    pollingIntervalRef.current = setInterval(async () => {
      // Don't poll if we're already navigating
      if (isNavigatingRef.current) {
        console.log('🛑 Already navigating, stopping polling');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }
      
      attempts++;
      console.log(`🔄 Polling payment status (attempt ${attempts}/${maxAttempts}) for: ${paymentIdRef.current}`);
      
      try {
        const response = await apiClient.get<ApiResponse<{ 
          paymentId: string; 
          status: string;
          thepayState?: string;
        }>>(
          API_ENDPOINTS.PAYMENT_THEPAY_STATUS.replace(':paymentId', paymentIdRef.current || '')
        );
        
        console.log('📊 Polling response:', response);
        console.log('📊 Response.data:', response.data);
        console.log('📊 Response.data?.status:', response.data?.status);
        console.log('📊 Response.success:', response.success);
        
        // Handle both response formats defensively
        const status = response.data?.status || (response as any).status;
        const isCompleted = response.success && status === 'completed';
        const isCancelled = response.success && status === 'cancelled';
        const isFailed = response.success && (status === 'failed' || status === 'refunded');
        
        console.log('📊 Parsed status:', status, 'isCompleted:', isCompleted, 'isCancelled:', isCancelled, 'isFailed:', isFailed);
        
        if (isCompleted) {
          console.log('✅ Payment completed via POLLING, navigating to success page');
          
          // Clear the polling interval
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Mark as navigating and navigate
          isNavigatingRef.current = true;
          navigate(`/payment/thepay-success?paymentId=${paymentIdRef.current}&kioskId=${kioskId}`);
        } else if (isCancelled || isFailed) {
          console.log(`🚫 Payment ${isCancelled ? 'cancelled' : 'failed'} via POLLING, navigating to ${isCancelled ? 'cancellation' : 'failure'} page`);
          
          // Clear the polling interval
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Navigate to success page with cancelled/failed status (shows appropriate message on kiosk)
          isNavigatingRef.current = true;
          const statusParam = isCancelled ? 'cancelled' : 'failed';
          navigate(`/payment/thepay-success?paymentId=${paymentIdRef.current}&kioskId=${kioskId}&status=${statusParam}`);
        } else if (status === 'pending' || status === 'processing') {
          // Payment still pending - but if we've been polling for a while, 
          // it might be abandoned (user clicked "návrat na web")
          // The backend should return 'cancelled' if transaction is CANCELLED in DB
          console.log(`⏳ Payment still pending (attempt ${attempts}/${maxAttempts}), status: ${status}`);
          
          // Note: If ThePaySuccessPage detected abandonment and marked transaction as CANCELLED,
          // the next poll should return 'cancelled' status from the backend
        } else {
          console.log(`⚠️ Unexpected payment status via polling: ${status}`);
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
        // Continue polling on error - might be transient
      }
      
      // Stop polling after max attempts
      if (attempts >= maxAttempts) {
        console.log('⏱️ Polling timeout reached (60 seconds)');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 3000); // Poll every 3 seconds
  }, [apiClient, navigate, kioskId, onCancel]);

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

  // QR mode: Start polling when QR is displayed
  useEffect(() => {
    console.log('🔍 Polling useEffect: status=', state.status, 'mode=', THEPAY_MODE, 'hasQR=', !!state.qrCodeUrl);
    
    if (THEPAY_MODE === 'qr' && state.status === 'waiting_for_payment' && state.qrCodeUrl) {
      console.log('📱 QR code displayed, starting hybrid polling + SSE');
      startStatusPolling();
    } else {
      console.log('⏸️ Polling NOT starting:', { 
        isQRMode: THEPAY_MODE === 'qr', 
        status: state.status, 
        hasQR: !!state.qrCodeUrl 
      });
    }
    
    // Cleanup: Stop polling on unmount or when leaving this state
    return () => {
      if (pollingIntervalRef.current) {
        console.log('🧹 Cleaning up: Stopping polling');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [state.status, state.qrCodeUrl, startStatusPolling]);

  // Cleanup: Reset refs on unmount
  useEffect(() => {
    return () => {
      paymentIdRef.current = null;
      isNavigatingRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
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
        kioskId: kioskId,
        paymentMode: THEPAY_MODE // Send mode to backend for correct return URL
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
        status: 'waiting_for_payment' // Ensure this is set
      }));
      
      console.log('✅ QR code generated, status:', 'waiting_for_payment');
      console.log('📡 SSE connected:', sseConnected);
      console.log('🔍 Will start polling when status is waiting_for_payment and QR code exists');
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
    <QRDisplay
      qrCodeUrl={qrCodeUrl}
      paymentData={paymentData || undefined}
      onCancel={onCancel}
    />
  );
}

export default ThePayPayment;
