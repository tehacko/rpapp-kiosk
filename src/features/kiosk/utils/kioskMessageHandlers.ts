import type { Cart, MultiProductPaymentData, PaymentData } from 'pi-kiosk-shared';
import { TransactionStatus } from 'pi-kiosk-shared';
import { startTransition } from 'react';

type PaymentUpdateType =
  | 'payment_cancelled'
  | 'payment_completed'
  | 'payment_check_started'
  | 'payment_timeout'
  | 'payment_failed'
  | 'inventory_updated';

interface ProductUpdateMessage {
  type: 'product_update';
  updateType: PaymentUpdateType;
  data?: Record<string, unknown>;
  kioskId?: number;
}

interface KioskDeletedMessage {
  type: 'kiosk_deleted';
  data?: { kioskId?: number };
  kioskId?: number;
}

export type KioskMessage = ProductUpdateMessage | KioskDeletedMessage | Record<string, unknown>;

interface CreateMessageHandlerDeps {
  kioskId: number | null;
  email: string;
  qrCodeUrl: string;
  cartItems: Cart['items'];
  paymentData: PaymentData | MultiProductPaymentData | null;
  goToConfirmation: (data: PaymentData | MultiProductPaymentData) => void;
  clearQR: () => void;
  setPaymentStep: (step: number) => void;
  setSelectedPaymentMethod: (method: 'qr' | 'thepay' | undefined) => void;
}

export function createKioskMessageHandler({
  kioskId,
  email,
  qrCodeUrl,
  cartItems,
  paymentData,
  goToConfirmation,
  clearQR,
  setPaymentStep,
  setSelectedPaymentMethod,
}: CreateMessageHandlerDeps): (message: KioskMessage) => void {
  return (message: KioskMessage): void => {
    if (message.type === 'kiosk_deleted') {
      const kioskDeletedMsg = message as KioskDeletedMessage;
      const deletedKioskId = kioskDeletedMsg.data?.kioskId ?? kioskDeletedMsg.kioskId;
      if (deletedKioskId === kioskId) {
        console.error('❌ This kiosk has been deleted:', deletedKioskId);
        window.location.href = `/?kioskId=${kioskId}&error=kiosk_deleted`;
        return;
      }
    }

    if (message.type === 'product_update' && message.updateType === 'payment_cancelled') {
      const productUpdateMsg = message as ProductUpdateMessage;
      const paymentId = typeof productUpdateMsg.data?.paymentId === 'string' ? productUpdateMsg.data.paymentId : '';
      if (paymentId && paymentId !== 'null' && paymentId !== 'undefined' && paymentId.startsWith('thepay-')) {
        console.info('🚫 ThePay payment cancelled (KioskApp fallback), navigating to cancellation page');
        const kioskIdParam = kioskId ?? 0;
        window.location.href = `/payment/thepay-success?paymentId=${paymentId}&kioskId=${kioskIdParam}&status=cancelled`;
        return;
      } else if (paymentId?.startsWith('thepay-')) {
        console.error('❌ ThePay payment cancelled but paymentId is invalid:', paymentId);
      }
    }

    if (message.type === 'product_update' && message.updateType === 'payment_completed') {
      const productUpdateMsg = message as ProductUpdateMessage;
      const paymentId = typeof productUpdateMsg.data?.paymentId === 'string' ? productUpdateMsg.data.paymentId : '';
      if (paymentId.startsWith('thepay-')) {
        console.info('⏭️ Skipping ThePay payment in KioskApp (handled by ThePayPayment component)');
        return;
      }

      console.info('🎉 Payment completed!', message);
      startTransition(() => {
        goToConfirmation({
          paymentId: paymentId || 'unknown',
          amount: (productUpdateMsg.data?.amount as number) || 0,
          totalAmount: (productUpdateMsg.data?.amount as number) || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cartItems || [],
          status: TransactionStatus.COMPLETED
        });
      });
      clearQR();
      setPaymentStep(1);
      setSelectedPaymentMethod(undefined);
      return;
    }

    if (message.type === 'product_update' && message.updateType === 'payment_check_started') {
      const productUpdateMsg = message as ProductUpdateMessage;
      const paymentId = typeof productUpdateMsg.data?.paymentId === 'string' ? productUpdateMsg.data.paymentId : '';
      if (
        !paymentId.startsWith('thepay-') &&
        paymentData &&
        'paymentId' in paymentData &&
        paymentData.paymentId === paymentId
      ) {
        console.info('⏱️ Payment check started, resetting timer:', message);
        window.dispatchEvent(new CustomEvent('payment-check-started', {
          detail: { paymentId, checkTime: (productUpdateMsg.data?.checkTime as number) || Date.now() }
        }));
      }
      return;
    }

    if (message.type === 'product_update' && message.updateType === 'payment_timeout') {
      const productUpdateMsg = message as ProductUpdateMessage;
      console.warn('⏰ Payment monitoring timed out:', message);
      startTransition(() => {
        goToConfirmation({
          paymentId: typeof productUpdateMsg.data?.paymentId === 'string' ? productUpdateMsg.data.paymentId : 'unknown',
          amount: (productUpdateMsg.data?.amount as number) || 0,
          totalAmount: (productUpdateMsg.data?.amount as number) || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cartItems || [],
          status: TransactionStatus.TIMEOUT
        });
      });
      clearQR();
      setPaymentStep(1);
      setSelectedPaymentMethod(undefined);
      return;
    }

    if (message.type === 'product_update' && message.updateType === 'payment_failed') {
      const productUpdateMsg = message as ProductUpdateMessage;
      console.error('❌ Payment failed:', message);
      startTransition(() => {
        goToConfirmation({
          paymentId: typeof productUpdateMsg.data?.paymentId === 'string' ? productUpdateMsg.data.paymentId : 'unknown',
          amount: (productUpdateMsg.data?.amount as number) || 0,
          totalAmount: (productUpdateMsg.data?.amount as number) || 0,
          customerEmail: email,
          qrCode: qrCodeUrl,
          items: cartItems || [],
          status: TransactionStatus.FAILED
        });
      });
      clearQR();
      setPaymentStep(1);
      setSelectedPaymentMethod(undefined);
      return;
    }

    if (message.type === 'product_update' && message.updateType === 'inventory_updated') {
      const productUpdateMsg = message as ProductUpdateMessage;
      console.info('📦 KioskApp: Dispatching inventory_updated event', {
        productId: productUpdateMsg.data?.productId,
        kioskId: productUpdateMsg.data?.kioskId,
        active: productUpdateMsg.data?.active,
        visible: productUpdateMsg.data?.visible
      });
    }

    window.dispatchEvent(new CustomEvent('websocket-message', {
      detail: { data: JSON.stringify(message) }
    }));
  };
}
