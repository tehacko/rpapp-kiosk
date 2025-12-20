import { useState, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import type {
  APIClient,
  Cart as CartType,
  MultiProductPaymentData,
  CreateMultiQRPaymentResponse,
} from 'pi-kiosk-shared';
import {
  API_ENDPOINTS,
  TransactionStatus,
} from 'pi-kiosk-shared';
import { APP_CONFIG } from '../../../shared/constants';
import { useErrorHandler } from '../../../shared/hooks';

interface UseQRGenerationProps {
  apiClient: APIClient;
  kioskId: number;
  onPaymentDataGenerated: (data: MultiProductPaymentData | null) => void;
  onPaymentMonitoringStart: (paymentId: string) => Promise<number | null>; // Returns monitoringStartTime
}

/**
 * Generate cart hash for comparison
 * Returns a consistent hash string based on cart items (sorted for consistency)
 */
function generateCartHash(cart: CartType): string {
  return cart.items
    .map((item) => `${item.product.id}:${item.quantity}`)
    .sort()
    .join(',');
}

/**
 * Generate idempotency key for payment request
 * Key is based on cart items, email, kioskId, current minute, and attempt number
 * - Same cart+email within same minute with attempt=0 = same key (prevents double-clicks, links to original)
 * - When cart changes, attempt increments = new key (allows new payment for modified cart)
 */
function generateIdempotencyKey(cart: CartType, email: string, kioskId: number, attemptNumber = 0): string {
  const cartHash = generateCartHash(cart);
  
  // Round timestamp to minute to allow same payment within same minute
  const minuteTimestamp = Math.floor(Date.now() / 60000);
  
  // Generate key: cart items + email + kioskId + minute + attempt number
  // Attempt number increments only when cart changes (allows new payment for modified cart)
  const keyData = `${cartHash}|${email}|${kioskId}|${minuteTimestamp}|${attemptNumber}`;
  
  // Simple hash function (not cryptographic, just for uniqueness)
  let hash = 0;
  for (let i = 0; i < keyData.length; i++) {
    const char = keyData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `idemp-${Math.abs(hash)}-${minuteTimestamp}-${attemptNumber}`;
}

export function useQRGeneration({
  apiClient,
  kioskId,
  onPaymentDataGenerated,
  onPaymentMonitoringStart,
}: UseQRGenerationProps): {
  qrCodeUrl: string;
  isGenerating: boolean;
  generateQR: (cart: CartType, email: string) => Promise<void>;
  clearQR: () => void;
  showAlreadyMadeModal: boolean;
  receiptEmailStatus: 'sent' | 'pending' | 'failed' | 'none';
  customerEmailForModal: string;
  closeAlreadyMadeModal: () => void;
} {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAlreadyMadeModal, setShowAlreadyMadeModal] = useState(false);
  const [receiptEmailStatus, setReceiptEmailStatus] = useState<'sent' | 'pending' | 'failed' | 'none'>('none');
  const [customerEmailForModal, setCustomerEmailForModal] = useState('');
  const { handleError } = useErrorHandler();
  const idempotencyKeyRef = useRef<string | null>(null);
  const attemptCounterRef = useRef<number>(0); // Track payment attempts (increments only when cart changes)
  const lastCartHashRef = useRef<string | null>(null); // Track cart hash from last successful payment

  const generateQR = useCallback(
    async (cart: CartType, email: string) => {
      console.info('Starting QR code generation for cart:', cart, 'email:', email);
      setIsGenerating(true);
      try {
        // Check FIO health right before QR generation (not during navigation to prevent rate limit issues)
        // This is the only place we check FIO health - right when user actually wants to generate QR
        console.info('🔍 Checking FIO health before QR generation...');
        try {
          // Use explicit endpoint path (API_ENDPOINTS constant may not be available in built package)
          const healthResponse = await apiClient.post<{ success: boolean; data?: { available: boolean; message?: string } }>(
            '/health/payment-providers/check-fio'
          );
          
          if (!healthResponse.success || !healthResponse.data?.available) {
            const errorMessage = healthResponse.data?.message ?? 'QR platba je dočasně nedostupná. Zkuste to prosím později nebo použijte jiný způsob platby.';
            console.warn('⚠️ FIO health check failed - QR payment unavailable:', errorMessage);
            throw new Error(errorMessage);
          }
          console.info('✅ FIO health check passed - QR payment available');
        } catch (error) {
          // If health check fails, prevent QR generation and show error to user
          console.error('❌ FIO health check failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'QR platba je dočasně nedostupná. Zkuste to prosím později.';
          throw new Error(errorMessage);
        }
        
        // Check if cart has changed since last payment
        // This ensures repeated back-and-forth navigation maps to the same payment
        // unless the user actually modifies the cart (which requires going to products screen)
        const currentCartHash = generateCartHash(cart);
        const cartChanged = lastCartHashRef.current !== null && lastCartHashRef.current !== currentCartHash;
        
        // Idempotency logic:
        // - Cart unchanged → attempt=0 → same key → links to original payment (idempotent)
        // - Cart changed → attempt increments → new key → creates new payment
        // This allows users to go back/forth without creating duplicate payments,
        // while still allowing new payments when they modify the cart
        if (cartChanged) {
          attemptCounterRef.current += 1;
          console.info('🛒 Cart changed - incrementing attempt counter to:', attemptCounterRef.current);
        } else {
          // Reset to 0 if cart is same (idempotent behavior - links to original payment)
          attemptCounterRef.current = 0;
          console.info('🔄 Cart unchanged - using attempt=0 for idempotency (will link to original payment)');
        }
        
        // Generate idempotency key for this payment request
        // Same cart+email+minute with attempt=0 = same key (prevents double-clicks, links to original)
        // Changed cart = different hash or incremented attempt = new key (allows new payment)
        const idempotencyKey = generateIdempotencyKey(cart, email, kioskId, attemptCounterRef.current);
        
        // Store key and cart hash for this payment session
        idempotencyKeyRef.current = idempotencyKey;
        
        console.info('Using idempotency key:', idempotencyKey);
        
        // Create multi-product payment via backend API
        console.info('Calling API endpoint:', API_ENDPOINTS.PAYMENT_CREATE_MULTI_QR);
        const response = await apiClient.post<CreateMultiQRPaymentResponse>(API_ENDPOINTS.PAYMENT_CREATE_MULTI_QR, {
          items: cart.items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          totalAmount: cart.totalAmount,
          customerEmail: email,
          kioskId: kioskId,
          idempotencyKey: idempotencyKey,
        });

        console.info('API response:', response);

        // Backend returns {success: true, data: {...}, message?: "..."}
        if (!response || !response.success || !response.data) {
          throw new Error('Failed to create multi-product payment');
        }

        // Type assertion: Backend response includes message and receiptEmailStatus in data
        const typedResponse = response as CreateMultiQRPaymentResponse & {
          message?: string;
          data: CreateMultiQRPaymentResponse['data'] & {
            receiptEmailStatus?: 'sent' | 'pending' | 'failed' | 'none';
          };
        };

        // Check if this is an idempotent response (duplicate payment detected)
        // Backend returns message: "Platba již byla vytvořena. Zobrazuji existující QR kód." for idempotent responses
        const isIdempotentResponse = typedResponse.message?.includes('již byla vytvořena') ?? false;
        
        if (isIdempotentResponse) {
          // Log to console (backend and frontend) - only log, don't show alert
          console.info('⚠️ [BE/FE] Duplicate payment detected - payment already exists for this cart+email combination');
          
          // Show modal with receipt email status (from outbox table)
          setReceiptEmailStatus(typedResponse.data.receiptEmailStatus ?? 'none');
          setCustomerEmailForModal(typedResponse.data.customerEmail);
          setShowAlreadyMadeModal(true);
        }

        const { paymentId, qrCodeData, amount, customerEmail } = typedResponse.data;
        console.info('QR code data received:', { paymentId, qrCodeData, amount, customerEmail });

        // Generate QR code image from the data returned by backend
        // Optimized for bank app scanning with high error correction
        console.info('Generating QR code image...');
        const generatedQrUrl = await QRCode.toDataURL(qrCodeData, {
          width: APP_CONFIG.QR_CODE_WIDTH,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'H', // High error correction for better scanning
        });

        console.info('QR code image generated:', generatedQrUrl);

        const newPaymentData: MultiProductPaymentData = {
          items: cart.items,
          totalAmount: amount,
          customerEmail: customerEmail,
          qrCode: qrCodeData,
          paymentId: paymentId,
          status: TransactionStatus.INITIATED, // Initial status
        };

        // Set the QR code URL and payment data
        console.info('Setting QR code URL and payment data...');
        setQrCodeUrl(generatedQrUrl);
        onPaymentDataGenerated(newPaymentData);

        // Start SSE-based payment monitoring
        await onPaymentMonitoringStart(paymentId);

        // Store cart hash after successful payment creation (for future idempotency checks)
        lastCartHashRef.current = currentCartHash;
        
        console.info('QR code generated successfully:', { qrCodeUrl: generatedQrUrl, paymentData: newPaymentData });
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
    // Clear stored key (cart hash comparison will determine if attempt counter increments)
    // Attempt counter only increments if cart changes, not on every back navigation
    idempotencyKeyRef.current = null;
    // Note: lastCartHashRef is NOT cleared - it's used to compare cart on next payment attempt
    // This ensures: same cart = idempotent (links to original), changed cart = new payment
  }, []);

  return {
    qrCodeUrl,
    isGenerating,
    generateQR,
    clearQR,
    showAlreadyMadeModal,
    receiptEmailStatus,
    customerEmailForModal,
    closeAlreadyMadeModal: () => setShowAlreadyMadeModal(false),
  };
}
